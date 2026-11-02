#!/usr/bin/env python3
"""Check publishing invariants across the generated bilingual static site."""
from pathlib import Path
import json
from urllib.parse import urlsplit, unquote
import xml.etree.ElementTree as ET
from lxml import html

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://energydune.com'
routes = json.loads((ROOT / 'site/routes.json').read_text())
by_path = {item['path']: item for item in routes}
assert len(by_path) == len(routes), 'Duplicate canonical route'
titles = set()
descriptions = set()


def target(path):
    return ROOT / (path.lstrip('/') + 'index.html' if path.endswith('/') else path.lstrip('/'))


for item in routes:
    path, language = item['path'], item['language']
    doc = html.parse(str(ROOT / item['file']))
    assert doc.getroot().get('lang') == language, path
    assert len(doc.xpath('//h1')) == 1, path
    assert doc.xpath('//link[@rel="canonical"]/@href') == [ORIGIN + path], path
    pairs = {node.get('hreflang'): node.get('href') for node in doc.xpath('//link[@rel="alternate"][@hreflang]')}
    assert pairs[language] == ORIGIN + path, path
    opposite = 'fr' if language == 'en' else 'en'
    assert pairs[opposite] == ORIGIN + item['alternate'], path
    assert by_path[item['alternate']]['alternate'] == path, path
    assert pairs['x-default'] == ORIGIN + (path if language == 'en' else item['alternate']), path
    title = doc.findtext('.//title')
    description = doc.xpath('//meta[@name="description"]/@content')[0]
    assert title and title not in titles, path
    assert description and description not in descriptions, path
    titles.add(title)
    descriptions.add(description)
    assert doc.xpath('//meta[@property="og:url"]/@content') == [ORIGIN + path], path
    assert not doc.xpath('//meta[@name="robots"][contains(@content,"noindex")]'), path
    graphs = [json.loads(text) for text in doc.xpath('//script[@type="application/ld+json"]/text()')]
    assert len(graphs) == 1, path
    graph = graphs[0]['@graph']
    ids = {node['@id'] for node in graph}
    assert {ORIGIN + '/#organization', ORIGIN + '/#website', ORIGIN + path + '#webpage'} <= ids, path
    organization = next(node for node in graph if node.get('@type') == 'Organization')
    assert organization['email'] == 'info@energydune.com', path
    assert not {'address', 'telephone', 'aggregateRating', 'review', 'sameAs'} & organization.keys(), path
    def walk(value):
        if isinstance(value, dict):
            assert not {'aggregateRating', 'review', 'price', 'priceCurrency', 'offers'} & value.keys(), path
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)
    walk(graph)
    for url in doc.xpath('//*[@href]/@href | //*[@src]/@src'):
        parts = urlsplit(url)
        if parts.scheme or parts.netloc or not parts.path.startswith('/'):
            continue
        dest = target(unquote(parts.path))
        assert dest.exists(), (path, url)
        if parts.fragment and dest.suffix == '.html':
            linked = html.parse(str(dest))
            assert linked.xpath('//*[@id=$identifier]', identifier=unquote(parts.fragment)), (path, url)

namespace = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
listed = [node.text for node in ET.parse(ROOT / 'sitemap.xml').findall('s:url/s:loc', namespace)]
assert set(listed) == {ORIGIN + path for path in by_path} and len(listed) == len(routes)
missing = html.parse(str(ROOT / '404.html'))
assert missing.xpath('//meta[@name="robots"][contains(@content,"noindex")]')
assert ORIGIN + '/sitemap.xml' in (ROOT / 'robots.txt').read_text()
assert 'OAI-SearchBot' in (ROOT / 'robots.txt').read_text()
assert '/fr/' in (ROOT / 'llms.txt').read_text()
print(f'Passed: {len(routes)} static documents, reciprocal languages, schemas, sitemap and internal targets.')
