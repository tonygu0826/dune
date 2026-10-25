import { isEmail, validateEnquiry, type Enquiry } from './validation.ts';

export interface Env {
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  ENQUIRY_RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  ENQUIRY_ALLOWED_ORIGINS?: string;
}
export type ProviderFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export interface Dependencies { fetch?: ProviderFetch; timeoutMs?: number }

const VERSION = '0.1.0';
const RECIPIENT = 'info@energydune.com';
const PROVIDER_URL = 'https://api.resend.com/emails';
const BODY_LIMIT = 64 * 1024;
const ALLOWED_ORIGINS = ['https://energydune.com', 'https://www.energydune.com'];
const CATEGORY_NAMES: Record<Enquiry['interest'], string> = {
  passenger: 'Passenger car engine oils', commercial: 'Heavy-duty diesel engine oils',
  industrial: 'Industrial lubricants', driveline: 'Transmission & gear oils',
  grease: 'Lubricating greases', energy: 'Energy products',
};

function allowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin');
  const configured = env.ENQUIRY_ALLOWED_ORIGINS?.split(',').map(value => value.trim()).filter(Boolean) ?? [];
  return !origin || [...ALLOWED_ORIGINS, ...configured].includes(origin);
}

function responseHeaders(request: Request, allowCors = true): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Vary': 'Origin',
  });
  if (allowCors && request.headers.has('Origin')) headers.set('Access-Control-Allow-Origin', request.headers.get('Origin')!);
  if (allowCors) {
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Expose-Headers', 'Retry-After');
    headers.set('Access-Control-Max-Age', '600');
  }
  return headers;
}

function json(request: Request, status: number, data: unknown, additional?: Record<string, string>, cors = true): Response {
  const headers = responseHeaders(request, cors);
  for (const [name, value] of Object.entries(additional ?? {})) headers.set(name, value);
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(data), { status, headers });
}

function failure(request: Request, status: number, code: string, additional?: Record<string, string>): Response {
  return json(request, status, { status: 'error', code }, additional);
}

function senderConfigured(sender?: string): boolean {
  if (!sender || sender.length > 254 || /[\r\n\u0000-\u001f\u007f-\u009f]/u.test(sender)) return false;
  const match = /^[^<>]+ <([^<>]+)>$/.exec(sender);
  return Boolean(match?.[1] && isEmail(match[1]));
}

function configuration(env: Env) {
  return { mailProvider: Boolean(env.RESEND_API_KEY?.trim()), sender: senderConfigured(env.MAIL_FROM), rateLimiter: Boolean(env.ENQUIRY_RATE_LIMITER) };
}

class RequestProblem extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') throw new RequestProblem(415, 'unsupported_media_type');
  const declared = request.headers.get('Content-Length');
  if (declared && /^\d+$/.test(declared) && Number(declared) > BODY_LIMIT) throw new RequestProblem(413, 'request_too_large');
  if (!request.body) throw new RequestProblem(400, 'invalid_json');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > BODY_LIMIT) {
        try { await reader.cancel(); } catch { /* Keep the bounded-body error. */ }
        throw new RequestProblem(413, 'request_too_large');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)); }
  catch { throw new RequestProblem(400, 'invalid_json'); }
}

function emailBody(enquiry: Enquiry): string {
  const fields: [string, string][] = [
    ['Request ID', enquiry.requestId], ['Website language', enquiry.language],
    ['Name', enquiry.name], ['Company', enquiry.company], ['Email', enquiry.email],
    ['Product category', CATEGORY_NAMES[enquiry.interest]], ['Brand', enquiry.preferredBrand],
    ['Product / reference', enquiry.productReference], ['Viscosity / consistency grade', enquiry.viscosity],
    ['Specification / OEM requirement', enquiry.specification], ['Quantity / packaging', enquiry.quantity],
    ['Destination', enquiry.destination], ['Documents requested', enquiry.documents.join(', ')],
  ];
  return ['DUNE ENERGY GLOBAL', 'Website product enquiry', '', ...fields.map(([label, value]) => `${label}: ${value || 'Not specified'}`), '', 'Your requirements:', enquiry.message, '', 'Availability and specifications confirmed by quotation.', 'Brand names identify requested products, not authorised distribution.'].join('\n');
}

class ProviderTimeout extends Error {}

type ProviderFailureReason = 'invalid_key' | 'sender_domain' | 'recipient_restriction' | 'quota' | 'idempotency' | 'http_error' | 'network_error' | 'invalid_response' | 'provider_timeout';
type ProviderResponseFormat = 'json' | 'nonjson' | 'none';
type ProviderFailure = { status: number; reason: ProviderFailureReason; responseFormat: ProviderResponseFormat };
type ProviderResult = { outcome: 'accepted' } | { outcome: 'conflict' | 'unavailable'; diagnostic: ProviderFailure };

function classifyProviderFailure(status: number, data: unknown): ProviderFailureReason {
  // Inspect only a bounded message in memory. Never return or log this text:
  // providers may include addresses, request data, or other sensitive details.
  const record = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const text = ['name', 'code', 'message'].map(key => typeof record[key] === 'string' ? record[key].slice(0, 4096).toLowerCase() : '').join(' ');
  if (status === 409) return 'idempotency';
  if (status === 401 || /invalid_api_key|missing_api_key|restricted_api_key|invalid_access/.test(text) || /api.?key.{0,80}(?:invalid|missing|restricted|not valid)|(?:invalid|missing).{0,40}api.?key/.test(text)) return 'invalid_key';
  if (/only send.{0,100}(?:testing|your own)|testing emails|recipient.{0,80}(?:restrict|not allowed)|test.mode/.test(text)) return 'recipient_restriction';
  if (status === 429 || /quota|rate.limit|too many requests|daily.limit|monthly.limit/.test(text)) return 'quota';
  if (/domain.{0,100}(?:not verified|unverified|verification)|(?:not verified|unverified).{0,100}domain|sender.{0,80}(?:domain|verif)|from.{0,80}(?:not verified|verified domain)/.test(text)) return 'sender_domain';
  return 'http_error';
}

