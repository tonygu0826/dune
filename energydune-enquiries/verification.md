# Enquiry email implementation checks

The application code is prepared and the backend Worker is deployed. Production email is not enabled: the Resend key and sender-domain verification are still required, and the prepared website/privacy changes have not been published. No real email has been sent in these checks.

## Backend

TypeScript and the Wrangler dry-run passed. All 27 provider-mocked tests passed, covering fixed recipient/sender rules, visitor reply-to, deterministic idempotency, origin restrictions, validation, a bounded streaming body, native limiter failures, provider errors/conflicts and timeouts. Tests never contact Resend.

Deployed endpoint: `https://energydune-enquiries.tonygu0826.workers.dev/enquiries`.

Worker version: `ba7c8751-2ba0-4832-ba0e-e9d40f5631c9`.

An ordinary Node client using the inherited proxy and CA trust received the expected public `503 application/json` health response: `mailProvider:false`, `sender:true`, `rateLimiter:true`. This confirms that missing credentials fail closed; it is not a real-email delivery test or sender-domain verification.

## Website

All 25 local Chromium checks passed with the sending endpoint intercepted by a mock. The checks cover English/French, desktop/mobile, pending and success states, duplicate prevention, stable request IDs for unchanged retries, changed-payload IDs, field preservation, invalid and mismatched responses, HTTP 400/409/429/network failures, 5000-character Unicode text and a fresh enquiry after success. No unexpected external requests or browser exceptions were observed.

The public website still uses its previously deployed email-draft flow. Activate the prepared frontend and bilingual privacy changes only after Resend's sender and runtime secret are configured and sending has been verified.

Provider acceptance is distinct from inbox delivery. The UI reports submission only after a valid `202 accepted` response with a matching request ID. It does not claim that the email has reached the inbox.
