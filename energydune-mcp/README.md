# DUNE ENERGY GLOBAL MCP

A stateless Streamable HTTP MCP service for DUNE ENERGY GLOBAL INC. It searches six published product categories, explains enquiry requirements and validates a structured email draft. It adds retrieval and draft preparation to the public website; it is not a live product, stock or ordering system.

**Live MCP endpoint:** <https://energydune-mcp.tonygu0826.workers.dev/mcp>

**Documentation:** <https://energydune-mcp.tonygu0826.workers.dev/docs>

**MCP privacy:** <https://energydune-mcp.tonygu0826.workers.dev/privacy>

Deployed on October 23, 2026. Authentication is `none`; the transport is stateless Streamable HTTP. Public HTTPS, official SDK client and MCP Inspector checks passed. See [local verification](tests/verification.md) and [public verification](tests/public-verification.md) for the recorded scope and deployment version.

## Scope

- Six categories: passenger car engine oils, heavy-duty diesel engine oils, industrial lubricants, transmission and gear oils, lubricating greases, and energy products.
- Four read tools and one draft-generation tool. The draft tool is classified as write within this implementation's scope, but only returns a draft in the current response: `draft_only: true`, `sent: false`, `persisted: false`.
- Category-level retrieval, product-context filters, field-level validation, and a structured enquiry summary and email body. No SKU catalogue or product-performance comparison is available.
- Email bodies are always English. Optional `lang: en/fr` localises response metadata, category labels, summaries and messages.
- No prices, live stock, confirmed lead times, orders, payments or email delivery.
- No end-user account, OAuth, application database or application request-body logging. Hosting and client logs are separate; see the privacy notes below.

“Availability and specifications confirmed by quotation.”

“Brand names identify requested products, not authorised distribution.”

The listed enquiry brands are SINOPEC and Great Wall Lubricants. A brand preference does not establish that a specific product or every category is available under that brand.

## Local development

Use a current Node.js release supported by the installed Wrangler version.

```sh
cd energydune-mcp
npm ci
npm run typecheck
npm test
npm run dev
```

The development MCP endpoint is `http://127.0.0.1:8787/mcp`. This local URL is not suitable for a public connector submission. The Worker serves the public documentation at `/docs`, the MCP-specific privacy notice at `/privacy`, and `/llms.txt`.

The live `tools/list` response is the authoritative input schema. [docs/README.md](docs/README.md) describes the five tools and example arguments.

## Deploy to Cloudflare Workers

For the managed cloud environment, use a scoped API token; an interactive browser callback is not the primary setup method.

1. Open [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages), select the target account and copy **Account Details → Account ID**. Set `CLOUDFLARE_ACCOUNT_ID` as a non-secret deployment environment variable. Alternatively, use the Cloudflare account home search (**Ctrl/Cmd+K → Copy account ID**).
2. Open [My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens/), choose **Create Token → Create Custom Token**, and grant **Account → Workers Scripts → Edit**. Under **Account Resources**, choose **Specific account → the target account**. This workers.dev-only, stateless service does not need DNS, Zone or Workers Routes permissions, or KV/D1 access. See the [official token instructions](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) and [API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/).
3. Save the token as the deployment environment secret `CLOUDFLARE_API_TOKEN`. Do not paste it into chat or commit it to a file. In the cloud environment editor, publish the configuration and use an environment where both variables are available to Wrangler. Do not upload deployment credentials as runtime secrets of the public Worker.
4. Check the identity and dry-run build, then deploy using those environment variables:

```sh
npx wrangler whoami
npm run build
npm run deploy
```

For a local computer with a working browser callback, `npx wrangler login` is an alternative before those commands. Both approaches authorise deployment; neither adds end-user authentication to the MCP tools.

Use the actual HTTPS `workers.dev` origin printed by the successful deployment. The MCP endpoint is that origin plus `/mcp`; documentation is `/docs` and the service privacy notice is `/privacy`. Record the actual URL and deployment version after deployment. Do not replace this with an unverified hostname.

The static files use two fixed runtime substitution tokens:

- `{{SERVICE_ORIGIN}}` — the actual request origin, without a trailing slash;
- `{{MCP_ENDPOINT}}` — that origin followed by `/mcp`.

The Worker replaces these when serving the documents. They are placeholders in source files, not an assertion that an endpoint has been deployed.

No application secret is required for the public tools. Keep any deployment credentials outside committed source. Do not commit `.env`, `.env.*`, `.dev.vars`, `.dev.vars.*`, Cloudflare API tokens or generated local credentials. Configure deployment credentials through the deployment platform's secret environment settings, or Wrangler login on a local computer; never include them in static documents or client code.

