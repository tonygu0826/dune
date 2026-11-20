"""Turn measured public observations into tests/actions, never ranking claims.

Pure evaluation only: no network, writes, credentials, deployment, or AI calls.
Keyword tests describe the readiness of a selected on-site target, not whether
Google/Bing have indexed it or an AI service has cited it.
"""
from __future__ import annotations

import re
import unicodedata
from urllib.parse import urljoin, urlsplit, urlunsplit

ORIGIN = "https://energydune.com"
ABOUT_DESCRIPTIONS = {
    "en": "About DUNE ENERGY GLOBAL: multi-brand lubricant and energy product sales, purchasing requirements and official contact details.",
    "fr": "DUNE ENERGY GLOBAL : vente de lubrifiants multimarques et de produits énergétiques. Découvrez l’entreprise et préparez votre demande de devis.",
}


def _approved(url):
    try:
        part = urlsplit(url)
        return (part.scheme == "https" and part.netloc == "energydune.com"
                and not part.username and not part.password
                and not any(ord(char) < 33 for char in url) and "\\" not in url)
    except (TypeError, ValueError):
        return False


def _target(path):
    if not isinstance(path, str) or not path.startswith("/") or path.startswith("//"):
        return None
    url = ORIGIN + path
    if not _approved(url):
        return None
    part = urlsplit(url)
    return url if not part.query and not part.fragment else None


def _internal_link(source, link):
    if not isinstance(link, str):
        return None
    try:
        url = urljoin(source, link)
        if not _approved(url):
            return None
        part = urlsplit(url)
        return urlunsplit((part.scheme, part.netloc, part.path or "/", "", ""))
    except (ValueError, TypeError):
        return None


def _check(name, status, evidence):
    return {"name": name, "status": status, "evidence": evidence}


def _normalize(text):
    text = "".join(char for char in unicodedata.normalize("NFKD", str(text).casefold())
                   if not unicodedata.combining(char))
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text).split())


def _topic(page, path, available):
    if not available:
        return {"status": "unknown", "matched_terms": [], "scope": "title, description and H1 only"}
    if "lubricant-selection" in path:
        terms = ("SAE", "ISO VG", "NLGI")
    elif "industrial-lubricants" in path or "lubrifiants-industriels" in path:
        terms = ("industrial lubricants", "lubrifiants industriels", "hydraulic", "hydrauliques", "ISO VG")
    elif "engine-oils" in path or "huiles-moteur" in path:
        terms = ("engine oils", "engine oil", "huiles moteur", "huile moteur", "SAE", "API")
    elif path.rstrip("/").endswith("about"):
        terms = ("DUNE ENERGY GLOBAL",)
    else:
        terms = ("lubricants", "lubrifiants", "lubricant", "lubrifiant")
    text = " " + _normalize(" ".join([page.get("title", ""), page.get("description", ""), *page.get("h1", [])])) + " "
    matched = [term for term in terms if " " + _normalize(term) + " " in text]
    return {"status": "observed" if matched else "not_observed", "matched_terms": matched,
            "scope": "title, description and H1 only; optional topical clues, not full content quality or query-string matching"}


