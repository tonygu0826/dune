# Dune website enquiries

Standalone Cloudflare Worker for direct website enquiry emails through Resend. It accepts a validated enquiry, submits one plain-text message to `info@energydune.com`, and returns `202` only after Resend returns a successful response containing an email ID. Accepted does not mean delivered. The existing MCP service is separate.

## Setup

Use Node.js 24, then run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`. Tests mock the provider and do not send email. `npm run dev` serves the local Worker on port 8788; set local secrets in an uncommitted `.dev.vars` file if needed. Do not commit credentials.

Create and verify the dedicated sender domain `notify.energydune.com` in Resend. Add exactly the DNS records currently provided by its verification screen; do not copy old SES examples or change the existing root-domain Google mail records. This project does not modify DNS. Keep `MAIL_FROM` in `wrangler.toml` aligned with the verified sender, currently `DUNE ENERGY GLOBAL <website@notify.energydune.com>`.

Configure `RESEND_API_KEY` as a Cloudflare Worker secret, for example through the Cloudflare dashboard or `wrangler secret put RESEND_API_KEY`. Use a sending-only key scoped to the verified domain where supported. No provider key belongs in the website, Git, documentation or public environment variables. The `ENQUIRY_RATE_LIMITER` native binding is required. Deployment and plan eligibility must be checked in the actual accounts; a free-tier starting configuration does not guarantee zero charges.

The website now submits enquiries directly to `https://energydune-enquiries.tonygu0826.workers.dev/enquiries`. The deployed Worker version is `2e28e9dd-1306-4432-8bd3-fc72026afd01`. A sending-only Resend key scoped to the verified `notify.energydune.com` domain is securely installed. One user-approved synthetic test was accepted by the service, and Resend recorded it as delivered to the recipient's mail server. See [verification.md](verification.md) for scope and evidence.

## HTTP contract

`POST /enquiries`, `Content-Type: application/json`:

```json
{
  "requestId": "31f44a48-99fb-4c42-830d-f075476785a8",
  "language": "en",
  "name": "Example Buyer",
  "company": "Example Company",
  "email": "buyer@example.com",
  "interest": "industrial",
  "message": "Please confirm the suitable grade and quotation.",
  "preferredBrand": "SINOPEC",
  "documents": ["TDS / PDS", "SDS"],
  "website": ""
}
```

Required transport fields are `requestId` (UUID), `language` (`en` or `fr`) and `interest` (`passenger`, `commercial`, `industrial`, `driveline`, `grease`, `energy`). Required visitor fields are `name`, `company`, `email`, and `message`. Optional text fields are `preferredBrand`, `productReference`, `viscosity`, `specification`, `quantity`, `destination`, and the empty `website` honeypot. All strings are capped at 254 UTF-16 code units except `message` at 5000; only `message` permits LF/CRLF line breaks. Invalid Unicode, single-line controls, unsupported keys/types, and unsupported document values are rejected. The JSON body is streamed and bounded to 64 KiB, independently of Content-Length.

Successful response: `202 {"status":"accepted","requestId":"..."}`. This confirms provider acceptance only. Invalid fields return `400 {"status":"error","code":"validation_error","fieldErrors":[{"field":"email","code":"invalid_email","message":"..."}]}`. Other stable codes: `invalid_json` (400), `unsupported_media_type` (415), `request_too_large` (413), `rate_limited` (429, Retry-After: 60), `service_unavailable` (503), `provider_unavailable` (502), `provider_timeout` (504), and `request_conflict` (409).

The sender and recipient are controlled by the service. Visitor email is only `reply_to`. The provider receives `Idempotency-Key: dune-enquiry/<requestId>`. Preserve the same request ID for a user-initiated retry of the unchanged enquiry; use a new UUID after editing the payload. There are no automatic retries. A timeout/network error leaves acceptance uncertain, so never tell the visitor that delivery definitely failed or succeeded. Provider idempotency has its own retention period and is not permanent application deduplication.

Provider requests use Workers-supported `redirect: manual`; every non-2xx response, including redirects, is rejected without forwarding credentials elsewhere. `redirect: error` is unsupported by workerd and throws before making the request. Provider failures emit only a fixed diagnostic reason, numeric status and response-format label; they never log request bodies, addresses, credentials or raw upstream errors.

`POST`/`OPTIONS /enquiries` requires an Origin header matching `https://energydune.com` or `https://www.energydune.com` exactly. Configure extra development origins explicitly in comma-separated `ENQUIRY_ALLOWED_ORIGINS`; localhost is not enabled by default. Non-browser clients can forge Origin, so this check and CORS are not authentication or general bot protection. Empty-honeypot validation and native approximate five-requests/minute/IP-per-Cloudflare-location limiting reduce abuse, but do not provide a strict global quota.

`GET`/`HEAD /health` returns 503 when the sender, key, or native rate-limit binding is absent. A healthy response confirms configuration presence only, not provider-domain verification, key validity or actual delivery. Public health/error responses do not expose keys or provider response bodies.

The application has no enquiry database or intentional body logging; Worker observability is disabled in configuration. Cloudflare and Resend still process visitor data and can retain infrastructure logs, email contents and delivery records under their own policies. The website privacy notice must describe this processing before enabling the endpoint. Do not claim zero processing or zero retention.