Cloudflare plan eligibility, current quotas, native rate-limit availability and any usage charges must be confirmed in the account and current [Cloudflare documentation](https://developers.cloudflare.com/workers/platform/pricing/). A free deployment is not guaranteed.

### Optional custom hostname

Start with the verified `workers.dev` HTTPS address. A Workers Custom Domain requires an **active Cloudflare zone** for the domain; see [Cloudflare's Custom Domains requirements](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

`energydune.com` currently uses Alibaba Cloud authoritative DNS. Adding a CNAME there is not a general free workaround for Workers Custom Domain routing and certificate requirements. This implementation does not migrate nameservers or change the existing website or email DNS records. Keep the `workers.dev` address unless a separate, authorised DNS/zone plan is agreed and verified. `mcp.energydune.com` must not be described as active before that work is complete.

## Access and rate limiting

Authentication is `none`. Callers do not need a product account or login to use the public catalogue and draft-generation scope.

The configured native rate-limit target is approximately **60 MCP POST requests per minute per client IP, independently at each Cloudflare location**. The native limiter is eventually consistent; it is not a strict global 60-request ceiling. A rate-limited request receives HTTP `429`; clients should back off. Cloudflare platform limits also apply. The Worker reads Cloudflare’s trusted edge IP header, derives a SHA-256 rate-limit key and passes the key to the native binding. Hashing is pseudonymisation, not anonymisation. Hosting infrastructure can separately process IP addresses and request metadata.

## Verification before submission

Run the local type checks, tests and dry-run build. After a real deployment, open the MCP Inspector:

```sh
npx @modelcontextprotocol/inspector
```

Choose Streamable HTTP, supply the actual HTTPS `/mcp` endpoint, and record the result of `tools/list` and these tool calls:

1. `get_company_info` with `{}`; confirm legal name, contact and scope.
2. `search_products` with `{"query":"heavy-duty diesel engine oils"}`; expect category-level results.
3. `search_products` with `{"query":"ISO VG 46 hydraulic oil"}`; expect the industrial category, not a fabricated SKU or approval.
4. `get_enquiry_requirements` with `{"category":"driveline"}`; confirm required fields and category notes.
5. `create_enquiry_draft` with synthetic contact details; inspect the returned summary, body and draft-only flags. Never use a real customer's information for this check.

Also verify unknown-product empty results, missing/invalid email field errors, quotation-only responses to price/stock questions, and the long-draft manual-copy fallback. A request to compare passenger car oils may explain SAE/API/ACEA enquiry criteria; it must not claim SKU-level performance comparisons.

Record the deployed version, endpoint, date, client/Inspector version and observed outcomes after each release. The current deployment record is in [public verification](tests/public-verification.md).

## Muse submission preparation

Actual portal: <https://platform.muse.ai/submission>. Public guidelines: <https://platform.muse.ai/docs>.

Use the verified endpoint and documentation URL only after public HTTPS and tool checks pass. The meaningful connector task is category retrieval → requirements/field validation → a structured draft returned to the user. The service does not promise to complete an order or send an enquiry.

The public guidelines still request a **dedicated test account**. This service has no product accounts or authentication, but that does not automatically waive a portal field or review requirement. Explain the unauthenticated scope and obtain the review team's instructions if credentials are required; do not invent a test account or declare an exemption. Tool classification, any confirmation requirements and acceptance remain subject to Muse's review. Submission does not guarantee approval, listing, recommendation or traffic.

### Access requirements draft

Copy this only after replacing the endpoint/documentation fields in the portal with verified deployment URLs and checking the actual portal requirements:

> No product account, sign-up or OAuth is required for this connector's public category-information and draft-generation tools. It retrieves six published product categories, validates enquiry fields and returns a structured email draft. It does not send email, place orders or take payments. The draft is returned only in the current response; the application does not persist the enquiry or intentionally log request bodies. Availability and specifications are confirmed by quotation. Native rate limiting targets approximately 60 MCP POSTs per minute per IP at each Cloudflare location, is eventually consistent, and is not a strict global quota. This service has no product test-account credentials; please advise how to satisfy any dedicated-test-account requirement for an unauthenticated service.

For the data questionnaire, include query arguments, draft fields, returned summaries/email bodies/mailto links, IP/request metadata, Cloudflare hosting and the client's own handling. Do not answer “no personal-data processing” merely because the application has no database. Before completing that questionnaire, confirm the actual Cloudflare account’s log settings, retention/deletion controls, access permissions and processing arrangements. Establish an incident-response owner and a process for the current Muse requirement to notify `vendor-incident@meta.com` of a User Data incident within 48 hours. This repository does not establish that an operational incident process or account-specific data assessment has been completed. Review the current Muse terms before submission; these documents do not certify compliance or create an approval exemption.

## Privacy and contact

An MCP tool invocation immediately sends its arguments to the hosted Worker for processing. Draft fields can include a name, company and email address. The application processes them for the current response without an enquiry database or intentional request-body logs. Cloudflare and Muse or another MCP client may retain operational logs, tool arguments, results or conversation history under their own settings and policies. A short `mailto` URL can contain the draft text; URL encoding does not anonymise it.

See [docs/privacy.html](docs/privacy.html) for the separate MCP privacy notice. The website’s direct enquiry form uses Cloudflare and Resend for email delivery, covered by the website privacy policy at <https://energydune.com/privacy.html>. MCP tools remain draft-only and do not invoke that email-delivery function. Website terms remain at <https://energydune.com/terms.html>.

Contact: <info@energydune.com> · Website: <https://energydune.com/>
