import unittest
from http.client import IncompleteRead
from unittest.mock import patch
from monitoring.audit import _allowed, _fetch, _page, _sitemap, _SameOriginRedirect, _RobotsPolicy, collect_site, compare

ORIGIN = "https://energydune.com"


def resource(url, body, status=200, headers=None):
    return {"url": url, "status": status, "body": body, "headers": headers or {"content-type": "text/html; charset=utf-8"}, "error": None}


def document(lang="en", path="/", alternate="/fr/", robots="", schema='{"@type":"WebPage"}', text="Public company information"):
    targets = {"en": "/", "fr": "/fr/"}
    targets["fr" if lang == "en" else "en"] = alternate
    return ('<html lang="' + lang + '"><head><title>DUNE</title><meta name="description" content="Company">'
            '<link rel="canonical" href="' + ORIGIN + path + '">'
            + ''.join('<link rel="alternate" hreflang="' + key + '" href="' + ORIGIN + value + '">' for key, value in targets.items())
            + '<meta name="robots" content="' + robots + '"><script type="application/ld+json">' + schema + '</script>'
            '</head><body><h1>DUNE</h1><p>' + text + '</p><script>privatecode</script><span hidden>HIDDEN</span></body></html>')


class PageTests(unittest.TestCase):
    def test_public_text_and_schema(self):
        page = _page(resource(ORIGIN + "/", document()))
        self.assertEqual(page["issues"], [])
        self.assertEqual(page["schema_types"], ["WebPage"])
        self.assertEqual(page["visible_text_words"], 4)

    def test_http_failure(self):
        page = _page(resource(ORIGIN + "/", "", status=503))
        self.assertEqual(page["issues"][0]["code"], "page-http")
        self.assertIsNone(page["content_hash"])

    def test_canonical_noindex_invalid_schema(self):
        body = document(path="/wrong/", robots="noindex, follow", schema="{broken}")
        codes = {issue["code"] for issue in _page(resource(ORIGIN + "/", body))["issues"]}
        self.assertTrue({"canonical", "noindex", "invalid-jsonld"} <= codes)

    def test_xrobots_noindex(self):
        data = resource(ORIGIN + "/", document(), headers={"content-type": "text/html", "x-robots-tag": "googlebot: noindex"})
        self.assertIn("noindex", {item["code"] for item in _page(data)["issues"]})

    def test_scalar_schema_rejected(self):
        self.assertIn("invalid-jsonld", {issue["code"] for issue in _page(resource(ORIGIN + "/", document(schema="42")))["issues"]})

    def test_exact_origin_guard(self):
        for bad in ["http://energydune.com/", "https://energydune.com.evil.invalid/", "https://u:p@energydune.com/", "https://energydune.com/?x=1", "https://energydune.com/#mail", "https://energydune.com:444/"]:
            self.assertFalse(_allowed(bad, ORIGIN), bad)
        self.assertTrue(_allowed(ORIGIN + "/fr/", ORIGIN))
        with self.assertRaises(ValueError):
            _SameOriginRedirect(ORIGIN).redirect_request(None, None, 302, "redirect", {}, "https://example.com/")

    def test_sitemap_rejects_entities_and_cross_origin(self):
        urls, issues = _sitemap(resource(ORIGIN + "/sitemap.xml", '<!DOCTYPE x [<!ENTITY y "bad">]><urlset/>'), ORIGIN)
        self.assertFalse(urls)
        self.assertEqual(issues[0]["code"], "sitemap-unsafe-xml")
        body = '<urlset><url><loc>' + ORIGIN + '/</loc></url><url><loc>https://example.com/</loc></url><url><loc>' + ORIGIN + '/</loc></url></urlset>'
        urls, issues = _sitemap(resource(ORIGIN + "/sitemap.xml", body), ORIGIN)
        self.assertEqual(urls, [ORIGIN + "/"])
        self.assertEqual({issue["code"] for issue in issues}, {"sitemap-external-url", "sitemap-duplicate"})

    def test_partial_http_read_returns_sanitized_failure(self):
        response = unittest.mock.MagicMock()
        response.__enter__.return_value = response
        response.read.side_effect = IncompleteRead(b"PRIVATE-PARTIAL-BODY", 42)
        opener = unittest.mock.Mock()
        opener.open.return_value = response
        with patch("monitoring.audit.build_opener", return_value=opener):
            result = _fetch(ORIGIN + "/", ORIGIN)
        self.assertIsNone(result["status"])
        self.assertEqual(result["body"], "")
        self.assertEqual(result["error"], "IncompleteRead: public GET failed")
        self.assertNotIn("PRIVATE", str(result))


