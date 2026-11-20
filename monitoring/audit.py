"""Bounded public-site technical observations; never search ranks or AI citations.

Only public HTTPS GETs to one exact origin are permitted. No JavaScript, form
submission, cookies, credentials, search-engine scraping or third-party APIs.
"""
from __future__ import annotations

import hashlib
import json
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from http.client import HTTPException
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
import xml.etree.ElementTree as ET

MAX_BODY = 1024 * 1024
MAX_PAGES = 60
TIMEOUT = 15
USER_AGENT = "DUNE-Daily-Readiness/1.0 (+https://energydune.com/)"
CRAWLERS = (
    "Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User",
    "PerplexityBot", "Claude-SearchBot", "meta-webindexer",
)
_VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


def _origin(origin: str) -> str:
    parts = urlsplit(origin)
    if (parts.scheme != "https" or not parts.hostname or parts.username
            or parts.password or parts.query or parts.fragment
            or parts.path not in ("", "/") or parts.port not in (None, 443)):
        raise ValueError("Origin must be a public HTTPS root URL without credentials, query or fragment")
    # This tool is intentionally scoped to DUNE, not a general URL proxy.
    if parts.hostname.lower() != "energydune.com":
        raise ValueError("This monitor is limited to energydune.com")
    return "https://energydune.com"


def _allowed(url: str, origin: str) -> bool:
    try:
        parts = urlsplit(url)
        return (parts.scheme == "https" and parts.netloc == urlsplit(origin).netloc
                and not parts.username and not parts.password
                and not parts.query and not parts.fragment
                and not any(ord(char) < 33 for char in url))
    except (TypeError, ValueError):
        return False


