# MCP interface reference

DUNE ENERGY GLOBAL INC. · Category information and enquiry drafts · Version 0.1.0

Runtime endpoint: `https://energydune-mcp.tonygu0826.workers.dev/mcp`

Service origin: `https://energydune-mcp.tonygu0826.workers.dev`

Transport: stateless Streamable HTTP · Authentication: none

The endpoint above was deployed and publicly checked on October 23, 2026. The Worker serves HTML documentation and llms.txt using the actual request origin. Deployment and test evidence is recorded in [public verification](../tests/public-verification.md).

Public pages: `/docs` · `/privacy` · `/llms.txt`
Website: <https://energydune.com/> · Contact: <info@energydune.com>

## Scope and shared inputs

All five tools accept optional `lang: "en" | "fr"`; the default is `en`. Category records include English and French names. The generated email body is always English; `lang` controls localised response metadata, category labels, summaries and messages. Inspect `tools/list` for the authoritative schema and current field limits.

Four tools are read-only. `create_enquiry_draft` is the draft-generation/write tool; its only result is a response containing a draft. It performs no external send, order, payment or persistent enquiry write.

Data is limited to these six published categories:

| ID | Category | Segment | Specification context |
| --- | --- | --- | --- |
| `pcmo` | Passenger car engine oils | Automotive | SAE · API / ACEA |
| `hdeo` | Heavy-duty diesel engine oils | Commercial | SAE · API / OEM |
| `industrial` | Industrial lubricants | Industrial | ISO VG |
| `driveline` | Transmission & gear oils | Automotive / Commercial | ATF / MTF · OEM |
| `greases` | Lubricating greases | Industrial / Commercial | NLGI |
| `energy` | Energy products | Energy | Grade / volume |

Specifications are enquiry context, not evidence of an individual product's approval or suitability. There is no SKU catalogue, price list, live inventory, confirmed delivery time or product-performance comparison.

Every search result carries: `"Availability and specifications confirmed by quotation."`

Brand names identify requested products, not authorised distribution. Supported enquiry preferences are `SINOPEC` and `Great Wall Lubricants`; a preference is not a product-availability or affiliation claim.

## 1. `get_company_info` — read

Optional arguments: `lang`.

```json
{"lang":"en"}
```

Returns the legal/display names, description, public website/contact email, segments, enquiry brands, category-level limitations, brand disclaimer and quotation note. No unlisted telephone number, address or certification is supplied.

## 2. `list_product_categories` — read

Optional arguments: `segment`, `lang`. Segment values are `Automotive`, `Commercial`, `Industrial`, `Energy`.

```json
{"segment":"Commercial","lang":"en"}
```

Returns matching categories, English/French names, specification context and enquiry notes. The driveline category spans Automotive and Commercial. Omitting the segment lists all six categories.

## 3. `search_products` — read

Arguments: optional `query`, `category`, `brand`, `application`, `lang`; provide a query or at least one filter. Category values are the IDs above. Brand values are the two supported enquiry preferences.

```json
{"query":"ISO VG 46 hydraulic oil","brand":"SINOPEC","lang":"en"}
```

Retrieves matching category-level records using product terms, specification context and filters. This example identifies the industrial family; it does not establish a matching SKU, an approval, stock or a supply offer. The response identifies the requested brand separately. A brand by itself does not establish product intent or product availability.

No-match searches return an empty `results` array with guidance to change the product terms or prepare an enquiry. They do not invent a product. Each returned category includes the quotation note.

## 4. `get_enquiry_requirements` — read

Optional arguments: `category`, `lang`.

```json
{"category":"hdeo","lang":"en"}
```

Returns required/optional enquiry-field definitions, allowed enquiry brands and document types, and category-specific points to confirm. Heavy-duty requirements, for example, include the relevant grade and OEM/specification requirements. Technical documents are requested through the enquiry; this tool does not supply a fabricated TDS/PDS or SDS.

## 5. `create_enquiry_draft` — write, draft only

Required string fields:

- `name`
- `company`
- `email`
- `requirements`

Optional fields:

- `category`: one category ID; the current form default is `pcmo` if omitted;
- `brand`: `SINOPEC` or `Great Wall Lubricants`;
- `product_reference`, `viscosity_or_grade`, `specification_or_oem`, `quantity_packaging`, `destination`: strings;
- `documents_requested`: an array containing `"TDS / PDS"` and/or `"SDS"`;
- `lang`: `en` or `fr`, default `en`.

Use the canonical field name `documents_requested`. Do not substitute a differently named documents field. Single-line text fields reject control characters; requirements may contain line breaks. Current limits are 254 characters for ordinary text fields and 5,000 for requirements; check the live schema before constructing requests.

Synthetic example:

```json
{
  "name":"Example Contact",
  "company":"Example Company",
  "email":"buyer@example.com",
  "requirements":"Please confirm suitable products and provide a quotation.",
  "category":"industrial",
  "brand":"SINOPEC",
  "viscosity_or_grade":"ISO VG 46",
  "quantity_packaging":"Please confirm packaging options",
  "destination":"To be confirmed",
  "documents_requested":["TDS / PDS","SDS"],
  "lang":"en"
}
```

The result includes:

- `status: "draft"`, `draft_only: true`, `sent: false`, `persisted: false`;
- a structured `summary` of the supplied enquiry fields;
- `email.to`, `email.subject`, the complete `email.body` and `email.mailto_url`;
- `email.manual_copy_required`, a next-step message, and the brand/quotation notes.

The recipient is `info@energydune.com`. The user must review the draft and send it from their own email application. No submission receipt, order number or delivery confirmation is generated.

If the fully encoded `mailto` URL would exceed **1,800 characters**, the returned URL contains only the recipient and subject, and `manual_copy_required` is `true`. The complete body is still returned in `email.body` for manual copying. The application does not send or shorten the enquiry body through an external service.

Missing or invalid fields return machine-readable validation errors:

```json
{
  "status":"validation_error",
  "field_errors":[
    {"field":"email","code":"required","message":"Please complete this field."}
  ]
}
```

The live MCP schema may reject invalid argument types before a tool handler runs; callers must also handle normal MCP argument/protocol errors.

## Privacy, limits and operational status

Calling a tool sends its arguments to the hosted service immediately. Name, company, email, free text and the generated draft can be received by Cloudflare and by Muse or the MCP client. The application has no enquiry database, does not persist draft inputs and does not intentionally log request bodies. This does not mean end-to-end zero storage: platform logs and client conversation/tool history may remain under their own policies. The Worker also processes the trusted edge IP address to derive a SHA-256 key for the native rate limiter; that key is pseudonymous, not anonymous. The returned `mailto` can contain encoded draft text. Read `/privacy` before supplying personal or confidential information.

Native rate limiting targets approximately 60 MCP POSTs per minute per client IP **at each Cloudflare location**. The limiter is eventually consistent, not a strict global quota. Handle HTTP `429` with backoff. Account eligibility, platform quotas and charges require confirmation with Cloudflare; no zero-cost guarantee is made.

Deployment, remote verification and Muse submission preparation are documented in the project README.
