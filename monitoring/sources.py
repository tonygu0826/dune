"""Optional read-only search measurements; absence is never reported as zero.

The caller is responsible for private storage/delivery. This module does not print,
write files, send email, or enable any source when its credential is absent.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import json
import math
import os
import re
from typing import Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener
from zoneinfo import ZoneInfo

SITE = "https://energydune.com/"
READ_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
MAX_RESPONSE = 1_000_000
TIMEOUT = 20


class SourceError(Exception):
    """Only a fixed, non-sensitive code may leave a provider boundary."""

    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def _windows(now: datetime) -> tuple[dict, dict]:
    end = now.astimezone(ZoneInfo("America/Los_Angeles")).date() - timedelta(days=3)
    start = end - timedelta(days=6)
    current = {"start": start.isoformat(), "end": end.isoformat(),
               "timezone": "America/Los_Angeles", "requested_days": 7}
    previous = {"start": (start - timedelta(days=7)).isoformat(),
                "end": (end - timedelta(days=7)).isoformat(),
                "timezone": "America/Los_Angeles", "requested_days": 7}
    return current, previous


def _number(value: object, *, nonnegative: bool = True) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise SourceError("invalid_metric_shape")
    result = float(value)
    if not math.isfinite(result) or (nonnegative and result < 0):
        raise SourceError("invalid_metric_value")
    return result


def _aggregate(rows: list[dict]) -> dict:
    clicks = sum(_number(row["clicks"]) for row in rows)
    impressions = sum(_number(row["impressions"]) for row in rows)
    positioned = [row for row in rows if row.get("position") is not None and row["impressions"] > 0]
    positioned_impressions = sum(row["impressions"] for row in positioned)
    # A missing position must not silently become zero or a complete average.
    complete_positions = positioned_impressions == impressions and impressions > 0
    position = (sum(_number(row["position"]) * row["impressions"] for row in positioned)
                / impressions) if complete_positions else None
    return {"clicks": clicks, "impressions": impressions,
            "ctr": clicks / impressions if impressions else None,
            "average_position": position}


def _parse_service_account(raw: str) -> dict:
    if len(raw.encode("utf-8")) > 64_000:
        raise SourceError("service_account_too_large")
    try:
        info = json.loads(raw)
    except (ValueError, TypeError):
        raise SourceError("invalid_service_account_json") from None
    if not isinstance(info, dict) or info.get("type") != "service_account":
        raise SourceError("invalid_service_account_type")
    # Service-account JSON can redirect refresh credentials. Restrict it before
    # passing anything to the Google auth library.
    if info.get("token_uri") != "https://oauth2.googleapis.com/token":
        raise SourceError("unapproved_google_token_endpoint")
    if info.get("universe_domain", "googleapis.com") != "googleapis.com":
        raise SourceError("unapproved_google_universe")
    if not isinstance(info.get("client_email"), str) or not isinstance(info.get("private_key"), str):
        raise SourceError("invalid_service_account_fields")
    return info


def _make_google_session(info: dict):
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import AuthorizedSession
    except ImportError:
        raise SourceError("google_auth_dependency_missing") from None
    try:
        credentials = service_account.Credentials.from_service_account_info(
            info, scopes=[READ_SCOPE], always_use_jwt_access=False)
        return AuthorizedSession(credentials)
    except Exception:
        raise SourceError("google_auth_configuration_failed") from None


def _google_query(session, window: dict, country: str) -> dict:
    endpoint = ("https://www.googleapis.com/webmasters/v3/sites/"
                + quote(SITE, safe="") + "/searchAnalytics/query")
    payload = {"startDate": window["start"], "endDate": window["end"],
               "type": "web", "dataState": "final", "rowLimit": 1,
               "dimensionFilterGroups": [{"groupType": "and", "filters": [
                   {"dimension": "country", "operator": "equals", "expression": country}
               ]}]}
    response = None
    try:
        response = session.post(endpoint, json=payload, timeout=TIMEOUT,
                                allow_redirects=False, stream=True)
        if response.status_code != 200:
            raise SourceError("google_api_http_" + str(int(response.status_code)))
        chunks = []
        size = 0
        for chunk in response.iter_content(chunk_size=16_384):
            size += len(chunk)
            if size > MAX_RESPONSE:
                raise SourceError("google_response_too_large")
            chunks.append(chunk)
        data = json.loads(b"".join(chunks))
        rows = data.get("rows", []) if isinstance(data, dict) else None
        if not isinstance(rows, list) or len(rows) > 1:
            raise SourceError("google_invalid_response")
        if not rows:
            return {"clicks": 0.0, "impressions": 0.0, "position": None}
        row = rows[0]
        if not isinstance(row, dict):
            raise SourceError("google_invalid_response")
        return {"clicks": _number(row["clicks"]),
                "impressions": _number(row["impressions"]),
                "position": _number(row["position"]) if "position" in row else None}
    except SourceError:
        raise
    except Exception:
        # Do not expose URLs, refresh payloads, response bodies or key material.
        raise SourceError("google_request_failed") from None
    finally:
        if response is not None:
            try:
                response.close()
            except Exception:
                pass


def _google(raw: str | None, current: dict, previous: dict) -> dict:
    base = {"provider": "Google Search Console", "property": SITE,
            "data_window": current, "comparison_window": previous,
            "scope": "Web search, United States and Canada; API average positions, not live SERP ranks",
            "caveats": ["The window ends three Pacific calendar days before collection to reduce reporting lag.",
                        "Final data is requested; recent data may still be unavailable or revised.",
                        "Country filters do not identify the language of a search query.",
                        "Search Console totals are not a separate AI citation measurement."]}
    if not raw:
        return {**base, "status": "not_connected", "reason": "service_account_not_configured"}
    session = None
    try:
        session = _make_google_session(_parse_service_account(raw))
        breakdown = []
        for country in ("usa", "can"):
            this = _google_query(session, current, country)
            before = _google_query(session, previous, country)
            breakdown.append({"country": country,
                              "current": _aggregate([this]), "previous": _aggregate([before])})
        def combined(period: str) -> dict:
            return _aggregate([{"clicks": row[period]["clicks"],
                                "impressions": row[period]["impressions"],
                                "position": row[period]["average_position"]} for row in breakdown])
        return {**base, "status": "ok", "metrics": {"current": combined("current"),
                                                        "previous": combined("previous")},
                "country_breakdown": breakdown, "position_unit": "one-based average position",
                "ctr_unit": "fraction, 0 to 1"}
    except SourceError as error:
        return {**base, "status": "error", "reason": error.code}
    except Exception:
        return {**base, "status": "error", "reason": "google_collection_failed"}
    finally:
        if session is not None:
            try:
                session.close()
            except Exception:
                pass


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise SourceError("bing_redirect_refused")


def _bing_fetch(key: str) -> list[dict]:
    # The official Bing API authenticates this read-only method with a URL key.
    # Never log the URL, Request, HTTPError, or any body returned by this API.
    endpoint = "https://ssl.bing.com/webmaster/api.svc/json/GetRankAndTrafficStats?"
    url = endpoint + urlencode({"siteUrl": SITE, "apikey": key})
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "DUNE-Daily-Search-Report/1.0"})
    try:
        with build_opener(_NoRedirect()).open(request, timeout=TIMEOUT) as response:
            body = response.read(MAX_RESPONSE + 1)
            if len(body) > MAX_RESPONSE:
                raise SourceError("bing_response_too_large")
        data = json.loads(body)
        rows = data.get("d") if isinstance(data, dict) else None
        if not isinstance(rows, list) or len(rows) > 10_000:
            raise SourceError("bing_invalid_response")
        return rows
    except SourceError:
        raise
    except HTTPError as error:
        raise SourceError("bing_api_http_" + str(int(error.code))) from None
    except (URLError, ValueError, OSError):
        raise SourceError("bing_request_failed") from None


def _bing_date(value: object) -> date:
    if not isinstance(value, str):
        raise SourceError("bing_invalid_date")
    match = re.fullmatch(r"/Date\((-?\d+)(?:[+-]\d{4})?\)/", value)
    try:
        if match:
            return datetime.fromtimestamp(int(match.group(1)) / 1000, tz=timezone.utc).date()
        # Some client/API revisions expose ISO dates. Keep explicit UTC handling.
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except (ValueError, OverflowError, OSError):
        raise SourceError("bing_invalid_date") from None


def _bing(key: str | None, current: dict, previous: dict) -> dict:
    base = {"provider": "Bing Webmaster Tools", "property": SITE,
            "data_window": current, "comparison_window": previous,
            "scope": "Available daily site-wide traffic, all countries and languages; not regional live SERP ranks",
            "caveats": ["This API method has no US/Canada or query-language filter.",
                        "DotNet date timestamps are interpreted as UTC calendar dates; reporting timezone is not independently verified.",
                        "Window boundaries use Pacific calendar dates, ending three days before collection.",
                        "Missing daily rows are unobserved days, not confirmed zero traffic.",
                        "Bing webmaster traffic is not a measurement of Copilot citations."]}
    if not key:
        return {**base, "status": "not_connected", "reason": "api_key_not_configured"}
    if len(key) > 8192 or any(ord(char) < 32 for char in key):
        return {**base, "status": "error", "reason": "invalid_bing_key_format"}
    try:
        records = _bing_fetch(key)
        periods = {"current": [], "previous": []}
        coverage = {"current": set(), "previous": set()}
        for row in records:
            if not isinstance(row, dict):
                raise SourceError("bing_invalid_response")
            day = _bing_date(row.get("Date")).isoformat()
            for period, window in (("current", current), ("previous", previous)):
                if window["start"] <= day <= window["end"]:
                    if day in coverage[period]:
                        raise SourceError("bing_duplicate_daily_row")
                    coverage[period].add(day)
                    # AvgImpressionPosition is provider-defined; no fabricated
                    # conversion to Google-style one-based positions is made.
                    position = row.get("AvgImpressionPosition")
                    periods[period].append({"clicks": _number(row["Clicks"]),
                                             "impressions": _number(row["Impressions"]),
                                             "position": _number(position) if position is not None else None})
        if not periods["current"]:
            return {**base, "status": "not_measured", "reason": "bing_no_daily_rows_in_window"}
        metrics = {period: _aggregate(rows) if rows else None for period, rows in periods.items()}
        return {**base, "status": "ok", "metrics": metrics,
                "coverage": {period: {"observed_days": len(days), "dates": sorted(days),
                                       "complete": len(days) == 7} for period, days in coverage.items()},
                "position_unit": "Bing API AvgImpressionPosition, impression-weighted; provider convention retained",
                "ctr_unit": "fraction, 0 to 1"}
    except SourceError as error:
        return {**base, "status": "error", "reason": error.code}
    except Exception:
        return {**base, "status": "error", "reason": "bing_collection_failed"}


def collect_sources(*, now: datetime | None = None, environ: Mapping[str, str] | None = None) -> dict:
    """Return optional private metrics; never claim AI citation observations.

    Only the named GSC/Bing variables enable their corresponding provider. No
    paid search/AI API, browser session or unrelated account is used.
    """
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        raise ValueError("now must include a timezone")
    env = os.environ if environ is None else environ
    current, previous = _windows(now)
    return {"google": _google(env.get("GSC_SERVICE_ACCOUNT_JSON"), current, previous),
            "bing": _bing(env.get("BING_WEBMASTER_API_KEY"), current, previous),
            "ai": {"status": "not_measured", "reason": "no_authorized_live_answer_observation_source",
                   "platforms": ["ChatGPT search", "Google AI Mode/AI Overviews", "Gemini", "Copilot", "Perplexity"],
                   "caveats": ["Crawler access and llms.txt are readiness checks, not evidence of mentions or citations.",
                               "A consumer AI product's live answer cannot be inferred from a different model API.",
                               "No result is represented as zero citations without an actual recorded observation."]}}
