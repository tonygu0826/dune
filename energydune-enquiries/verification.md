# Enquiry email implementation checks

The website and backend are deployed. The sender domain is verified and a sending-only key is installed. One explicitly approved synthetic enquiry was submitted to `info@energydune.com`; Resend recorded it as delivered to the recipient's mail server. Browser automation used mocked submissions and sent no additional real emails.

## Backend

TypeScript and the Wrangler dry-run passed. All 43 provider-mocked tests passed, covering the fixed envelope, deterministic idempotency, origins, validation/body limits, rate limiting, provider errors/timeouts, redacted diagnostics and Workers redirect compatibility. These automated tests never contact Resend.

Deployed endpoint: `https://energydune-enquiries.tonygu0826.workers.dev/enquiries`.

Verified runtime deployment version: `2e28e9dd-1306-4432-8bd3-fc72026afd01`.

An ordinary Node client using the inherited proxy and CA trust received the expected public `503 application/json` health response: `mailProvider:false`, `sender:true`, `rateLimiter:true`. This confirms that missing credentials fail closed; it is not a real-email delivery test or sender-domain verification.

After secure installation of the runtime key and verification of all four DNS records, public health returned `200` with all three configuration flags true. Health establishes configuration presence; the approved real test separately verified sending.

The initial real test exposed a Workers-specific error: `redirect: error` throws before any upstream request. It was replaced with `manual`, and non-2xx responses remain rejected. The same approved enquiry UUID and unchanged payload were used throughout; failed attempts never reached Resend, and one actual message was accepted after the fix. Provider lookup matched the UUID in that message and reported `last_event: delivered`. No second test message was sent.

## Website

All 25 local Chromium checks passed with the sending endpoint intercepted by a mock. The checks cover English/French, desktop/mobile, pending and success states, duplicate prevention, stable request IDs for unchanged retries, changed-payload IDs, field preservation, invalid and mismatched responses, HTTP 400/409/429/network failures, 5000-character Unicode text and a fresh enquiry after success. No unexpected external requests or browser exceptions were observed.

Website release `bbdb2da5792d7a2127a37534a2e7854d77cf6c49` passed GitHub Pages deployment. The five published HTML/JS/CSS/privacy files match the reviewed local sources. Live Chromium English desktop and French mobile checks verified the send labels and result states using two intercepted mock submissions, with zero extra real POSTs or emails. A real website-origin health GET confirmed normal TLS and CORS.

Provider acceptance is distinct from inbox delivery. The UI reports submission only after a valid `202 accepted` response with a matching request ID. It does not claim that the email has reached the inbox.
