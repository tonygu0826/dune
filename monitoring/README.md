# DUNE daily observations

## Running and reading

The scheduled [daily workflow](../.github/workflows/daily-search-report.yml) runs public observations around 09:00 Toronto time. Two UTC crons plus a DST-aware gate choose exactly one daily observation. Cron delivery depends on GitHub Actions availability; inactive public repositories can have schedules disabled by GitHub after 60 days. Keep an eye on the workflow's latest successful observation date.

Read the **Summary** of a completed run, or download `dune-daily-report`. Reports contain only public technical observations and source-availability explanations. They have no visitor enquiries or API-derived search statistics. Artifacts are retained for 90 days; the latest baseline uses an Actions cache and may be evicted. Missing history is never presented as a valid day-over-day change.

```sh
python -m unittest discover -s monitoring -p 'test_*.py' -v
python monitoring/run.py --output daily-report
python monitoring/run.py --output daily-report --baseline prior-report/daily-result.json
```

Runtime: Python 3.12; public checks have no third-party dependencies. The collector respects inherited proxies and TLS verification, allows only exact-origin public HTTPS GETs to energydune.com, caps bodies at 1 MiB and sitemap pages at 60, uses four page requests concurrently, and refuses external redirects. No search-engine result scraping or AI prompts are sent.

## What is measured

- HTTP response, robots rules, sitemap parsing and canonical URLs.
- Original HTML title, description, language, English/French alternatives and reciprocity, noindex directives, JSON-LD syntax and static readable text.
- Allowed/blocked/unknown URL counts for named search and AI search crawlers. This measures permission only, not actual crawler traffic or citations.
- Page-list changes, visible-text hashes and added/resolved technical findings against the previous available valid observation. CSS-only changes, off-site authority, complete Schema.org semantics, browser speed and Core Web Vitals are not measured.

## What remains unmeasured

The owner previously reported successful Google verification and Bing import. Those facts do not grant API access. The scheduled report therefore marks Google impressions/clicks/positions and actual AI answers/citations **not measured**, not zero. Public crawling readiness is not a proxy for search rankings, indexing or AI recommendations.

`queries.csv` preserves the 20 US/Canada English/French target queries. Main terms, purchase-intent terms and branded controls remain distinct. A GSC average position is not a live regional search-result rank. Bing's available aggregate statistics are not automatically US/Canada-specific. A model API output is not proof of what the consumer ChatGPT, Copilot, Gemini or Perplexity interface would answer.

## Optional private search data

`sources.py` implements opt-in read-only Google Search Console and Bing Webmaster API collection. **No credentials or source calls are enabled in the public scheduled workflow.** Account keys, tokens, cookies, enquiries and non-public search statistics must not be committed or uploaded to public Actions artifacts.

For a future private deployment:

1. Create a company-controlled Google service account, enable the Search Console API and give its email read-only/restricted access to the verified `https://energydune.com/` property. Bind its JSON as `GSC_SERVICE_ACCOUNT_JSON` in a private runtime, never in code. The adapter uses only `webmasters.readonly` scope. Install `google-auth[requests]==2.43.0` in that runtime.
2. Optionally bind an owner-issued `BING_WEBMASTER_API_KEY` in the private runtime. The adapter uses the official Bing read-only stats endpoint. Reports preserve actual coverage dates and unknown regional scope.
3. Explicitly run a private collection outside the public report directory:

```sh
python monitoring/run.py --output daily-report --private-metrics --private-output private-reports
```

The private JSON is written with restricted file permissions; all API-derived values are excluded from the public Markdown/JSON and logs. The GSC window ends three days before the current Pacific date and compares completed seven-day windows; this does not guarantee Google has finalized every date. Bing missing days are marked incomplete, never filled with invented zeroes. Do not upload `private-reports/` or reuse its credentials as browser/site secrets.

4. For GEO, obtain authorized observations of actual web-grounded answers, with original query, platform/mode, time, language, observed region and citation URLs. Merely letting a crawler through, appearing in `llms.txt`, or being mentioned in a generated model response does not establish real search visibility. No fabricated AI citation score is produced.

## Codex viewing and recurring-task handoff

The workflow page can be shown in Codex's browser panel, and individual Markdown files in its document panel. This task did not have a native Codex automation-creation tool. **A GitHub schedule does not automatically create daily messages in Codex.** For a future native recurring task, use the prepared [task instructions](codex-daily-task.md); check that the native task is actually enabled and has run before claiming automatic delivery.
