# Public verification — 2026-10-23

The MCP service was deployed to Cloudflare Workers and checked over public HTTPS with TLS verification enabled. These results establish connector reachability and tool behavior; they do not establish Muse submission or approval.

| Deployment field | Value |
| --- | --- |
| Endpoint | https://energydune-mcp.tonygu0826.workers.dev/mcp |
| Documentation | https://energydune-mcp.tonygu0826.workers.dev/docs |
| Service privacy | https://energydune-mcp.tonygu0826.workers.dev/privacy |
| Transport / authentication | Stateless Streamable HTTP / none |
| Worker version | `4b587fa9-fe5f-4327-aa31-482bb45753ea` |
| Runtime source commit | `d00ccfc650f0f59049a9578ec2d3608382dfbb28` |
| SDK / Inspector | MCP SDK 1.32.2 / MCP Inspector 2.12.0 |

Observed results:

- `/docs`, `/health`, `/privacy` and `/llms.txt` returned HTTPS 200 with correct MIME types. Served documentation contains the actual endpoint and no unresolved template tokens. Health reports the native rate-limiter binding configured.
- The official SDK `StreamableHTTPClientTransport` initialized, negotiated a protocol version, discovered exactly five tools and successfully called all five. No session ID was issued. JSON text and structured output agreed. Missing email and forbidden leading controls returned machine-readable field errors.
- MCP Inspector strict `tools/list` passed. Seven public tool calls passed: company information, French categories, heavy-duty diesel oils, ISO VG 46 hydraulic oil, passenger-car SAE/API/ACEA category context, transmission enquiry requirements and a synthetic SINOPEC enquiry draft.
- Draft responses remained `draft_only: true`, `sent: false`, `persisted: false`. Test contacts used `example.com`; no email was sent, no order was placed and no Muse submission was performed.

The deployed native limiter targets approximately 60 POSTs/minute/IP at each Cloudflare location. The local 429 boundary was tested separately; no production load test was performed. `mcp.energydune.com` is not configured; use the verified workers.dev endpoint above.

To repeat the official SDK integration check for a release, set `MCP_TEST_ENDPOINT` to the actual HTTPS endpoint and run the HTTP test in `tests/protocol.test.ts`. Use synthetic contacts, preserve proxy/CA settings and keep TLS verification enabled.
