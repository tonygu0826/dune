import assert from 'node:assert/strict';
import { after, mock, test } from 'node:test';
import { handleRequest } from '../src/index.ts';

type Env = Parameters<typeof handleRequest>[1];
type Dependencies = NonNullable<Parameters<typeof handleRequest>[2]>;
type Fetch = NonNullable<Dependencies['fetch']>;
type Json = Record<string, any>;
type ProviderCall = { url: string; method: string; headers: Headers; body: Json; rawBody: string };

const ORIGIN = 'https://energydune.com';
const URL = 'https://enquiries.example.test/enquiries';
const REQUEST_ID = '15a9d88e-501a-4a1b-b215-d7f9b52a8acb';
const API_KEY = 'synthetic-resend-key-never-a-real-secret';
const MAIL_FROM = 'DUNE ENERGY GLOBAL <website@notify.energydune.com>';
const buyer = {
  requestId: REQUEST_ID,
  language: 'en',
  name: 'Example Buyer',
  company: 'Example Company',
  email: 'buyer@example.com',
  message: 'Please confirm the suitable grade and packaging.',
  interest: 'passenger',
  website: '',
};

// Every invocation injects a provider mock. This guard catches accidental use of
// global fetch without allowing a test to contact Resend or another endpoint.
const forbiddenNetwork = mock.method(globalThis, 'fetch', async () => {
  throw new Error('Actual network requests are forbidden in Worker tests.');
});
after(() => {
  const calls = forbiddenNetwork.mock.callCount();
  forbiddenNetwork.mock.restore();
  assert.equal(calls, 0, 'The Worker must use the injected provider fetch.');
});

function configured(overrides: Partial<Env> = {}): Env {
  return {
    RESEND_API_KEY: API_KEY,
    MAIL_FROM,
    ENQUIRY_RATE_LIMITER: { limit: async () => ({ success: true }) },
    ...overrides,
  };
}