async function readProviderResponse(provider: Response): Promise<{ responseFormat: 'json' | 'nonjson'; data?: unknown }> {
  if (!provider.body) return { responseFormat: 'nonjson' };
  const reader = provider.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16 * 1024) {
        try { await reader.cancel(); } catch { /* Do not expose stream errors. */ }
        return { responseFormat: 'nonjson' };
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return { responseFormat: 'json', data: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) }; }
  catch { return { responseFormat: 'nonjson' }; }
}

function logProviderFailure(diagnostic: ProviderFailure): void {
  // Fixed metadata only. No request ID, enquiry, provider body, headers, API key,
  // exception message, or stack is passed to the logging service.
  console.warn('enquiry_provider_failure', diagnostic);
}

async function send(enquiry: Enquiry, env: Env, dependencies: Dependencies): Promise<'accepted' | 'conflict' | 'unavailable' | 'timeout'> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let observedStatus = 0;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new ProviderTimeout()); }, dependencies.timeoutMs ?? 10_000);
  });
  async function requestProvider(): Promise<ProviderResult> {
    const options: RequestInit = {
      // workerd supports manual/follow, but redirect:error throws before sending.
      // A 3xx response is rejected below rather than forwarding credentials.
      method: 'POST', signal: controller.signal, redirect: 'manual',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `dune-enquiry/${enquiry.requestId}` },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [RECIPIENT], reply_to: enquiry.email, subject: 'Website enquiry | DUNE ENERGY GLOBAL', text: emailBody(enquiry) }),
    };
    const provider = dependencies.fetch
      ? await dependencies.fetch(PROVIDER_URL, options)
      : await fetch(PROVIDER_URL, options);
    observedStatus = provider.status;
    const parsed = await readProviderResponse(provider);
    if (!provider.ok) {
      return {
        outcome: provider.status === 409 ? 'conflict' : 'unavailable',
        diagnostic: { status: provider.status, reason: classifyProviderFailure(provider.status, parsed.data), responseFormat: parsed.responseFormat },
      };
    }
    const data = parsed.data as { id?: unknown } | undefined;
    if (typeof data?.id === 'string' && data.id.trim().length > 0 && data.id.length <= 254 && !/[\u0000-\u001f\u007f-\u009f]/u.test(data.id)) return { outcome: 'accepted' };
    return { outcome: 'unavailable', diagnostic: { status: provider.status, reason: 'invalid_response', responseFormat: parsed.responseFormat } };
  }
  try {
    const result = await Promise.race([requestProvider(), deadline]);
    if (result.outcome !== 'accepted') logProviderFailure(result.diagnostic);
    return result.outcome;
  } catch (error) {
    const timeout = error instanceof ProviderTimeout || controller.signal.aborted;
    logProviderFailure({ status: observedStatus, reason: timeout ? 'provider_timeout' : 'network_error', responseFormat: 'none' });
    return timeout ? 'timeout' : 'unavailable';
  }
  finally { if (timer !== undefined) clearTimeout(timer); }
}

export async function handleRequest(request: Request, env: Env, dependencies: Dependencies = {}): Promise<Response> {
  const path = new URL(request.url).pathname;
  const enquiryWrite = (path === '/enquiries' || path === '/enquiries/') && ['POST', 'OPTIONS'].includes(request.method);
  if (!allowedOrigin(request, env) || (enquiryWrite && !request.headers.has('Origin'))) {
    return json(request, 403, { status: 'error', code: 'origin_not_allowed' }, undefined, false);
  }
  if (path === '/health' && ['GET', 'HEAD'].includes(request.method)) {
    const configured = configuration(env);
    const ready = Object.values(configured).every(Boolean);
    return json(request, ready ? 200 : 503, { status: ready ? 'ok' : 'unconfigured', service: 'energydune-enquiries', version: VERSION, configured });
  }
  if (path !== '/enquiries' && path !== '/enquiries/') return failure(request, 404, 'not_found');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders(request) });
  if (request.method !== 'POST') return failure(request, 405, 'method_not_allowed', { Allow: 'POST, OPTIONS' });
  if (!Object.values(configuration(env)).every(Boolean)) return failure(request, 503, 'service_unavailable');

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown-client';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  const key = 'enquiry:' + Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  try {
    if (!(await env.ENQUIRY_RATE_LIMITER!.limit({ key })).success) return failure(request, 429, 'rate_limited', { 'Retry-After': '60' });
  } catch { return failure(request, 503, 'service_unavailable'); }

  let raw: unknown;
  try { raw = await readJson(request); }
  catch (error) {
    return error instanceof RequestProblem ? failure(request, error.status, error.code) : failure(request, 400, 'invalid_request');
  }
  const validation = validateEnquiry(raw);
  if (!validation.value) return json(request, 400, { status: 'error', code: 'validation_error', fieldErrors: validation.fieldErrors });
  const outcome = await send(validation.value, env, dependencies);
  if (outcome === 'conflict') return failure(request, 409, 'request_conflict');
  if (outcome === 'timeout') return failure(request, 504, 'provider_timeout');
  if (outcome !== 'accepted') return failure(request, 502, 'provider_unavailable');
  return json(request, 202, { status: 'accepted', requestId: validation.value.requestId });
}

export default { fetch: (request: Request, env: Env) => handleRequest(request, env) };