class RobotsPolicyTests(unittest.TestCase):
    def test_longer_rule_wins_in_both_file_orders(self):
        for rules in ("Disallow: /\nAllow: /fr/", "Allow: /fr/\nDisallow: /"):
            policy = _RobotsPolicy("User-agent: *\n" + rules)
            self.assertTrue(policy.can_fetch("Googlebot", ORIGIN + "/fr/"))
            self.assertFalse(policy.can_fetch("Googlebot", ORIGIN + "/"))
        policy = _RobotsPolicy("User-agent: *\nAllow: /\nDisallow: /fr/")
        self.assertFalse(policy.can_fetch("Googlebot", ORIGIN + "/fr/"))
        self.assertTrue(policy.can_fetch("Googlebot", ORIGIN + "/"))

    def test_allow_wins_tie_independently_of_order(self):
        for rules in ("Disallow: /fr/\nAllow: /fr/", "Allow: /fr/\nDisallow: /fr/"):
            self.assertTrue(_RobotsPolicy("User-agent: *\n" + rules).can_fetch("Googlebot", ORIGIN + "/fr/"))

    def test_most_specific_agent_and_combined_matching_groups(self):
        policy = _RobotsPolicy("User-agent: *\nDisallow: /\n\nUser-agent: OAI\nDisallow: /fr/\n\nUser-agent: oai-searchbot\nAllow: /fr/\n\nUser-agent: OAI-SearchBot\nDisallow: /private/\n")
        self.assertTrue(policy.can_fetch("OAI-SearchBot", ORIGIN + "/fr/"))
        self.assertFalse(policy.can_fetch("OAI-SearchBot", ORIGIN + "/private/"))
        self.assertFalse(policy.can_fetch("Googlebot", ORIGIN + "/"))

    def test_multiple_agents_share_rules_and_empty_rule_is_no_restriction(self):
        policy = _RobotsPolicy("User-agent: Googlebot\nUser-agent: Bingbot\nDisallow: /fr/\n\nUser-agent: *\nDisallow:\n")
        self.assertFalse(policy.can_fetch("Googlebot", ORIGIN + "/fr/"))
        self.assertFalse(policy.can_fetch("Bingbot", ORIGIN + "/fr/"))
        self.assertTrue(policy.can_fetch("PerplexityBot", ORIGIN + "/fr/"))

    def test_wildcards_and_end_anchor(self):
        policy = _RobotsPolicy("User-agent: *\nDisallow: /*.pdf$\nAllow: /public/*.pdf$\n")
        self.assertFalse(policy.can_fetch("Googlebot", ORIGIN + "/private/catalogue.pdf"))
        self.assertTrue(policy.can_fetch("Googlebot", ORIGIN + "/private/catalogue.pdf.html"))
        self.assertTrue(policy.can_fetch("Googlebot", ORIGIN + "/public/catalogue.pdf"))

    def test_percent_encoded_unreserved_reserved_and_utf8_octets(self):
        policy = _RobotsPolicy("User-agent: *\nDisallow: /%66r/\nDisallow: /café/\nDisallow: /encoded%2fpath/\nDisallow: /literal%2A/\n")
        for path in ("/fr/", "/%66r/", "/caf%C3%A9/", "/café/", "/encoded%2Fpath/", "/literal%2a/"):
            self.assertFalse(policy.can_fetch("Googlebot", ORIGIN + path), path)
        for path in ("/encoded/path/", "/literalanything/", "/FR/"):
            self.assertTrue(policy.can_fetch("Googlebot", ORIGIN + path), path)

    def test_wildcard_does_not_match_inside_an_encoded_octet(self):
        policy = _RobotsPolicy("User-agent: *\nDisallow: /*2F/private/\n")
        self.assertTrue(policy.can_fetch("Googlebot", ORIGIN + "/%2F/private/"))

    def test_longest_octet_priority_after_percent_normalization(self):
        policy = _RobotsPolicy("User-agent: *\nDisallow: /%66%72/\nAllow: /fr/open/\n")
        self.assertTrue(policy.can_fetch("Googlebot", ORIGIN + "/fr/open/"))
        self.assertFalse(policy.can_fetch("Googlebot", ORIGIN + "/fr/closed/"))


