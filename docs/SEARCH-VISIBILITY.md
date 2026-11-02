# Search and AI retrieval

The website publishes English and French as separate static documents. The HTML response contains the content, title, description, language, canonical URL, reciprocal `hreflang` links and structured data before JavaScript runs. JavaScript enhances product filters and sends enquiries; it is not needed to discover or read company, category or reference content.

## What changed

- English homepage `/` and French homepage `/fr/`, plus separate `/mail/` and `/fr/mail/` enquiry pages. Old `?lang=` links and `/#mail` remain compatible through client-side redirects on GitHub Pages.
- Six distinct category pages in each language, an English/French product hub, a source-backed lubricant selection guide and a factual company profile. `site/routes.json` records all 26 canonical documents and their alternatives.
- Consistent `Organization` and `WebSite` identities, document schemas and visible breadcrumbs. Category pages describe sales-enquiry services, not invented SKU-level products, inventory, prices, ratings or authorised distributorships.
- Distinct static titles/descriptions, canonical and alternate URLs, Open Graph/Twitter sharing metadata, a custom noindex 404 and a sitemap of canonical URLs. Last-modified dates are used only where substantial content actually changed.
- Responsive 640/1024/1536px WebP hero images replace a 2,259,934-byte PNG in the page. Original image files remain available for existing links. The large sharing image is a separate JPEG.
- Search and user-requested AI retrieval are allowed in `robots.txt`. `llms.txt` is a factual optional navigation aid, not an indexing requirement or ranking signal.
- Language is selected by the public URL, not by hidden browser storage. The privacy policy's language paragraph and update date reflect that behavior. Form details continue to be sent only after the visitor submits an enquiry; no analytics or tracking service has been added.

## IndexNow notifications

`indexnow-key.txt` is an intentionally public host-ownership proof. It is independent of account credentials and mail-provider keys. After the matching file is publicly available, an operator can notify participating search engines of the canonical public URLs:

```sh
python tools/notify_indexnow.py
python tools/notify_indexnow.py --submit
```

The first command previews the host, endpoint and URL count without submitting. The second checks the live public proof, then sends one batch to the [official IndexNow endpoint](https://www.indexnow.org/documentation). It does not require a Webmaster account. HTTP 200 confirms receipt, while 202 means receipt with host-proof validation pending; neither confirms crawling or indexing. The receipt is written under `.local/` and must not be published. Do not include private URLs, visitor details, enquiry payloads or query strings. Avoid repeated unchanged notifications; respect 429 rate limits and back off rather than retrying continuously.

## Verify ownership and start measuring

The owner confirmed that neither Google Search Console nor Bing Webmaster Tools is set up. Neither account was created or logged into by this implementation.

1. Open [Google Search Console](https://search.google.com/search-console/welcome), sign in to the company-controlled Google account, and add the **URL-prefix** property `https://energydune.com/`. All current canonical site URLs are under this prefix.
2. Expand **HTML tag**, copy the whole `google-site-verification` meta tag, and provide that public ownership proof to the website operator. The operator can publish it in the original homepage HTML without changing DNS. Then return to Search Console and select **Verify**. Publishing a proof does not by itself confirm that the account completed verification. Keep the tag in place after success.
3. In **Sitemaps**, submit `https://energydune.com/sitemap.xml`. Use URL Inspection on `/`, `/fr/`, the product hubs and representative category/guide pages. Request indexing where appropriate, then inspect Pages/Indexing and Performance over time.
4. Sign in to [Bing Webmaster Tools](https://www.bing.com/webmasters/). The owner can choose to import the verified Search Console site and review the requested Google permissions. Alternatively, add `https://energydune.com/` manually and copy the **HTML Meta Tag** (`msvalidate.01`); the operator can publish it, after which the owner selects **Verify**. Submit the same sitemap and inspect representative URLs.
5. Track real query impressions, clicks, indexed pages and enquiries by language. Search Console may include appearances in Google AI features within its web-search reporting; the implementation does not claim a separate AI citation dashboard.

Search-engine verification values are public ownership proofs. Account credentials, Cloudflare tokens and mail-provider keys do not belong in HTML, this repository or Search Console verification fields.

To install a real provider-issued tag, save the public tag under `.local/` and run:

```sh
python tools/set_search_verification.py google --tag-file .local/google-verification-tag.txt
python tools/set_search_verification.py bing --tag-file .local/bing-verification-tag.txt
python tools/build_site.py
python tools/check_seo.py
```

`site/config.json` stores only the public proof values. Empty values generate no verification tags. Only the root homepage receives these two tags. Publish that updated homepage and verify its original HTML over HTTPS before selecting Verify in each account. Do not invent proof values, publish test markers or mark an account verified without a provider success result.

For a broader Google **Domain** property, DNS verification remains an optional later route: add the provider-issued TXT at `@` in Alibaba Cloud DNS and complete verification. Add a new record; preserve existing website, MX, SPF, DKIM and Resend records.

## Maintain content without losing the search foundations

Build requirements: Python 3.12+ and `python -m pip install -r tools/requirements-site.txt`.

```sh
python tools/build_site.py
python tools/build_site.py --check
python tools/check_seo.py
node --check app.js
```

Edit `site/content.json` for category/guide text and verified references; `site/ui-copy.json` for shared interface text; `site/home.html` and `site/mail.html` for the two template bodies; `site/app.template.js` for runtime behavior; and `site/legal/` for company-approved policy text. The generator rebuilds both languages and discovery files. `site/config.json` holds the real editorial update date; do not change it merely because the build ran. Review a policy before changing its date or substance. `seo.css` contains content-page styling.

Generated files are committed for static hosting. Do not hand-edit generated HTML or `app.js`, because the next build replaces them. Publish only public files to `gh-pages`; keep `site/`, `tools/`, `docs/`, local reports, credentials and backend source out of that public deployment tree. Preserve `CNAME` and `.nojekyll`.

## Limits and references

Technical accessibility, useful public answers, clear entity information and documented facts support search discovery and retrieval. They cannot guarantee crawling, indexing, rankings, AI inclusion or citations. Google does not require special AI text files or a separate AI schema. An OpenAI search-crawler allowance is separate from the training-crawler policy; this change does not claim to alter model-training permissions beyond the site's existing wildcard allowance.

No verified address, telephone, registration number, founding year, service-country list or authorised-dealer status was supplied. Do not add these to visible content or structured data without checking the company records. Brand names identify requested products. Standards describe terminology; they do not prove an individual product's approval or availability.

- [Google: multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Google: localized page versions](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google: AI features and websites](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [OpenAI: crawler information](https://developers.openai.com/api/docs/bots)
- Technical product references are linked from the relevant public category and guide pages.
