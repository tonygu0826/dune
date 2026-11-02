# Measuring US/Canada lubricant search visibility

The target markets are the United States and Canada. The selected languages are English and French. Visibility goals include Google/Bing organic results and actual web-grounded answers in ChatGPT, Copilot, Gemini and Perplexity. A consumer product's live answer cannot be inferred from an unrelated API response, this development conversation or a model that is not searching the Web.

No keyword positions, search volumes or AI citations have been measured by this implementation. `docs/search-query-matrix.csv` defines 20 candidate observations, not results. Do not replace missing access or a blocked test with a zero or a claim that DUNE was not recommended.

## Use the pages for distinct questions

- Home and company profile establish the company identity and its public contact process.
- `/lubricants/` and `/fr/lubrifiants/` address automotive/industrial lubricant purchasing and enquiry requirements, including US/Canadian destinations.
- Product hubs list the categories, including energy products separately.
- Five lubricant category pages explain application-specific requirements; the selection guide explains grade systems, performance claims, approvals and documentation.
- The enquiry page collects a specific request and sends it only when the visitor submits the form.

The plain word “lubricants” has multiple search intents. Record whether a result addresses an industrial application, a definition, a manufacturer or a purchase; a list of suppliers is not the expected answer to every possible query. Branded DUNE searches test identity, not success on an unbranded head term. Track these separately.

## Ordinary search observations

Use the exact query strings in the CSV. Record the date/time, engine, UI language, requested country and actual observed region, device, login state and result type. Country parameters do not establish a physical US or Canadian test location; mark unknowns honestly. A fresh browser reduces some history effects but does not prove no personalization.

Record the first ten organic results, with title, exact URL and observed position. Keep ads, maps, shopping and AI modules separate. If DUNE is absent, the valid conclusion is “not observed in the first ten organic results in this context”, not a global rank or proof of non-indexing. Search Console average position is also different from a single observed search page.

Use authorized Search Console/Bing dashboard data or exports to compare relevant country, language, query, page, device and date windows. The owner has reported successful account setup; this execution environment has no authenticated dashboard/API session and has not independently read performance metrics.

## AI answer observations

Start a new conversation without prior DUNE context or a company URL. Use each query verbatim in the product's real web-retrieval mode. Record the product, mode/model, date/time, language, country context, login/personalization state, full prompt and whether Web search was active. Google AI Mode, Gemini and Google organic search are different surfaces; similarly, Bing search and Copilot answers are different observations.

Where a fixed web-search wrapper is needed, record it consistently:

- English: `Use web search to answer this query and cite your sources: {query}`
- French: `Effectue une recherche sur le Web pour répondre à cette requête et cite tes sources : {query}`

Save the actual answer and citation URLs where the interface permits it. Distinguish company-name mentions, inline citations and source-panel-only links. Check that the cited passage supports the statement about DUNE and that the domain is `energydune.com`, not a different company with a similar name. Citation order is not a conventional search ranking, and one answer is not a stable platform-wide result. Never seed an unbranded test with an instruction to include DUNE.

## What still needs business evidence

More competitive recommendations need public, verifiable product and company information: accurate model references, current PDS/TDS and SDS, documented approvals, packaging and actual quotation constraints; company-approved identity/contact records; and credible independent business references. The site's technical sources explain lubricant terminology; they do not independently prove DUNE's stock, delivery capability or manufacturer relationships.

US/Canada are target enquiry markets, not proof of offices, warehouses, nationwide coverage or confirmed shipment terms. Add actual service facts when verified; do not create location pages by copying the same text across cities. Continue to measure qualified enquiries alongside visibility so that broader exposure remains commercially relevant.