function provider(status = 200, responseBody: unknown = { id: 'synthetic-provider-message-id' }) {
  const calls: ProviderCall[] = [];
  const fetch: Fetch = async (input, init) => {
    const request = new Request(input, init);
    const rawBody = await request.text();
    calls.push({
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: JSON.parse(rawBody),
      rawBody,
    });
    return new Response(JSON.stringify(responseBody), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { calls, fetch };
}

function request(payload: unknown = buyer, headers: Record<string, string> = {}) {
  return new Request(URL, {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
}

async function invoke(payload: unknown = buyer, env: Env = configured()) {
  const upstream = provider();
  const response = await handleRequest(request(payload), env, { fetch: upstream.fetch });
  return { response, payload: await response.json() as Json, calls: upstream.calls };
}

async function invalid(payload: unknown, field?: string) {
  const result = await invoke(payload);
  assert.equal(result.response.status, 400);
  assert.equal(result.payload.status, 'error');
  assert.equal(result.payload.code, 'validation_error');
  assert.ok(Array.isArray(result.payload.fieldErrors));
  assert.ok(result.payload.fieldErrors.length > 0);
  for (const issue of result.payload.fieldErrors) {
    assert.equal(typeof issue.field, 'string');
    assert.equal(typeof issue.code, 'string');
    assert.equal(typeof issue.message, 'string');
    assert.ok(issue.message.length > 0);
  }
  if (field) {
    assert.ok(result.payload.fieldErrors.some((issue: Json) => issue.field === field),
      `Expected a field error for ${field}: ${JSON.stringify(result.payload.fieldErrors)}`);
  }
  assert.equal(result.calls.length, 0, 'Invalid input must not reach the email provider.');
  return result;
}

test('a valid enquiry sends one plain English email with fixed recipient, visitor reply-to and stable idempotency', async () => {
  const full = {
    ...buyer,
    preferredBrand: 'SINOPEC',
    productReference: 'Example reference',
    viscosity: 'SAE 5W-30',
    specification: 'API example requirement',
    quantity: '4 drums',
    destination: 'Example port',
    documents: ['TDS / PDS', 'SDS'],
    message: 'Confirm A & B <example> packaging.\nSecond line: Énergie 🌍',
  };
  const result = await invoke(full);
  assert.equal(result.response.status, 202);
  assert.deepEqual(result.payload, { status: 'accepted', requestId: REQUEST_ID });
  assert.equal(result.calls.length, 1);
  const sent = result.calls[0];
  assert.ok(sent);
  assert.equal(sent.url, 'https://api.resend.com/emails');
  assert.equal(sent.method, 'POST');
  assert.equal(sent.headers.get('Authorization'), `Bearer ${API_KEY}`);
  assert.match(sent.headers.get('Content-Type') ?? '', /^application\/json\b/);
  assert.equal(sent.headers.get('Idempotency-Key'), `dune-enquiry/${REQUEST_ID}`);
  assert.equal(sent.body.from, MAIL_FROM);
  assert.deepEqual(sent.body.to, ['info@energydune.com']);
  assert.equal(sent.body.reply_to, buyer.email);
  assert.equal(typeof sent.body.subject, 'string');
  assert.ok(sent.body.subject.length > 0);
  assert.equal(typeof sent.body.text, 'string');
  assert.match(sent.body.text, /Name:/i);
  assert.match(sent.body.text, /Company:/i);
  assert.match(sent.body.text, /Email:/i);
  for (const value of [full.name, full.company, full.email, full.message,
    full.preferredBrand, full.productReference, full.viscosity, full.specification,
    full.quantity, full.destination, 'TDS / PDS', 'SDS']) {
    assert.ok(sent.body.text.includes(value), `The email must preserve ${JSON.stringify(value)}.`);
  }
  assert.equal('html' in sent.body, false);
  assert.equal('cc' in sent.body, false);
  assert.equal('bcc' in sent.body, false);
});

test('French submissions and every website interest value are accepted while the email stays English', async () => {
  for (const interest of ['passenger', 'commercial', 'industrial', 'driveline', 'grease', 'energy']) {
    const result = await invoke({ ...buyer, language: 'fr', interest });
    assert.equal(result.response.status, 202, interest);
    assert.equal(result.calls.length, 1);
    const sent = result.calls[0];
    assert.ok(sent);
    assert.match(sent.body.text, /Name:/i);
    assert.match(sent.body.text, /Company:/i);
  }
});

test('retries preserve identical provider bytes and idempotency keys while a new request uses a different key', async () => {
  const upstream = provider();
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await handleRequest(request(), configured(), { fetch: upstream.fetch });
    assert.equal(response.status, 202);
  }
  assert.deepEqual(upstream.calls.map(call => call.headers.get('Idempotency-Key')),
    [`dune-enquiry/${REQUEST_ID}`, `dune-enquiry/${REQUEST_ID}`]);
  const [first, retry] = upstream.calls;
  assert.ok(first && retry);
  assert.equal(first.rawBody, retry.rawBody, 'The same payload and requestId must produce identical serialized email bytes.');
  const newId = '15a9d88e-501a-4a1b-b215-d7f9b52a8acc';
  const fresh = await handleRequest(request({ ...buyer, requestId: newId }), configured(), { fetch: upstream.fetch });
  assert.equal(fresh.status, 202);
  const newCall = upstream.calls[2];
  assert.ok(newCall);
  assert.equal(newCall.headers.get('Idempotency-Key'), `dune-enquiry/${newId}`);
  assert.notEqual(newCall.headers.get('Idempotency-Key'), first.headers.get('Idempotency-Key'));
});

test('the browser preflight allows only the configured website origins and JSON POST', async () => {
  const upstream = provider();
  for (const origin of [ORIGIN, 'https://www.energydune.com']) {
    const response = await handleRequest(new Request(URL, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    }), configured(), { fetch: upstream.fetch });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
    assert.match(response.headers.get('Access-Control-Allow-Methods') ?? '', /\bPOST\b/);
    assert.match(response.headers.get('Access-Control-Allow-Headers') ?? '', /content-type/i);
    assert.notEqual(response.headers.get('Access-Control-Allow-Credentials'), 'true');
    assert.equal(await response.text(), '');
  }
  assert.equal(upstream.calls.length, 0);
});

test('successful and validation-error responses both remain readable by the allowed browser origin', async () => {
  for (const payload of [buyer, { ...buyer, email: 'invalid-email' }]) {
    const result = await invoke(payload);
    assert.equal(result.response.headers.get('Access-Control-Allow-Origin'), ORIGIN);
    assert.match(result.response.headers.get('Vary') ?? '', /\borigin\b/i);
    assert.match(result.response.headers.get('Cache-Control') ?? '', /no-store/);
  }
});

test('lookalike, insecure and arbitrary origins cannot send an enquiry', async () => {
  const upstream = provider();
  for (const origin of ['https://attacker.example', 'https://energydune.com.attacker.example',
    'https://evilenergydune.com', 'http://energydune.com', 'null']) {
    const response = await handleRequest(request(buyer, { Origin: origin }), configured(), { fetch: upstream.fetch });
    assert.equal(response.status, 403, origin);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.equal(upstream.calls.length, 0);
});

test('POST and OPTIONS without Origin are rejected before contacting the provider', async () => {
  const upstream = provider();
  for (const method of ['POST', 'OPTIONS']) {
    const response = await handleRequest(new Request(URL, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: JSON.stringify(buyer) } : {}),
    }), configured(), { fetch: upstream.fetch });
    assert.equal(response.status, 403, method);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  assert.equal(upstream.calls.length, 0);
});

test('an explicitly configured extra origin is allowed without broadening matching to its subdomains', async () => {
  const upstream = provider();
  const env = configured({ ENQUIRY_ALLOWED_ORIGINS: 'https://approved.example' });
  const accepted = await handleRequest(request(buyer, { Origin: 'https://approved.example' }), env, { fetch: upstream.fetch });
  assert.equal(accepted.status, 202);
  assert.equal(accepted.headers.get('Access-Control-Allow-Origin'), 'https://approved.example');
  const rejected = await handleRequest(request(buyer, { Origin: 'https://sub.approved.example' }), env, { fetch: upstream.fetch });
  assert.equal(rejected.status, 403);
  assert.equal(upstream.calls.length, 1);
});

test('GET and HEAD health checks require complete configuration and never send email', async () => {
  const upstream = provider();
  for (const method of ['GET', 'HEAD']) {
    const healthy = await handleRequest(new Request('https://enquiries.example.test/health', { method }), configured(), { fetch: upstream.fetch });
    assert.equal(healthy.status, 200);
    if (method === 'HEAD') assert.equal(await healthy.text(), '');
    for (const key of ['RESEND_API_KEY', 'MAIL_FROM', 'ENQUIRY_RATE_LIMITER'] as const) {
      const unhealthy = await handleRequest(new Request('https://enquiries.example.test/health', { method }),
        configured({ [key]: undefined }), { fetch: upstream.fetch });
      assert.equal(unhealthy.status, 503, `${method}: missing ${key}`);
      if (method === 'HEAD') assert.equal(await unhealthy.text(), '');
    }
  }
  assert.equal(upstream.calls.length, 0);
});

test('unsupported routes and methods never invoke the provider', async () => {
  const upstream = provider();
  const get = await handleRequest(new Request(URL, { headers: { Origin: ORIGIN } }), configured(), { fetch: upstream.fetch });
  assert.equal(get.status, 405);
  const missing = await handleRequest(new Request('https://enquiries.example.test/unknown', { headers: { Origin: ORIGIN } }), configured(), { fetch: upstream.fetch });
  assert.equal(missing.status, 404);
  assert.equal(upstream.calls.length, 0);
});

test('missing provider credentials, sender or native rate limiter fails closed before any provider call', async () => {
  for (const key of ['RESEND_API_KEY', 'MAIL_FROM', 'ENQUIRY_RATE_LIMITER'] as const) {
    const result = await invoke(buyer, configured({ [key]: undefined }));
    assert.equal(result.response.status, 503, key);
    assert.equal(result.payload.status, 'error');
    assert.equal(result.calls.length, 0);
  }
});

test('a failing native rate-limit binding fails closed instead of sending email', async () => {
  const result = await invoke(buyer, configured({
    ENQUIRY_RATE_LIMITER: { limit: async () => { throw new Error('Synthetic binding outage'); } },
  }));
  assert.equal(result.response.status, 503);
  assert.equal(result.calls.length, 0);
  assert.equal(JSON.stringify(result.payload).includes('Synthetic binding outage'), false);
});

test('the Worker observes native rate-limit denials on the sixth request without contacting the provider', async () => {
  let attempts = 0;
  const keys: string[] = [];
  const env = configured({ ENQUIRY_RATE_LIMITER: { limit: async ({ key }) => {
    keys.push(key);
    return { success: ++attempts <= 5 };
  } } });
  const upstream = provider();
  for (let number = 1; number <= 6; number++) {
    const payload = { ...buyer, requestId: `15a9d88e-501a-4a1b-b215-d7f9b52a8ac${number}` };
    const response = await handleRequest(request(payload, { 'CF-Connecting-IP': '192.0.2.50' }), env, { fetch: upstream.fetch });
    assert.equal(response.status, number <= 5 ? 202 : 429);
  }
  assert.equal(upstream.calls.length, 5);
  assert.equal(attempts, 6);
  assert.ok(keys.every(key => typeof key === 'string' && key.length > 0));
  assert.equal(new Set(keys).size, 1, 'One client must not evade the limiter by changing requestId.');
});

test('each required field has a machine-readable missing-field error', async () => {
  for (const field of ['requestId', 'language', 'name', 'company', 'email', 'message', 'interest']) {
    const payload: Json = { ...buyer };
    delete payload[field];
    await invalid(payload, field);
  }
});

test('unknown fields, wrong field types, invalid enum values and invalid UUIDs are rejected', async () => {
  await invalid({ ...buyer, unexpected: true });
  for (const [field, value] of [
    ['name', 42], ['company', {}], ['email', false], ['message', ['text']],
    ['interest', 'pcmo'], ['language', 'zh'], ['requestId', 'not-a-uuid'],
    ['preferredBrand', 42], ['documents', 'SDS'], ['documents', ['Unknown document']],
  ] as const) {
    await invalid({ ...buyer, [field]: value }, field);
  }
});

test('empty required values, malformed email addresses and a filled honeypot never reach Resend', async () => {
  for (const field of ['name', 'company', 'email', 'message']) {
    await invalid({ ...buyer, [field]: '   ' }, field);
  }
  await invalid({ ...buyer, email: 'not-an-email' }, 'email');
  await invalid({ ...buyer, website: 'https://bot.example' }, 'website');
});

test('short fields reject prefix/suffix controls and all text rejects malformed Unicode', async () => {
  for (const [field, value] of [
    ['name', '\tExample Buyer'], ['company', 'Example Company\r'], ['email', 'buyer@example.com\n'],
    ['productReference', 'Reference\u0000'], ['destination', 'Port\u0085'],
    ['name', 'Buyer\uD800'], ['message', 'Text\uDC00'],
  ] as const) {
    await invalid({ ...buyer, [field]: value }, field);
  }
});

test('field and document caps reject oversized values before creating an email', async () => {
  for (const field of ['name', 'company', 'preferredBrand', 'productReference', 'viscosity', 'specification', 'quantity', 'destination']) {
    await invalid({ ...buyer, [field]: 'x'.repeat(1000) }, field);
  }
  await invalid({ ...buyer, message: 'x'.repeat(10000) }, 'message');
  await invalid({ ...buyer, documents: ['SDS', 'SDS', 'SDS'] }, 'documents');
});

test('malformed JSON and non-object JSON bodies are rejected without contacting the provider', async () => {
  const upstream = provider();
  const malformed = await handleRequest(new Request(URL, {
    method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: '{broken-json',
  }), configured(), { fetch: upstream.fetch });
  assert.equal(malformed.status, 400);
  for (const payload of [null, [], 'not an object']) await invalid(payload);
  assert.equal(upstream.calls.length, 0);
});

test('an oversized declared Content-Length is rejected before email delivery', async () => {
  const upstream = provider();
  const response = await handleRequest(request(buyer, { 'Content-Length': String(64 * 1024 + 1) }),
    configured(), { fetch: upstream.fetch });
  assert.equal(response.status, 413);
  assert.equal(upstream.calls.length, 0);
});

test('actual body bytes enforce the 64 KiB limit even with no declared length', async () => {
  const result = await invoke({ ...buyer, message: 'x'.repeat(64 * 1024) });
  assert.equal(result.response.status, 413);
  assert.equal(result.calls.length, 0);
});

test('an understated streaming body is stopped and cancelled when actual bytes exceed 64 KiB', async () => {
  let pulls = 0;
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls++;
      controller.enqueue(new Uint8Array(4096).fill(120));
      if (pulls === 100) controller.close();
    },
    cancel() { cancelled = true; },
  });
  const init: RequestInit & { duplex: 'half' } = {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'Content-Length': '1' },
    body: stream,
    duplex: 'half',
  };
  const upstream = provider();
  const response = await handleRequest(new Request(URL, init), configured(), { fetch: upstream.fetch });
  assert.equal(response.status, 413);
  assert.ok(pulls < 100, 'The Worker must not buffer the entire oversized stream.');
  assert.equal(cancelled, true, 'Reading must stop after the byte limit is exceeded.');
  assert.equal(upstream.calls.length, 0);
});

