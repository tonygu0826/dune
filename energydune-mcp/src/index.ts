import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer, SERVER_VERSION } from './server.ts';
import documentation from '../docs/index.html';
import privacyNotice from '../docs/privacy.html';
import llms from '../docs/llms.txt';

export interface Env {
  MCP_RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  MCP_ALLOWED_ORIGINS?: string;
  MCP_ALLOWED_HOSTNAMES?: string;
}

const SAFE_HOSTS = ['localhost', '127.0.0.1', 'mcp.energydune.com'];
const DEFAULT_ORIGINS = ['https://muse.ai', 'https://www.muse.ai', 'https://platform.muse.ai', 'https://energydune.com', 'http://localhost:6274', 'http://127.0.0.1:6274'];
const BODY_LIMIT = 64 * 1024;
const split = (value?: string) => value?.split(',').map((part) => part.trim()).filter(Boolean) ?? [];

function allowedOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin');
  return !origin || [new URL(request.url).origin, ...DEFAULT_ORIGINS, ...split(env.MCP_ALLOWED_ORIGINS)].includes(origin);
}

function headers(request: Request, mime: string): Headers {
  const response = new Headers({ 'Content-Type': mime, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Vary': 'Origin' });
  const origin = request.headers.get('Origin');
  if (origin) response.set('Access-Control-Allow-Origin', origin);
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id, Last-Event-ID');
  response.set('Access-Control-Expose-Headers', 'MCP-Protocol-Version, Mcp-Session-Id, Retry-After');
  return response;
}

function failure(request: Request, status: number, message: string, code = -32600, additional: Record<string, string> = {}): Response {
  const responseHeaders = headers(request, 'application/json; charset=utf-8');
  for (const [key, value] of Object.entries(additional)) responseHeaders.set(key, value);
  return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null }), { status, headers: responseHeaders });
}

function page(request: Request, template: string, mime: string): Response {
  const origin = new URL(request.url).origin;
  const text = template.replaceAll('{{SERVICE_ORIGIN}}', origin).replaceAll('{{MCP_ENDPOINT}}', `${origin}/mcp`);
  const responseHeaders = headers(request, mime);
  responseHeaders.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src https://energydune.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  return new Response(request.method === 'HEAD' ? null : text, { headers: responseHeaders });
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (!SAFE_HOSTS.includes(url.hostname) && !url.hostname.endsWith('.workers.dev') && !split(env.MCP_ALLOWED_HOSTNAMES).includes(url.hostname)) {
    return new Response('Invalid host.', { status: 403 });
  }
  if (!allowedOrigin(request, env)) return new Response('Origin is not permitted.', { status: 403 });

  if ((request.method === 'GET' || request.method === 'HEAD') && ['/', '/docs', '/docs/'].includes(url.pathname)) return page(request, documentation, 'text/html; charset=utf-8');
  if ((request.method === 'GET' || request.method === 'HEAD') && ['/privacy', '/privacy/'].includes(url.pathname)) return page(request, privacyNotice, 'text/html; charset=utf-8');
  if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/llms.txt') return page(request, llms, 'text/plain; charset=utf-8');
  if ((request.method === 'GET' || request.method === 'HEAD') && url.pathname === '/health') {
    return new Response(request.method === 'HEAD' ? null : JSON.stringify({ status: env.MCP_RATE_LIMITER ? 'ok' : 'rate_limiter_not_configured', service: 'energydune-mcp', version: SERVER_VERSION, tools: 5, authentication: 'none', endpoint: `${url.origin}/mcp`, rate_limit: { configured: Boolean(env.MCP_RATE_LIMITER), requests: 60, period_seconds: 60, scope: 'approximate, per IP per Cloudflare location' } }), { status: env.MCP_RATE_LIMITER ? 200 : 503, headers: headers(request, 'application/json; charset=utf-8') });
  }
  if (!['/mcp', '/mcp/'].includes(url.pathname)) return failure(request, 404, 'Not found.');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(request, 'application/json; charset=utf-8') });
  if (request.method !== 'POST') return failure(request, 405, 'This stateless MCP endpoint accepts POST and OPTIONS only.', -32000, { Allow: 'POST, OPTIONS' });
  if (!env.MCP_RATE_LIMITER) return failure(request, 503, 'The required rate limiter has not been configured.', -32000);

  // Use only the trusted edge header in production. Unknown/local clients share
  // one bucket. Store neither the address nor enquiry content in the application.
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown-client';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  const key = 'mcp:' + Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  let permitted: boolean;
  try { permitted = (await env.MCP_RATE_LIMITER.limit({ key })).success; }
  catch { return failure(request, 503, 'The rate limiter is temporarily unavailable.', -32000); }
  if (!permitted) return failure(request, 429, 'Request limit reached. Retry later.', -32029, { 'Retry-After': '60' });

  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: BODY_LIMIT });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    const responseHeaders = new Headers(response.headers);
    headers(request, responseHeaders.get('Content-Type') ?? 'application/json').forEach((value, name) => responseHeaders.set(name, value));
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return failure(request, 500, 'Unable to process the MCP request.', -32603);
  } finally {
    await server.close();
  }
}

export default { fetch: handleRequest };
