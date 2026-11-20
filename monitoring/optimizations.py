"""Recheck deployed, source-backed changes without claiming traffic effects."""
from __future__ import annotations


def verify(site, records):
    pages = {page['url']: page for page in site.get('pages', [])}
    results = []
    for record in records:
        checks = []
        for target in record.get('targets', []):
            page = pages.get(target['url'])
            if not page or page.get('status') != 200:
                status, reason = 'unknown', '本轮未取得该页面的正常响应，不能判断优化是否保留。'
            elif {'html-parse', 'page-content-type'} & {issue.get('code') for issue in page.get('issues', [])}:
                status, reason = 'unknown', '本轮没有有效 HTML 元数据观测，不能判断优化是否保留。'
            elif page.get('description') != target['description']:
                status, reason = 'failed', '当前页面的搜索摘要与已验证的优化版本不同，需要核对变更。'
            elif not all(page.get('description_variants', {}).get(channel) == [target['description']] for channel in ('meta', 'og', 'twitter', 'schema')):
                status, reason = 'failed', '搜索、社交或 WebPage 结构化摘要未保持一致。'
            elif page.get('canonical') != target['url'] or page.get('lang') != target['language']:
                status, reason = 'failed', '摘要存在，但页面 canonical 或语言与预期不符。'
            else:
                status, reason = 'passed', '本轮实际 HTML 的搜索／OG／Twitter／WebPage 摘要、canonical 和语言与优化版本一致。'
            checks.append({'url': target['url'], 'status': status, 'reason': reason,
                           'description_characters': len(page['description']) if page and page.get('status') == 200 else None})
        status = 'failed' if any(item['status'] == 'failed' for item in checks) else 'unknown' if not checks or any(item['status'] == 'unknown' for item in checks) else 'passed'
        results.append({'id': record['id'], 'title': record['title'], 'published_at': record.get('published_at'),
                        'commit_url': record.get('commit_url'), 'status': status, 'checks': checks,
                        'deployment_checks': record.get('deployment_checks', {}),
                        'ranking_effect': 'not_measured', 'ai_citation_effect': 'not_measured'})
    return results
