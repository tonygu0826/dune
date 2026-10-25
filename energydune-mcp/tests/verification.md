# Local verification — 2026-10-23

These results apply to local source and a local Wrangler Worker, not to a public deployment or Muse approval.

Environment: Node 24.19.0, MCP SDK 1.32.2, Wrangler 4.152.0, MCP Inspector 2.12.0.

| Check | Observed result |
| --- | --- |
| TypeScript | `npm run typecheck` passed. |
| Business tests | 20 passed: category data, unknown products, quotation boundaries, field errors, controls/Unicode and mailto limits. |
| Official SDK client | 8 in-memory protocol tests passed; real Streamable HTTP integration passed against local Wrangler. Five tools discovered and called, no session ID, matching text/structured results. |
| Worker bundle | `npm run build` passed; native `MCP_RATE_LIMITER` binding included. |
| HTTP routes and boundaries | 19 local checks passed: runtime documentation URLs, privacy, HEAD, health, CORS, rejected methods, invalid JSON/media type/Accept/version, 64 KiB body limit and malformed Unicode. |
| Native local limiter | 60 successful POSTs followed by HTTP 429 on request 61, with `Retry-After: 60`. Cloudflare production limits remain approximate and location-specific. |
| MCP Inspector | Strict `tools/list` and seven calls passed locally: company, French categories, HDEO, hydraulic oil, passenger-car comparison context, transmission requirements, and a synthetic SINOPEC draft. |

The default `npm test` includes the business and in-memory tests. To include a running Worker in the same test run:

```sh
# In a second terminal, after npm run dev is ready:
MCP_TEST_ENDPOINT=http://127.0.0.1:8787/mcp npm test
```

The combined HTTP-enabled test run passed all 29 tests without skips. CI starts its own local Worker and runs the same suite without Cloudflare credentials. Synthetic `example.com` contacts are used; no email is sent.

Public deployment and follow-up checks are recorded separately in [public verification](public-verification.md). `mcp.energydune.com` has not been configured or verified. Muse submission remains a separate step; no Muse approval is implied by these tests.