def _keyword_test(site, query, pages, inbound):
    url = _target(query.get("candidate_target_path"))
    valid_sitemap = site.get("summary", {}).get("sitemap_valid") is True
    full_page_list = valid_sitemap and not any(item.get("code") == "sitemap-cap" for item in site.get("issues", []))
    page = pages.get(url) if url else None
    checks = [_check("approved_target", "passed" if url else "failed",
                     url or "Target must be an exact-origin public path without query or fragment")]
    if not url:
        checks += [_check(name, "unknown", "No approved target can be evaluated") for name in
                   ("sitemap", "http", "language", "canonical", "index_directives", "Googlebot", "Bingbot", "internal_entry")]
        available = False
    else:
        listed = page is not None and valid_sitemap
        checks.append(_check("sitemap", "passed" if listed else ("failed" if full_page_list else "unknown"),
                             "Target listed in the valid observed sitemap" if listed else "No confirmed sitemap entry in this observation"))
        status = page.get("status") if page else None
        checks.append(_check("http", "passed" if status == 200 else ("unknown" if status is None else "failed"),
                             {"observed_http_status": status}))
        issue_codes = {item.get("code") for item in (page or {}).get("issues", [])}
        available = status == 200 and not ({"html-parse", "page-content-type"} & issue_codes)
        if available:
            checks.append(_check("language", "passed" if page.get("lang") == query.get("language") else "failed",
                                 {"expected": query.get("language"), "observed": page.get("lang")}))
            checks.append(_check("canonical", "passed" if page.get("canonical") == url and "canonical" not in issue_codes else "failed",
                                 {"expected": url, "observed": page.get("canonical")}))
            checks.append(_check("index_directives", "failed" if "noindex" in issue_codes else "passed",
                                 "noindex observed" if "noindex" in issue_codes else "No noindex observed in parsed HTML/X-Robots-Tag; this is not proof of indexing"))
        else:
            checks += [_check(name, "unknown", "Target HTML/headers were not successfully observed") for name in ("language", "canonical", "index_directives")]
        for bot in ("Googlebot", "Bingbot"):
            access = site.get("crawler_access", {}).get(bot, {})
            if url in access.get("blocked", []):
                state = "failed"
            elif url in access.get("allowed", []):
                state = "passed"
            else:
                state = "unknown"
            checks.append(_check(bot, state, "robots permission only; not crawler traffic or search visibility"))
        sources = sorted(inbound.get(url, set()))
        # The absence of a link is conclusive only if the whole observed page set
        # was read successfully. Failed pages might still link to this target.
        complete_links = full_page_list and bool(pages) and all(page.get("status") == 200 and not
                            ({"html-parse", "page-content-type"} & {issue.get("code") for issue in page.get("issues", [])})
                            for page in pages.values())
        checks.append(_check("internal_entry", "passed" if sources else ("failed" if complete_links else "unknown"),
                             {"observed_sources": sources[:3], "source_count": len(sources), "scope": "another successful HTML page; query and fragment ignored"}))
    states = {check["status"] for check in checks}
    outcome = "failed" if "failed" in states else ("unknown" if "unknown" in states else "passed")
    return {"id": query.get("id"), "query": query.get("query"), "target_url": url,
            "language": query.get("language"), "requested_country": query.get("requested_country"),
            "on_site_status": outcome, "checks": checks,
            "topical_signal": _topic(page or {}, query.get("candidate_target_path", ""), available),
            "actual_rank_status": "not_measured", "ai_citation_status": "not_measured"}


_OPERATIONS = {
    "canonical": ("核对目标页的 canonical；在源模板修复后构建并复测。", "原始 HTML 中恰有一个绝对 self-canonical。"),
    "missing-title": ("用真实页面主题补充独立标题；生成后检查标题及语言。", "原始 HTML 有非空且适当的 title。"),
    "missing-description": ("依据现有业务内容撰写页面摘要；同步社交和结构化描述。", "原始 HTML 有非空 description，内容与页面相符。"),
    "noindex": ("先确认是否有意禁止索引；只有确认该页应公开索引后才修改指令。", "复查 HTML 与 X-Robots-Tag 的索引指令。"),
    "language": ("修复对应英文／法文文档的语言标记，保留内容语言。", "文档 lang 与目标语种一致。"),
    "invalid-jsonld": ("修复 JSON-LD 语法并重新解析；不添加未经证实的业务数据。", "所有 JSON-LD 均可解析，另行检查语义。"),
    "missing-hreflang": ("核对英法页面配对，在源模板补足语言链接并复测互链。", "两种语言的 alternate 都存在且返回链接一致。"),
    "hreflang-reciprocity": ("修正英法语言链接的配对；重建后复测两页。", "目标语言匹配，双向 alternate 返回正确页面。"),
    "page-http": ("再次检查该 URL 的 HTTP 状态；持续失败时排查部署和路由。", "公开 GET 返回 200 且正文可读。"),
    "keyword-internal-entry": ("从主题相关的已存在页面添加自然内链，构建后检查目标链接。", "至少另一成功页面存在指向该目标的站内入口。"),
    "keyword-target-language": ("核对关键词到页面的映射与语言，不把不同语种目标混用。", "目标页 lang 与观测查询所用语言一致。"),
    "keyword-sitemap": ("核对目标路径及站点地图；仅将真实可公开页面加入地图。", "有效站点地图包含该目标 URL。"),
    "keyword-approved-target": ("修正关键词配置中的目标路径；只允许本站公开路径。", "目标为 https://energydune.com 下的规范路径。"),
}