class CollectionTests(unittest.TestCase):
    def collect(self, robots="User-agent: *\nAllow: /", robots_status=200, fr=None, sitemap_status=200):
        sitemap = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' + ORIGIN + '/</loc></url><url><loc>' + ORIGIN + '/fr/</loc></url></urlset>'
        docs = {ORIGIN + "/robots.txt": resource(ORIGIN + "/robots.txt", robots, robots_status),
                ORIGIN + "/sitemap.xml": resource(ORIGIN + "/sitemap.xml", sitemap, sitemap_status),
                ORIGIN + "/llms.txt": resource(ORIGIN + "/llms.txt", "# DUNE"),
                ORIGIN + "/": resource(ORIGIN + "/", document()),
                ORIGIN + "/fr/": resource(ORIGIN + "/fr/", fr or document(lang="fr", path="/fr/", alternate="/"))}
        with patch("monitoring.audit._fetch", side_effect=lambda url, origin: docs[url]):
            return collect_site()

    def test_live_scope_is_mechanical_and_reciprocal(self):
        result = self.collect()
        self.assertTrue(result["summary"]["healthy"])
        self.assertEqual(result["summary"]["pages_checked"], 2)
        self.assertFalse({i["code"] for i in result["issues"]} & {"hreflang-reciprocity", "missing-hreflang"})
        self.assertNotIn("rank", result)

    def test_robots_blocks_and_missing_robots(self):
        blocked = self.collect(robots="User-agent: OAI-SearchBot\nDisallow: /\n\nUser-agent: *\nAllow: /")
        self.assertEqual(len(blocked["crawler_access"]["OAI-SearchBot"]["blocked"]), 2)
        self.assertEqual(len(blocked["crawler_access"]["Googlebot"]["allowed"]), 2)
        missing = self.collect(robots_status=404)
        self.assertEqual(len(missing["crawler_access"]["OAI-SearchBot"]["allowed"]), 2)
        failed = self.collect(robots_status=503)
        self.assertEqual(len(failed["crawler_access"]["OAI-SearchBot"]["unknown"]), 2)

    def test_reciprocity_failure(self):
        result = self.collect(fr=document(lang="fr", path="/fr/", alternate="/wrong/"))
        self.assertIn("hreflang-reciprocity", {i["code"] for i in result["issues"]})

    def test_content_and_issue_comparison(self):
        old = self.collect()
        new = self.collect(fr=document(lang="fr", path="/fr/", alternate="/", text="Changed public information", robots="noindex"))
        delta = compare(old, new)
        self.assertEqual(delta["changed_content"], [ORIGIN + "/fr/"])
        self.assertIn("noindex", {i["code"] for i in delta["new_issues"]})
        self.assertFalse(compare(None, new)["baseline_available"])
        self.assertEqual(compare(old, old)["changed_content"], [])

    def test_failed_sitemap_does_not_report_deleted_pages(self):
        old = self.collect()
        failed = self.collect(sitemap_status=503)
        self.assertFalse(failed["summary"]["healthy"])
        self.assertFalse(compare(old, failed)["page_list_comparable"])
        self.assertEqual(compare(old, failed)["removed_urls"], [])
        self.assertIsNone(failed["summary"]["pages_expected"])

    def test_unknown_robots_is_not_resolution_of_prior_block(self):
        old = self.collect(robots="User-agent: *\nDisallow: /fr/")
        failed = self.collect(robots_status=503)
        delta = compare(old, failed)
        self.assertTrue(delta["page_list_comparable"])
        self.assertFalse(any(item["code"].startswith("robots-block-") for item in delta["resolved_issues"]))
        cleared = self.collect(robots_status=404)
        self.assertTrue(any(item["code"].startswith("robots-block-") for item in compare(old, cleared)["resolved_issues"]))

    def test_malformed_sitemap_and_failed_page_do_not_resolve_findings(self):
        old = self.collect(fr=document(lang="fr", path="/fr/", alternate="/", robots="noindex"))
        failed = self.collect()
        failed["summary"]["sitemap_valid"] = False
        self.assertFalse(compare(old, failed)["page_list_comparable"])
        self.assertEqual(compare(old, failed)["resolved_issues"], [])
        failed["summary"]["sitemap_valid"] = True
        failed["pages"][1]["status"] = 503
        self.assertNotIn("noindex", {i["code"] for i in compare(old, failed)["resolved_issues"]})


if __name__ == "__main__":
    unittest.main()
