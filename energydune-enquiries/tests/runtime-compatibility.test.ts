import assert from 'node:assert/strict';
import { after, beforeEach, mock, test } from 'node:test';
import { handleRequest, type Env, type ProviderFetch } from '../src/index.ts';

const payload = {
  requestId: '8b3c1f56-a9d4-42bd-9a28-72eb799e6c3d', language: 'en',
  name: 'Runtime Test Buyer', company: 'Example Company', email: 'buyer@example.com',
  interest: 'industrial', message: 'Confirm grade and packaging.', website: '',
};
const env: Env = {
  MAIL_FROM: 'DUNE ENERGY GLOBAL <website@notify.energydune.com>',
  RESEND_API_KEY: 'SYNTHETIC_RUNTIME_TEST_KEY',
  ENQUIRY_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
function request() {
  return new Request('https://enquiries.example.test/enquiries', {
    method: 'POST', headers: { Origin: 'https://energydune.com', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
const blocked = async () => { throw new Error('Actual network is forbidden in runtime compatibility tests.'); };
const nativeFetch = mock.method(globalThis, 'fetch', blocked);
const warnings = mock.method(console, 'warn', () => {});
beforeEach(() => {
  nativeFetch.mock.mockImplementation(blocked);
  nativeFetch.mock.resetCalls();
  warnings.mock.resetCalls();
});
after(() => { nativeFetch.mock.restore(); warnings.mock.restore(); });

test('provider options use the workerd-supported manual redirect mode', async () => {
  let calls = 0;
  const fetch: ProviderFetch = async (input, init) => {
    calls++;
    assert.equal(String(input), 'https://api.resend.com/emails');
    assert.equal(init?.redirect, 'manual', 'redirect:error throws in workerd before any HTTP request');
    assert.equal(init?.method, 'POST');
    return Response.json({ id: 'synthetic-provider-id' });
  };
  const response = await handleRequest(request(), env, { fetch });
  assert.equal(response.status, 202);
  assert.equal(calls, 1);
  assert.equal(nativeFetch.mock.callCount(), 0);
});

test('every redirect is a generic failure and cannot forward credentials or enquiry content', async () => {
  for (const status of [301, 302, 303, 307, 308]) {
    const calls: { url: string; redirect: RequestRedirect | undefined }[] = [];
    const fetch: ProviderFetch = async (input, init) => {
      calls.push({ url: String(input), redirect: init?.redirect });
      return new Response('Synthetic redirect body with private detail', {
        status, headers: { Location: 'https://untrusted-redirect.example/collect' },
      });
    };
    const response = await handleRequest(request(), env, { fetch });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { status: 'error', code: 'provider_unavailable' });
    assert.deepEqual(calls, [{ url: 'https://api.resend.com/emails', redirect: 'manual' }]);
  }
  assert.equal(nativeFetch.mock.callCount(), 0, 'No native or redirected network request may occur');
});

test('the non-injected fetch path uses workerd-compatible options and keeps the send contract', async () => {
  nativeFetch.mock.mockImplementation(async function (input: string | URL | Request, init?: RequestInit) {
    // Emulate the documented native workerd restriction without assuming a
    // JavaScript receiver contract that the platform does not require.
    if (init?.redirect === 'error') throw new TypeError('Unsupported redirect mode');
    assert.equal(String(input), 'https://api.resend.com/emails');
    assert.equal(init?.redirect, 'manual');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('Idempotency-Key'), `dune-enquiry/${payload.requestId}`);
    assert.equal(headers.get('Authorization'), `Bearer ${env.RESEND_API_KEY}`);
    const email = JSON.parse(String(init?.body));
    assert.equal(email.from, env.MAIL_FROM);
    assert.deepEqual(email.to, ['info@energydune.com']);
    assert.equal(email.reply_to, payload.email);
    return Response.json({ id: 'synthetic-native-provider-id' });
  });
  const response = await handleRequest(request(), env);
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { status: 'accepted', requestId: payload.requestId });
  assert.equal(nativeFetch.mock.callCount(), 1);
  assert.equal(warnings.mock.callCount(), 0);
});