class _SameOriginRedirect(HTTPRedirectHandler):
    def __init__(self, origin: str):
        self.origin = origin

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not _allowed(newurl, self.origin):
            raise ValueError("Redirect outside the exact approved origin was refused")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _fetch(url: str, origin: str) -> dict:
    if not _allowed(url, origin):
        return {"url": url, "status": None, "error": "URL outside approved origin refused", "headers": {}, "body": ""}
    try:
        # Default handlers retain the environment's proxies and TLS validation.
        opener = build_opener(_SameOriginRedirect(origin))
        request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,text/plain,application/xml;q=0.9,*/*;q=0.5"}, method="GET")
        try:
            response = opener.open(request, timeout=TIMEOUT)
        except HTTPError as exc:
            response = exc
        with response:
            payload = response.read(MAX_BODY + 1)
            if len(payload) > MAX_BODY:
                raise ValueError("Response exceeded the 1 MiB safety limit")
            headers = {key.lower(): value for key, value in response.headers.items()
                       if key.lower() in {"content-type", "x-robots-tag", "last-modified"}}
            charset = response.headers.get_content_charset() or "utf-8"
            try:
                body = payload.decode(charset, errors="replace")
            except LookupError:
                body = payload.decode("utf-8", errors="replace")
            return {"url": url, "status": response.status, "headers": headers, "body": body,
                    "bytes": len(payload), "sha256": hashlib.sha256(payload).hexdigest(), "error": None}
    except (URLError, OSError, ValueError, HTTPException) as exc:
        # Do not copy request/response bodies or proxy credentials into reports.
        return {"url": url, "status": None, "headers": {}, "body": "", "error": type(exc).__name__ + ": public GET failed"}


def _robots_octets(value: str) -> str:
    """One comparison character per octet, retaining encoded reserved octets.

    RFC 9309 section 2.2.2: encoded ASCII unreserved octets compare with their
    literal form, while encoded reserved octets must not be decoded. UTF-8
    literals and their percent-encoded form compare identically. Private-use
    characters are internal byte symbols, never output to the report.
    """
    unreserved = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~"
    result = []
    index = 0
    while index < len(value):
        char = value[index]
        if char == "%" and re.fullmatch(r"[0-9a-fA-F]{2}", value[index + 1:index + 3]):
            octet = int(value[index + 1:index + 3], 16)
            result.append(chr(octet) if chr(octet) in unreserved else chr(0xE000 + octet))
            index += 3
            continue
        if ord(char) > 126 or ord(char) < 33 or char == "%":
            result.extend(chr(0xE000 + octet) for octet in char.encode("utf-8", errors="replace"))
        else:
            result.append(char)
        index += 1
    return "".join(result)


def _robots_rule_matches(pattern: str, target: str) -> bool:
    """Prefix/glob matching without an unbounded backtracking regular expression."""
    anchored = pattern.endswith("$")
    if anchored:
        pattern = pattern[:-1]
    chunks = pattern.split("*")
    if not target.startswith(chunks[0]):
        return False
    if len(chunks) == 1:
        return not anchored or target == pattern
    position = len(chunks[0])
    for chunk in chunks[1:-1]:
        found = target.find(chunk, position)
        if found < 0:
            return False
        position = found + len(chunk)
    tail = chunks[-1]
    if anchored:
        return len(target) - len(tail) >= position and target.endswith(tail)
    return target.find(tail, position) >= 0


class _RobotsPolicy:
    """Crawler-group selection and longest-octet Allow/Disallow evaluation.

    Equally specific matching groups are combined. '*' is a fallback group,
    URL paths are case-sensitive, '*' and terminal '$' have RFC 9309 meaning,
    and Allow wins equal-specificity ties independently of file order.
    """
    def __init__(self, body: str):
        self.groups = []
        agents, rules = [], []
        seen_rule = False
        for line in body.lstrip("\ufeff").splitlines():
            line = line.partition("#")[0].strip()
            if ":" not in line:
                continue
            key, value = (part.strip() for part in line.split(":", 1))
            key = key.lower()
            if key == "user-agent":
                if seen_rule:
                    self.groups.append((agents, rules))
                    agents, rules = [], []
                    seen_rule = False
                if value:
                    agents.append(value.lower())
            elif key in {"allow", "disallow"} and agents:
                seen_rule = True
                # An empty Disallow/Allow has no restriction or match. Invalid
                # non-path records are ignored per RFC's parsing guidance.
                if value.startswith("/"):
                    pattern = _robots_octets(value)
                    literal = pattern[:-1] if pattern.endswith("$") else pattern
                    specificity = len(literal.replace("*", ""))
                    rules.append((pattern, specificity, key == "allow"))
        if agents:
            self.groups.append((agents, rules))

    def can_fetch(self, crawler: str, url: str) -> bool:
        product = crawler.lower()
        candidates = []
        for agents, rules in self.groups:
            matches = [len(agent) for agent in agents if agent != "*" and agent in product]
            specificity = max(matches) if matches else (0 if "*" in agents else -1)
            if specificity >= 0:
                candidates.append((specificity, rules))
        if not candidates:
            return True
        selected = max(specificity for specificity, _ in candidates)
        parts = urlsplit(url)
        target = _robots_octets((parts.path or "/") + ("?" + parts.query if parts.query else ""))
        matches = [(length, allow) for specificity, rules in candidates if specificity == selected
                   for pattern, length, allow in rules if _robots_rule_matches(pattern, target)]
        return max(matches)[1] if matches else True


class _Document(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lang = ""
        self.title_parts = []
        self.description = ""
        self.description_variants = {"meta": [], "og": [], "twitter": [], "schema": []}
        self.robots = []
        self.canonicals = []
        self.hreflang = {}
        self.duplicate_hreflang = []
        self.headings = []
        self.links = []
        self.schemas = []
        self.visible = []
        self._stack = []
        self._title = False
        self._schema = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.lang = attrs.get("lang", "")
        if tag == "title":
            self._title = True
        if tag == "meta":
            name = attrs.get("name", "").lower()
            if name == "description":
                self.description = attrs.get("content", "")
                self.description_variants['meta'].append(self.description)
            if attrs.get('property', '').lower() == 'og:description':
                self.description_variants['og'].append(attrs.get('content', ''))
            if name == 'twitter:description':
                self.description_variants['twitter'].append(attrs.get('content', ''))
            if name in ("robots", "googlebot", "bingbot"):
                self.robots.append(attrs.get("content", ""))
        if tag == "link":
            rel = attrs.get("rel", "").lower().split()
            if "canonical" in rel:
                self.canonicals.append(attrs.get("href", ""))
            if "alternate" in rel and attrs.get("hreflang"):
                language = attrs["hreflang"].lower()
                if language in self.hreflang:
                    self.duplicate_hreflang.append(language)
                self.hreflang[language] = attrs.get("href", "")
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
        if re.fullmatch(r"h[1-6]", tag):
            self.headings.append({"level": int(tag[1]), "text": ""})
        if tag == "script" and attrs.get("type", "").split(";")[0].strip().lower() == "application/ld+json":
            self._schema = []
        if tag not in _VOID:
            inherited_hidden = bool(self._stack and self._stack[-1][1])
            style = attrs.get("style", "").lower().replace(" ", "")
            hidden = (inherited_hidden or tag in {"head", "script", "style", "template", "svg"}
                      or "hidden" in attrs or attrs.get("aria-hidden", "").lower() == "true"
                      or "display:none" in style or "visibility:hidden" in style)
            self._stack.append((tag, hidden))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in _VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag == "title":
            self._title = False
        if tag == "script" and self._schema is not None:
            self.schemas.append("".join(self._schema))
            self._schema = None
        for index in range(len(self._stack) - 1, -1, -1):
            if self._stack[index][0] == tag:
                del self._stack[index:]
                break

    def handle_data(self, data):
        if self._title:
            self.title_parts.append(data)
        if self._schema is not None:
            self._schema.append(data)
        if self._stack and self._stack[-1][0] in {"h1", "h2", "h3", "h4", "h5", "h6"} and self.headings:
            self.headings[-1]["text"] += data
        if not self._stack or not self._stack[-1][1]:
            self.visible.append(data)


def _issue(code: str, severity: str, message: str, url: str | None = None) -> dict:
    value = {"code": code, "severity": severity, "message": message}
    if url:
        value["url"] = url
    return value


def _types(value):
    found = set()
    if isinstance(value, dict):
        kind = value.get("@type", [])
        found.update(kind if isinstance(kind, list) else [kind])
        for child in value.values():
            found.update(_types(child))
    elif isinstance(value, list):
        for child in value:
            found.update(_types(child))
    return {item for item in found if isinstance(item, str)}


def _page(resource: dict) -> dict:
    url = resource["url"]
    page = {"url": url, "status": resource.get("status"), "title": "", "description": "", "lang": "",
            "canonical": "", "hreflang": {}, "h1": [], "links": [], "schema_types": [], "visible_text_words": 0,
            "content_hash": None, "description_variants": {}, "issues": []}
    issues = page["issues"]
    if resource.get("status") != 200:
        issues.append(_issue("page-http", "critical", "Canonical page did not return HTTP 200", url))
        return page
    if "html" not in resource.get("headers", {}).get("content-type", "").lower():
        issues.append(_issue("page-content-type", "critical", "Canonical page response is not identified as HTML", url))
    doc = _Document()
    try:
        doc.feed(resource.get("body", ""))
        doc.close()
    except Exception:
        issues.append(_issue("html-parse", "critical", "HTML metadata could not be parsed", url))
        return page
    text = " ".join(" ".join(doc.visible).split())
    page.update(title=" ".join("".join(doc.title_parts).split()), description=doc.description.strip(),
                lang=doc.lang, canonical=doc.canonicals[0] if doc.canonicals else "",
                hreflang=doc.hreflang, h1=[h["text"].strip() for h in doc.headings if h["level"] == 1],
                links=doc.links, visible_text_words=len(text.split()),
                content_hash=hashlib.sha256(text.encode()).hexdigest())
    page['description_variants'] = doc.description_variants
    if not page["title"]:
        issues.append(_issue("missing-title", "warning", "Page has no document title", url))
    if not page["description"]:
        issues.append(_issue("missing-description", "warning", "Page has no description metadata", url))
    if len(doc.canonicals) != 1 or page["canonical"] != url:
        issues.append(_issue("canonical", "warning", "Expected one absolute self-referencing canonical URL", url))
    tokens = ",".join(doc.robots + [resource.get("headers", {}).get("x-robots-tag", "")]).lower()
    if re.search(r"(?:^|[\s,:])(?:noindex|none)(?:$|[\s,;])", tokens):
        issues.append(_issue("noindex", "critical", "Canonical page sends a noindex directive", url))
    if page["lang"] not in ("en", "fr"):
        issues.append(_issue("language", "warning", "Expected the site's explicit English or French document language", url))
    if len(page["h1"]) != 1:
        issues.append(_issue("h1", "warning", "Expected one primary page heading", url))
    if not text:
        issues.append(_issue("empty-public-text", "critical", "No readable text was found in the original HTML", url))
    if not doc.schemas:
        issues.append(_issue("missing-jsonld", "warning", "No JSON-LD block found; this is not itself an indexing block", url))
    for raw in doc.schemas:
        try:
            value = json.loads(raw)
            if not isinstance(value, (dict, list)):
                raise ValueError("JSON-LD must be an object or array")
            page["schema_types"] = sorted(set(page["schema_types"]) | _types(value))
            nodes = value if isinstance(value, list) else value.get('@graph', [value])
            for node in nodes:
                if isinstance(node, dict) and node.get('@id') == url + '#webpage' and isinstance(node.get('description'), str):
                    page['description_variants']['schema'].append(node['description'])
        except (ValueError, TypeError, RecursionError):
            issues.append(_issue("invalid-jsonld", "warning", "A JSON-LD block could not be parsed; full schema eligibility is not tested", url))
    if doc.schemas and not page["schema_types"]:
        issues.append(_issue("schema-no-type", "warning", "JSON-LD has no detectable Schema type", url))
    if doc.duplicate_hreflang:
        issues.append(_issue("duplicate-hreflang", "warning", "Duplicate language alternatives found", url))
    return page


def _sitemap(resource: dict, origin: str) -> tuple[list[str], list[dict]]:
    issues = []
    if resource.get("status") != 200:
        return [], [_issue("sitemap-http", "critical", "Sitemap did not return HTTP 200", resource["url"])]
    raw = resource.get("body", "")
    if re.search(r"<!\s*(?:DOCTYPE|ENTITY)", raw, re.IGNORECASE):
        return [], [_issue("sitemap-unsafe-xml", "critical", "Sitemap document declarations/entities refused", resource["url"])]
    try:
        root = ET.fromstring(raw)
    except ET.ParseError:
        return [], [_issue("sitemap-xml", "critical", "Sitemap is not valid XML", resource["url"])]
    if root.tag.rsplit("}", 1)[-1] != "urlset":
        return [], [_issue("sitemap-format", "critical", "Expected this small site's URL sitemap; sitemap indexes are not followed", resource["url"])]
    urls = []
    for item in root:
        if item.tag.rsplit("}", 1)[-1] != "url":
            continue
        for child in item:
            if child.tag.rsplit("}", 1)[-1] == "loc":
                url = (child.text or "").strip()
                if not _allowed(url, origin):
                    issues.append(_issue("sitemap-external-url", "warning", "Sitemap URL outside the exact approved origin was refused", resource["url"]))
                elif url in urls:
                    issues.append(_issue("sitemap-duplicate", "warning", "Sitemap contains a duplicate canonical URL", url))
                else:
                    urls.append(url)
    if not urls:
        issues.append(_issue("sitemap-empty", "critical", "No approved canonical URLs found in sitemap", resource["url"]))
    if len(urls) > MAX_PAGES:
        issues.append(_issue("sitemap-cap", "warning", "Sitemap exceeds the 60-page daily check cap; remaining pages were not checked", resource["url"]))
    return urls[:MAX_PAGES], issues


def _public_resource(resource: dict) -> dict:
    return {key: value for key, value in resource.items() if key != "body"}


def collect_site(origin: str = "https://energydune.com") -> dict:
    """Collect observations, preserving unavailable data rather than inventing it."""
    origin = _origin(origin)
    names = {"robots": "/robots.txt", "sitemap": "/sitemap.xml", "llms": "/llms.txt"}
    with ThreadPoolExecutor(max_workers=3) as pool:
        values = list(pool.map(lambda path: _fetch(origin + path, origin), names.values()))
    resources = dict(zip(names, values))
    urls, issues = _sitemap(resources["sitemap"], origin)
    sitemap_valid = bool(urls) and not any(item["severity"] == "critical" for item in issues)
    fallback_page = not bool(urls)
    if not urls:
        urls = [origin + "/"]
    with ThreadPoolExecutor(max_workers=4) as pool:
        pages = list(pool.map(lambda url: _page(_fetch(url, origin)), urls))
    by_url = {page["url"]: page for page in pages}
    for page in pages:
        if page["status"] != 200:
            continue
        hreflang = page["hreflang"]
        if not {"en", "fr"}.issubset(hreflang):
            page["issues"].append(_issue("missing-hreflang", "warning", "Expected reciprocal English and French alternatives", page["url"]))
        for language, target in hreflang.items():
            if not _allowed(target, origin):
                page["issues"].append(_issue("hreflang-origin", "warning", "Language alternative is not an approved absolute site URL", page["url"]))
            elif target not in by_url:
                page["issues"].append(_issue("hreflang-unchecked", "warning", "Language alternative was absent from checked sitemap pages", page["url"]))
            elif language != "x-default":
                alternate = by_url[target]
                if alternate["lang"] != language or alternate["hreflang"].get(page["lang"]) != page["url"]:
                    page["issues"].append(_issue("hreflang-reciprocity", "warning", "Language alternatives do not link back consistently", page["url"]))
    robot = resources["robots"]
    access = {bot: {"allowed": [], "blocked": [], "unknown": []} for bot in CRAWLERS}
    if robot.get("status") == 200:
        parser = _RobotsPolicy(robot["body"])
        for bot in CRAWLERS:
            for url in urls:
                allowed = parser.can_fetch(bot, url)
                access[bot]["allowed" if allowed else "blocked"].append(url)
                if not allowed:
                    severity = "critical" if bot in {"Googlebot", "Bingbot"} else "warning"
                    issues.append(_issue("robots-block-" + bot.lower(), severity, f"robots.txt disallows {bot} for this canonical page; access permission is not proof of crawling or citation", url))
        if origin + "/sitemap.xml" not in robot["body"]:
            issues.append(_issue("robots-sitemap", "info", "robots.txt does not declare the site's sitemap", origin + "/robots.txt"))
    elif robot.get("status") in (404, 410):
        for bot in CRAWLERS:
            access[bot]["allowed"] = list(urls)
        issues.append(_issue("robots-absent", "info", "robots.txt is absent; no file-based disallow is inferred", origin + "/robots.txt"))
    else:
        for bot in CRAWLERS:
            access[bot]["unknown"] = list(urls)
        issues.append(_issue("robots-unavailable", "warning", "robots.txt could not be inspected; crawler access remains unknown", origin + "/robots.txt"))
    if resources["llms"].get("status") != 200:
        issues.append(_issue("llms-unavailable", "info", "Optional llms.txt unavailable; it is not a search or AI inclusion requirement", origin + "/llms.txt"))
    for page in pages:
        issues.extend(page["issues"])
    counts = {level: sum(issue["severity"] == level for issue in issues) for level in ("critical", "warning", "info")}
    return {"origin": origin, "checked_at": datetime.now(timezone.utc).isoformat(),
            "scope": "Public GET technical readiness only; not search rankings, index coverage, AI mentions or citations",
            "resources": {name: _public_resource(value) for name, value in resources.items()},
            "pages": pages, "crawler_access": access, "issues": issues,
            "summary": {"pages_expected": None if fallback_page else len(urls), "pages_checked": len(pages),
                        "sitemap_valid": sitemap_valid, "fallback_page_only": fallback_page,
                        "http_ok": sum(page["status"] == 200 for page in pages), **counts,
                        "healthy": counts["critical"] == 0}}


def compare(previous: dict | None, current: dict) -> dict:
    """Compare stable observations only; unavailable fetches are not content edits."""
    if not previous:
        return {"baseline_available": False, "added_urls": [], "removed_urls": [], "changed_content": [], "changed_metadata": [], "new_issues": [], "resolved_issues": []}
    before = {page["url"]: page for page in previous.get("pages", [])}
    after = {page["url"]: page for page in current.get("pages", [])}
    changed = [url for url in sorted(before.keys() & after.keys())
               if before[url].get("content_hash") and after[url].get("content_hash")
               and before[url]["content_hash"] != after[url]["content_hash"]]
    metadata_fields = ("title", "description", "lang", "canonical", "hreflang", "schema_types")
    def metadata_observed(page):
        return page.get('status') == 200 and not {'html-parse', 'page-content-type'} & {issue.get('code') for issue in page.get('issues', [])}
    metadata_changed = [url for url in sorted(before.keys() & after.keys())
                        if metadata_observed(before[url]) and metadata_observed(after[url])
                        and any(before[url].get(key) != after[url].get(key) for key in metadata_fields)]
    def signatures(report):
        return {(issue.get("url", ""), issue["code"], issue["severity"]): issue for issue in report.get("issues", [])}
    old_issues, new_issues = signatures(previous), signatures(current)
    # A failed sitemap fetch is incomplete observation, not proof of deleted pages.
    old_ok = (previous.get("resources", {}).get("sitemap", {}).get("status") == 200
              and previous.get("summary", {}).get("sitemap_valid", True))
    new_ok = (current.get("resources", {}).get("sitemap", {}).get("status") == 200
              and current.get("summary", {}).get("sitemap_valid", True))
    complete = old_ok and new_ok
    def resolution_observed(key):
        url, code, _ = key
        if url in after and after[url].get("status") != 200:
            return False
        if code.startswith("robots-block-"):
            if current.get("resources", {}).get("robots", {}).get("status") not in (200, 404, 410):
                return False
            bot = code.removeprefix("robots-block-")
            for name, observation in current.get("crawler_access", {}).items():
                if name.lower() == bot and url in observation.get("unknown", []):
                    return False
        return True
    resolved = [old_issues[key] for key in sorted(old_issues.keys() - new_issues.keys()) if resolution_observed(key)]
    return {"baseline_available": True,
            "added_urls": sorted(after.keys() - before.keys()) if complete else [],
            "removed_urls": sorted(before.keys() - after.keys()) if complete else [],
            "changed_content": changed,
            "changed_metadata": metadata_changed,
            "new_issues": [new_issues[key] for key in sorted(new_issues.keys() - old_issues.keys())],
            "resolved_issues": resolved if complete else [], "page_list_comparable": complete}