def _action(code, url, priority, evidence, *, known=True):
    operation, probe = _OPERATIONS.get(code, ("根据已记录的观测定位源模板或部署问题，修改后运行同一检查。", "重新执行对应检查，确认该问题是否仍出现。"))
    if code.startswith("robots-block-"):
        operation = "确认爬虫规则是否符合站点意图；需要放行时修正规则并对全部规范 URL 复测。"
        probe = "该爬虫对目标 URL 的 robots 判断为允许；这不证明已抓取或被引用。"
    uncertain = code in {"robots-unavailable", "collector-failed", "sitemap-http", "hreflang-unchecked"}
    return {"id": f"{code}:{url}", "code": code, "url": url, "priority": priority,
            "evidence": evidence, "action": operation, "probe": probe,
            "status": "tested_failure" if known and not uncertain else "not_verified",
            "requires_change": code not in {"page-http", "robots-unavailable", "collector-failed", "sitemap-http", "hreflang-unchecked", "noindex"}}


def evaluate(site, queries):
    """Evaluate an existing bounded observation; no further data is requested."""
    pages = {page["url"]: page for page in site.get("pages", []) if _approved(page.get("url"))}
    inbound = {}
    for source, page in pages.items():
        if page.get("status") != 200 or {"html-parse", "page-content-type"} & {issue.get("code") for issue in page.get("issues", [])}:
            continue
        for link in page.get("links", []):
            target = _internal_link(source, link)
            if target and target != source:
                inbound.setdefault(target, set()).add(source)
    tests = [_keyword_test(site, query, pages, inbound) for query in queries]
    actions = {}
    # Ignore informational observations that are not defects (e.g. optional
    # llms.txt absence). Data-connection dependencies belong in another section.
    observed = list(site.get("issues", [])) + [issue for page in pages.values() for issue in page.get("issues", [])]
    for issue in observed:
        if issue.get("severity") not in ("critical", "warning"):
            continue
        code, url = issue.get("code", "unknown"), issue.get("url", site.get("origin", ORIGIN))
        known = code != "page-http" or pages.get(url, {}).get("status") is not None
        item = _action(code, url, issue["severity"], {"observation": issue.get("message", ""), "http_status": pages.get(url, {}).get("status")}, known=known)
        actions[item["id"]] = item
    for test in tests:
        for check in test["checks"]:
            if check["status"] != "failed":
                continue
            code = {"approved_target": "keyword-approved-target", "sitemap": "keyword-sitemap", "language": "keyword-target-language", "internal_entry": "keyword-internal-entry"}.get(check["name"])
            if not code:
                continue  # Core collector already records HTTP/canonical/noindex/robots failures.
            item = _action(code, test["target_url"] or str(test.get("id")), "warning", check["evidence"])
            actions[item["id"]] = item
    for url, page in pages.items():
        if url not in (ORIGIN + "/about/", ORIGIN + "/fr/about/") or page.get("status") != 200:
            continue
        description = page.get("description", "")
        if len(description) <= 200:
            continue
        code = "shorten-about-description"
        item = {"id": f"{code}:{url}", "code": code, "url": url, "priority": "info",
                "evidence": {"observed_description_length": len(description), "observed_description": description},
                "action": "将介绍页摘要与可见导语分开，使用依据现有业务内容撰写的简洁摘要。",
                "probe": "比较 metadata / OG / Twitter / Schema 描述，并确认可见正文、canonical 与语言互链不变。",
                "status": "optimization_candidate", "requires_change": False,
                "suggested_description": ABOUT_DESCRIPTIONS.get(page.get("lang")),
                "caveat": "可选的摘要展示优化；字符长度不是 Google 硬性限制，测试通过也不证明排名提升。"}
        actions[item["id"]] = item
    values = sorted(actions.values(), key=lambda item: ({"critical": 0, "warning": 1, "info": 2}.get(item["priority"], 3), item["id"]))
    return {"keyword_tests": tests, "actions": values,
            "summary": {"queries_tested": len(tests),
                        **{state: sum(item["on_site_status"] == state for item in tests) for state in ("passed", "failed", "unknown")},
                        "actions": len(values)}}
