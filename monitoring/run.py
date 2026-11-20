#!/usr/bin/env python3
"""Read-only daily DUNE observations; missing search data stays unmeasured."""
from __future__ import annotations

import argparse
import csv
import json
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from audit import collect_site, compare
from actions import evaluate
from optimizations import verify as verify_optimizations

ROOT = Path(__file__).resolve().parent
ZONE = ZoneInfo("America/Toronto")


def measurement_status():
    return {
        "google": {"status": "not_measured", "reason": "Google Search Console 只读数据尚未接入；站点验证成功不代表已取得统计数据。"},
        "bing": {"status": "not_measured", "reason": "Bing Webmaster Tools 只读数据尚未接入。"},
        "ai": {"status": "not_measured", "reason": "未取得实际联网 AI 答案及引用证据；爬虫放行不等于被引用。",
               "platforms": ["ChatGPT Search", "Google AI Mode / Gemini", "Microsoft Copilot", "Perplexity"]},
    }


def safe_text(value):
    return str(value).replace("|", "\\|").replace("\n", " ").replace("\r", " ").replace("<", "&lt;").replace(">", "&gt;")


def render(data):
    site, delta, sources = data["technical"], data["changes"], data["search_sources"]
    summary = site["summary"]
    state = "发现需处理的问题" if summary["critical"] else "本次未发现技术阻断"
    coverage = f"站点地图无有效结果；仅完成 {summary['pages_checked']} 个页面的回退检查，不能判定全站状态" if summary.get("fallback_page_only") else f"预期 {summary['pages_expected']}，已检查 {summary['pages_checked']}，HTTP 成功 {summary['http_ok']}"
    lines = [
        f"# DUNE SEO / GEO 日报 · {data['report_date']}", "",
        f"网站：https://energydune.com/　｜　采集：{data['generated_at']}（多伦多）", "",
        f"**{state}。实际搜索排名与 AI 引用：尚未测量。**", "",
        "美国 / 加拿大；英文 / 法文。报告只反映注明范围内的实际观测。", "",
        "## 今日技术检查", "",
        "| 项目 | 观测 |", "| --- | --- |",
        f"| 站点地图页面 | {coverage} |",
        f"| 技术问题 | 严重 {summary['critical']}；警告 {summary['warning']}；信息 {summary['info']} |",
        "| 检查范围 | HTTP、robots、sitemap、静态正文、canonical、hreflang、JSON-LD、AI 搜索爬虫权限 |", "",
        "## 搜索与 AI 引用", "",
        "| 数据源 | 状态 |", "| --- | --- |",
    ]
    for label, key in [("Google", "google"), ("Bing", "bing"), ("AI 实际答案与引用", "ai")]:
        item = sources[key]
        lines.append(f"| {label} | {safe_text(item.get('reason', item['status']))} |")
    lines += ["", "没有数据不计为零，也不推断未收录、无排名或未被 AI 推荐。Search Console 平均位置与实时搜索结果位置不同；实际统计通常有延迟。", "", "## 与上次成功保存的快照比较", ""]
    if delta["baseline_available"]:
        for key, label in [("added_urls", "新增页面"), ("removed_urls", "移除页面"), ("changed_content", "正文变化"), ("changed_metadata", "标题／摘要等元数据变化"), ("new_issues", "新增问题"), ("resolved_issues", "已消失问题")]:
            lines.append(f"- {label}：{len(delta.get(key, []))}")
        lines.append("\n比较对象是可用的最近快照；报告注明基线日期，缺少某天时不称为严格昨日对比。")
        lines.append(f"基线采集时间：{safe_text(data.get('baseline_checked_at', '未知'))}")
    else:
        lines.append("首轮或历史快照不可用，已建立基线；本次不声称发生上升、下降或变化。")
    lines += ["", "## 爬虫访问权限", "", "| 搜索爬虫 | 允许 / 阻止 / 未知（URL 数） |", "| --- | --- |"]
    for bot, status in site.get("crawler_access", {}).items():
        lines.append(f"| {safe_text(bot)} | {len(status['allowed'])} / {len(status['blocked'])} / {len(status['unknown'])} |")
    lines += ["", "此处只检验 robots 规则，不证明平台实际访问、收录或引用。llms.txt 是可选辅助文件，并非搜索引擎排名要求。", "", "## 建议与执行状态", ""]
    plan = data.get("action_plan", {"actions": [], "keyword_tests": [], "summary": {}})
    actions = plan["actions"]
    status_labels = {"tested_failure": "检查确认需处理", "not_verified": "本轮无法验证", "optimization_candidate": "有依据的优化候选", "candidate": "优化候选"}
    for action in actions[:30]:
        lines.append(f"- **{safe_text(status_labels.get(action['status'], action['status']))}** `{safe_text(action['code'])}` — {safe_text(action['url'])}")
        lines.append(f"  - 依据：{safe_text(action['evidence'])}")
        lines.append(f"  - 操作：{safe_text(action['action'])}")
        lines.append(f"  - 验证：{safe_text(action['probe'])}")
    if not actions:
        lines.append("本轮已执行的检查没有产生需修复事项，不添加固定待办。数据源未接入的限制单列在上面的搜索数据状态中。")
    if len(actions) > 30:
        lines.append(f"其余 {len(actions)-30} 项详见同批 JSON。")
    optimizations = data.get("optimization_checks", [])
    if optimizations:
        lines += ["", "## 已实施优化与当前复测", "", "| 优化 | 本轮复测 | 证据 |", "| --- | --- | --- |"]
        labels = {"passed": "通过", "failed": "发现差异，需核对", "unknown": "本轮无法验证"}
        commit_notes = []
        for item in optimizations:
            target_lengths = "; ".join(f"{check['url']}：{check['description_characters']} 字符" for check in item['checks'] if check['description_characters'] is not None)
            lines.append(f"| {safe_text(item['title'])} | {labels[item['status']]} | {safe_text(target_lengths)} |")
            if item.get("commit_url"):
                commit_notes.append(f"实施记录：[发布提交]({item['commit_url']})。")
        lines += [''] + commit_notes
        lines.append("\n复测通过只确认修改已在实际 HTML 生效；排名、流量和 AI 引用的改善尚未测量。")
    lines += ["", "## 关键词对应页面自动测试", "",
              "优先词：`lubricants`、`lubrifiants`；采购词与品牌词分别记录。每次自动检验目标页、语言、canonical、noindex、爬虫权限和内部入口。主题词只作为线索，不强行插入整条搜索词。", "",
              "| 查询 | 目标页 | 站内检测 | 实际排名 / AI 引用 |", "| --- | --- | --- | --- |"]
    labels = {"passed": "通过", "failed": "发现问题", "unknown": "无法判定"}
    for item in plan['keyword_tests']:
        lines.append(f"| {safe_text(item['query'])} | {safe_text(item['target_url'])} | {labels[item['on_site_status']]} | 未测 / 未测 |")
    lines += ["", "站内测试通过不等于搜索排名或 AI 推荐。每项检查的证据、失败原因和内部入口见 JSON。", "",
              "每日流程只读测试并生成处理建议；网站优化的发布与复测单独留存记录，不会自动编造产品事实或购买监测服务。", ""]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("reports"))
    parser.add_argument("--baseline", type=Path)
    parser.add_argument("--private-metrics", action="store_true", help="Opt in to authorized APIs; private JSON is never included in the public report.")
    parser.add_argument("--private-output", type=Path)
    args = parser.parse_args()
    if args.private_metrics and not args.private_output:
        parser.error("--private-metrics requires --private-output outside the public report folder")
    if args.private_metrics and (args.output.resolve() == args.private_output.resolve() or args.output.resolve() in args.private_output.resolve().parents):
        parser.error("Private metrics must be outside the public report folder")
    previous = None
    if args.baseline and args.baseline.is_file() and args.baseline.stat().st_size <= 2_000_000:
        try:
            saved = json.loads(args.baseline.read_text())
            candidate = saved.get("technical", saved)
            if candidate.get("origin") == "https://energydune.com" and isinstance(candidate.get("pages"), list):
                previous = candidate
        except (ValueError, OSError, AttributeError, TypeError):
            pass
    now = datetime.now(ZONE)
    try:
        site = collect_site()
    except Exception:
        # Even an unexpected collector failure must leave a dated report.
        # Do not copy exceptions, proxy configuration or response bodies to logs.
        site = {
            "origin": "https://energydune.com", "checked_at": now.isoformat(),
            "scope": "Collection failed; no website or search health conclusion is available",
            "resources": {}, "pages": [], "crawler_access": {},
            "issues": [{"code": "collector-failed", "severity": "critical", "message": "公开页面采集未完成；本轮状态未知，需检查任务运行。"}],
            "summary": {"pages_expected": 0, "pages_checked": 0, "http_ok": 0, "critical": 1, "warning": 0, "info": 0,
                        "healthy": False, "sitemap_valid": False, "fallback_page_only": True},
        }
    with (ROOT / "queries.csv").open(newline="", encoding="utf-8") as stream:
        queries = list(csv.DictReader(stream))
    data = {
        "version": 1, "report_date": now.date().isoformat(), "generated_at": now.isoformat(),
        "timezone": "America/Toronto", "technical": site,
        "changes": compare(previous, site), "baseline_checked_at": previous.get("checked_at") if previous else None,
        "search_sources": measurement_status(), "queries": queries,
        "action_plan": evaluate(site, queries),
        "optimization_checks": verify_optimizations(site, json.loads((ROOT / 'optimization-log.json').read_text()) if (ROOT / 'optimization-log.json').exists() else []),
        "delivery": {"daily_generation": "GitHub Actions", "automatic_codex_delivery": "not_configured"},
    }
    for result in data['optimization_checks']:
        for check in result['checks']:
            if check['status'] == 'passed':
                continue
            data['action_plan']['actions'].append({
                'id': result['id'] + ':' + check['url'], 'code': 'optimization-recheck',
                'url': check['url'], 'priority': 'warning', 'evidence': check['reason'],
                'action': '核对已实施优化与当前版本的差异；有意更新时同步实施记录，异常变化时修复源模板后重新验证。',
                'probe': '重新读取原始 HTML，比较 meta／OG／Twitter／WebPage 摘要、canonical 与语言。',
                'status': 'tested_failure' if check['status'] == 'failed' else 'not_verified',
                'requires_change': check['status'] == 'failed',
            })
    data['action_plan']['summary']['actions'] = len(data['action_plan']['actions'])
    if args.private_metrics:
        from sources import collect_sources
        private = collect_sources()
        args.private_output.mkdir(parents=True, exist_ok=True, mode=0o700)
        private_file = args.private_output / "search-metrics.json"
        private_file.write_text(json.dumps(private, ensure_ascii=False, indent=2) + "\n")
        private_file.chmod(0o600)
        # Intentionally keep all API-derived values out of public Markdown/JSON and logs.
        for key in ("google", "bing"):
            status = private[key]["status"]
            label = {"ok": "采集成功", "not_connected": "未配置数据源", "error": "采集失败"}.get(status, "采集结果待核对")
            data["search_sources"][key] = {"status": status, "reason": f"私有模式：{label}。详细结果仅保存在私有目录；本公开报告不包含统计数据。"}
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "daily-result.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    markdown = render(data)
    (args.output / "daily-report.md").write_text(markdown)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as stream:
            stream.write(markdown)
    print(f"Daily public report saved: {args.output / 'daily-report.md'}")
    print(f"Technical observations: {site['summary']['pages_checked']} pages; critical={site['summary']['critical']}, warning={site['summary']['warning']}. Search/AI data is not inferred.")
    failed = (site["summary"]["critical"] or data['action_plan']['summary'].get('failed', 0)
              or any(item['status'] == 'failed' for item in data['optimization_checks']))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