test('provider failures return a generic 502 without exposing upstream details or credentials', async () => {
  for (const status of [400, 429, 500]) {
    const upstream = provider(status, { message: 'upstream-only-sensitive-detail', key: API_KEY });
    const response = await handleRequest(request(), configured(), { fetch: upstream.fetch });
    assert.equal(response.status, 502, `Provider HTTP ${status}`);
    const body = await response.text();
    assert.equal(JSON.parse(body).status, 'error');
    assert.equal(body.includes('upstream-only-sensitive-detail'), false);
    assert.equal(body.includes(API_KEY), false);
  }
});

test('provider idempotency conflicts are exposed as request_conflict, not a false acceptance', async () => {
  const upstream = provider(409, { message: 'Synthetic idempotency conflict' });
  const response = await handleRequest(request(), configured(), { fetch: upstream.fetch });
  assert.equal(response.status, 409);
  const body = await response.json() as Json;
  assert.equal(body.status, 'error');
  assert.equal(body.code, 'request_conflict');
});

test('a provider 2xx is accepted only after parsing JSON with a nonempty string message id', async () => {
  for (const body of [{}, { id: '' }, { id: '  ' }, { id: 42 }, null]) {
    const upstream = provider(200, body);
    const response = await handleRequest(request(), configured(), { fetch: upstream.fetch });
    assert.equal(response.status, 502, JSON.stringify(body));
  }
  const malformed: Fetch = async () => new Response('not-json', { status: 200 });
  assert.equal((await handleRequest(request(), configured(), { fetch: malformed })).status, 502);
  const created = provider(201);
  assert.equal((await handleRequest(request(), configured(), { fetch: created.fetch })).status, 202);
});

test('network exceptions return generic 502 responses without leaking exception text', async () => {
  const fetch: Fetch = async () => { throw new Error('synthetic-private-network-detail'); };
  const response = await handleRequest(request(), configured(), { fetch });
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes('synthetic-private-network-detail'), false);
});

test('provider timeout aborts the outgoing request and returns 504', { timeout: 1500 }, async () => {
  let aborted = false;
  const fetch: Fetch = async (_input, init) => new Promise<Response>((_resolve, reject) => {
    const fallback = setTimeout(() => reject(new Error('Expected the Worker to abort the provider request.')), 500);
    const abort = () => {
      aborted = true;
      clearTimeout(fallback);
      reject(new DOMException('Synthetic provider abort', 'AbortError'));
    };
    if (init?.signal?.aborted) abort();
    else init?.signal?.addEventListener('abort', abort, { once: true });
  });
  const response = await handleRequest(request(), configured(), { fetch, timeoutMs: 10 });
  assert.equal(response.status, 504);
  assert.equal(aborted, true);
});
