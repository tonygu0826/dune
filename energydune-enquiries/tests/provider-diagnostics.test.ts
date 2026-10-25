import assert from 'node:assert/strict';
import { after, beforeEach, mock, test } from 'node:test';
import { inspect } from 'node:util';
import { handleRequest, type Dependencies, type Env } from '../src/index.ts';

type ProviderFetch = NonNullable<Dependencies['fetch']>;
type Reason = 'invalid_key' | 'sender_domain' | 'recipient_restriction' | 'quota'
  | 'idempotency' | 'http_error' | 'network_error' | 'provider_timeout' | 'invalid_response';
type Diagnostic = { status: number; reason: Reason; responseFormat: 'json' | 'nonjson' | 'none' };
type ConsoleCall = { method: string; args: unknown[] };

const PRIVATE_MARKER = 'SYNTHETIC_PRIVATE_DIAGNOSTIC_MARKER_8ab19';
const PRIVATE_KEY = 're_SYNTHETIC_PRIVATE_API_KEY_8ab19';
const PRIVATE_EMAIL = 'private-synthetic-buyer@example.com';
const PRIVATE_NAME = 'Private Synthetic Buyer 8ab19';
const PRIVATE_MESSAGE = 'Private synthetic purchase details 8ab19';
const requestPayload = {
  requestId: '15a9d88e-501a-4a1b-b215-d7f9b52a8acb',
  language: 'en', name: PRIVATE_NAME, company: 'Synthetic Company',
  email: PRIVATE_EMAIL, message: PRIVATE_MESSAGE, interest: 'passenger', website: '',
};
const env: Env = {
  RESEND_API_KEY: PRIVATE_KEY,
  MAIL_FROM: 'DUNE ENERGY GLOBAL <website@notify.energydune.com>',
  ENQUIRY_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
const calls: ConsoleCall[] = [];
const consoleMocks = (['warn', 'error', 'info', 'log', 'debug'] as const).map(method =>
  mock.method(console, method, (...args: unknown[]) => { calls.push({ method, args }); }));
const forbiddenNetwork = mock.method(globalThis, 'fetch', async () => {
  throw new Error('Actual network requests are forbidden in diagnostics tests.');
});
beforeEach(() => { calls.length = 0; });
after(() => {
  const networkCalls = forbiddenNetwork.mock.callCount();
  for (const consoleMock of consoleMocks) consoleMock.mock.restore();
  forbiddenNetwork.mock.restore();
  assert.equal(networkCalls, 0, 'Only the injected provider mock may be called.');
});

function request(payload: unknown = requestPayload) {
  return new Request('https://enquiries.example.test/enquiries', {
    method: 'POST',
    headers: { Origin: 'https://energydune.com', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function contaminated(details: Record<string, unknown>) {
  return {
    ...details,
    api_key: PRIVATE_KEY,
    email: PRIVATE_EMAIL,
    requester_name: PRIVATE_NAME,
    enquiry: PRIVATE_MESSAGE,
    opaque_provider_detail: PRIVATE_MARKER,
  };
}

function provider(status: number, body: unknown, json = true): ProviderFetch {
  return async () => new Response(json ? JSON.stringify(body) : String(body), {
    status,
    headers: {
      'Content-Type': json ? 'application/json' : 'text/html',
      'X-Provider-Private-Detail': PRIVATE_MARKER,
      'X-Provider-Private-Key': PRIVATE_KEY,
    },
  });
}

function assertDiagnostic(expected: Diagnostic) {
  const reasons: Reason[] = ['invalid_key', 'sender_domain', 'recipient_restriction', 'quota',
    'idempotency', 'http_error', 'network_error', 'provider_timeout', 'invalid_response'];
  assert.equal(calls.length, 1, 'Exactly one classified diagnostic is allowed for a provider failure.');
  const call = calls[0];
  assert.ok(call);
  assert.equal(call.method, 'warn');
  assert.equal(call.args.length, 2);
  assert.equal(call.args[0], 'enquiry_provider_failure');
  const diagnostic = call.args[1] as Diagnostic;
  assert.ok(diagnostic && typeof diagnostic === 'object');
  assert.deepEqual(Object.keys(diagnostic).sort(), ['reason', 'responseFormat', 'status']);
  assert.ok(reasons.includes(diagnostic.reason));
  assert.ok(['json', 'nonjson', 'none'].includes(diagnostic.responseFormat));
  assert.deepEqual(diagnostic, expected);
  const rendered = inspect(calls, { depth: 10 });
  for (const privateValue of [PRIVATE_MARKER, PRIVATE_KEY, PRIVATE_EMAIL, PRIVATE_NAME, PRIVATE_MESSAGE]) {
    assert.equal(rendered.includes(privateValue), false, 'No console argument may contain private request/provider details.');
  }
}

const httpFailures: {
  label: string; status: number; reason: Reason; body: unknown; json?: boolean;
}[] = [
  {
    label: 'invalid API key', status: 401, reason: 'invalid_key',
    body: contaminated({ name: 'invalid_api_key', code: 'invalid_api_key', message: `API key is invalid. ${PRIVATE_MARKER}` }),
  },
  {
    label: 'unverified sender domain', status: 403, reason: 'sender_domain',
    body: contaminated({ name: 'validation_error', message: `The notify.energydune.com domain is not verified. ${PRIVATE_MARKER}` }),
  },
  {
    label: 'testing recipient restriction even when the message also recommends domain verification',
    status: 403, reason: 'recipient_restriction',
    body: contaminated({
      name: 'validation_error',
      message: `You can only send testing emails to your own email address (${PRIVATE_EMAIL}). To send emails to other recipients, please verify a domain at resend.com/domains and change the from address. ${PRIVATE_MARKER}`,
    }),
  },
  {
    label: 'provider quota', status: 429, reason: 'quota',
    body: contaminated({ name: 'rate_limit_exceeded', message: `Too many requests. ${PRIVATE_MARKER}` }),
  },
  {
    label: 'idempotency conflict', status: 409, reason: 'idempotency',
    body: contaminated({ name: 'invalid_idempotency_key', message: `Idempotency key reused with a different payload. ${PRIVATE_MARKER}` }),
  },
  {
    label: 'unclassified JSON error', status: 500, reason: 'http_error',
    body: contaminated({ name: PRIVATE_MARKER, code: PRIVATE_MARKER, message: PRIVATE_MARKER }),
  },
  {
    label: 'HTML provider error', status: 500, reason: 'http_error', json: false,
    body: `<html><body>${PRIVATE_MARKER} ${PRIVATE_KEY} ${PRIVATE_EMAIL}</body></html>`,
  },
];

for (const failure of httpFailures) {
  test(`provider diagnostics classify ${failure.label} without logging raw errors`, async () => {
    const response = await handleRequest(request(), env, {
      fetch: provider(failure.status, failure.body, failure.json !== false),
    });
    assert.equal(response.status, failure.status === 409 ? 409 : 502);
    assertDiagnostic({ status: failure.status, reason: failure.reason, responseFormat: failure.json === false ? 'nonjson' : 'json' });
    const returned = await response.text();
    assert.equal(returned.includes(PRIVATE_MARKER), false);
    assert.equal(returned.includes(PRIVATE_KEY), false);
  });
}

test('invalid JSON in a provider 200 is classified as invalid_response/nonjson', async () => {
  const response = await handleRequest(request(), env, {
    fetch: async () => new Response(`not JSON ${PRIVATE_MARKER} ${PRIVATE_KEY}`, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Provider-Private-Detail': PRIVATE_MARKER },
    }),
  });
  assert.equal(response.status, 502);
  assertDiagnostic({ status: 200, reason: 'invalid_response', responseFormat: 'nonjson' });
});

test('a provider 200 with a whitespace message id is classified as invalid_response/json', async () => {
  const response = await handleRequest(request(), env, {
    fetch: provider(200, contaminated({ id: '   ', name: PRIVATE_MARKER })),
  });
  assert.equal(response.status, 502);
  assertDiagnostic({ status: 200, reason: 'invalid_response', responseFormat: 'json' });
});

test('a thrown provider exception is classified as network_error without its message, name or stack', async () => {
  const fetch: ProviderFetch = async () => {
    const error = new Error(`${PRIVATE_MARKER} ${PRIVATE_KEY} ${PRIVATE_EMAIL}`);
    error.name = PRIVATE_MARKER;
    throw error;
  };
  const response = await handleRequest(request(), env, { fetch });
  assert.equal(response.status, 502);
  assertDiagnostic({ status: 0, reason: 'network_error', responseFormat: 'none' });
});

test('an aborted provider request produces one provider_timeout diagnostic', { timeout: 1500 }, async () => {
  const fetch: ProviderFetch = async (_input, init) => new Promise<Response>((_resolve, reject) => {
    const fallback = setTimeout(() => reject(new Error(PRIVATE_MARKER)), 500);
    const abort = () => {
      clearTimeout(fallback);
      reject(new DOMException(PRIVATE_MARKER, 'AbortError'));
    };
    if (init?.signal?.aborted) abort();
    else init?.signal?.addEventListener('abort', abort, { once: true });
  });
  const response = await handleRequest(request(), env, { fetch, timeoutMs: 10 });
  assert.equal(response.status, 504);
  assertDiagnostic({ status: 0, reason: 'provider_timeout', responseFormat: 'none' });
});

test('an accepted enquiry emits no provider diagnostic or other console output', async () => {
  const response = await handleRequest(request(), env, {
    fetch: provider(200, contaminated({ id: 'synthetic-accepted-message-id' })),
  });
  assert.equal(response.status, 202);
  assert.deepEqual(calls, []);
});

test('invalid enquiry input emits no provider diagnostic and never calls the provider', async () => {
  let providerCalls = 0;
  const fetch: ProviderFetch = async () => {
    providerCalls++;
    throw new Error('Invalid input must not reach this injected provider mock.');
  };
  const { email: _email, ...missingEmail } = requestPayload;
  const response = await handleRequest(request(missingEmail), env, { fetch });
  assert.equal(response.status, 400);
  assert.equal(providerCalls, 0);
  assert.deepEqual(calls, []);
});
