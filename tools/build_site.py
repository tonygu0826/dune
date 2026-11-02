#!/usr/bin/env python3
"""Build crawlable EN/FR documents. No client-side rendering is required for content."""
from __future__ import annotations

import argparse
import hashlib
from html import escape
import json
from pathlib import Path
import re
from urllib.parse import urlencode
import xml.etree.ElementTree as ET

from lxml import html, etree

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'site/config.json').read_text())
COPY = json.loads((ROOT / 'site/ui-copy.json').read_text())
CONTENT = json.loads((ROOT / 'site/content.json').read_text())
PILLAR = json.loads((ROOT / 'site/pillar.json').read_text())
ORIGIN = CONFIG['origin']
VERSION = CONFIG['cache_version']
UPDATED = CONFIG['updated']
OUTPUTS: dict[str, str] = {}
ROUTES: list[dict] = []
LANGUAGES = ['en', 'fr']
UI = {
    'en': dict(home='Home', products='Products', guide='Selection guide', about='About DUNE', enquiry='Send an enquiry', resources='Product information', all_products='Explore all product categories', applications='Applications', checklist='What to include in your enquiry', questions='Common questions', references='Technical references', related='Related information', specifications='Product specifications and availability are confirmed by quotation.', brand='Brand names identify requested products, not authorised distribution.', updated='Updated 2 November 2026', summary='At a glance', contact='Contact', process='From requirements to quotation', facts='Company information', language='Read this page in French', reference_note='References explain industry terminology. They do not establish the specification, approval or availability of an individual product.'),
    'fr': dict(home='Accueil', products='Produits', guide='Guide de sélection', about='À propos de DUNE', enquiry='Envoyer une demande', resources='Informations produits', all_products='Voir toutes les catégories', applications='Applications', checklist='Renseignements à joindre à votre demande', questions='Questions fréquentes', references='Références techniques', related='Informations connexes', specifications='Les spécifications et la disponibilité des produits sont confirmées par devis.', brand='Les marques identifient les produits demandés et n’impliquent pas de distribution agréée.', updated='Mis à jour le 2 novembre 2026', summary='En bref', contact='Contact', process='Des besoins au devis', facts='Informations sur l’entreprise', language='Read this page in English', reference_note='Ces références expliquent les termes du secteur. Elles ne confirment ni les spécifications, ni les homologations, ni la disponibilité d’un produit donné.'),
}


def e(value):
    return escape(str(value), quote=True)


def absolute(path):
    return ORIGIN + path


def prefix(lang):
    return '/fr' if lang == 'fr' else ''


def home(lang):
    return prefix(lang) + '/'


def mail(lang, category=None):
    path = prefix(lang) + '/mail/'
    return path + ('?' + urlencode({'category': category}) if category else '')


def route(page, lang):
    if page['id'] == 'lubricants':
        return '/fr/lubrifiants/' if lang == 'fr' else '/lubricants/'
    if page['id'] == 'lubricant-selection':
        return prefix(lang) + '/guides/lubricant-selection/'
    return prefix(lang) + '/products/' + page['slugs'][lang] + '/'


def file_for(path):
    return path.lstrip('/') + 'index.html' if path.endswith('/') else path.lstrip('/')


PAGES = CONTENT['pages']
CATEGORIES = [p for p in PAGES if p['id'] != 'lubricant-selection']
GUIDE = next(p for p in PAGES if p['id'] == 'lubricant-selection')
SOURCES = {s['id']: s for s in CONTENT['sources']}


def organization():
    return {
        '@type': 'Organization', '@id': absolute('/#organization'),
        'name': CONFIG['name'], 'legalName': CONFIG['legal_name'], 'url': absolute('/'),
        'email': CONFIG['email'],
        'description': 'Energy products and multi-brand lubricants for automotive, commercial vehicle and industrial applications. Availability and specifications confirmed by quotation.',
        'logo': {'@type': 'ImageObject', '@id': absolute('/#logo'), 'url': absolute('/assets/dune-logo.svg'), 'width': 520, 'height': 180},
        'contactPoint': {'@type': 'ContactPoint', 'contactType': 'sales enquiries', 'email': CONFIG['email'], 'availableLanguage': ['English', 'French']},
    }


def schema(path, lang, title, description, kind='WebPage', crumbs=None, extra=None):
    url = absolute(path)
    page = {'@type': kind, '@id': url + '#webpage', 'url': url, 'name': title, 'description': description, 'inLanguage': lang, 'isPartOf': {'@id': absolute('/#website')}, 'publisher': {'@id': absolute('/#organization')}}
    graph = [organization(), {'@type': 'WebSite', '@id': absolute('/#website'), 'url': absolute('/'), 'name': CONFIG['name'], 'inLanguage': ['en', 'fr'], 'publisher': {'@id': absolute('/#organization')}}, page]
    if crumbs:
        page['breadcrumb'] = {'@id': url + '#breadcrumb'}
        graph.append({'@type': 'BreadcrumbList', '@id': url + '#breadcrumb', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': label, 'item': absolute(href)} for i, (label, href) in enumerate(crumbs)]})
    if extra:
        page.update(extra)
    return {'@context': 'https://schema.org', '@graph': graph}


def head(path, other, lang, title, description, structured, css=('styles.css', 'seo.css'), script=False, endpoint=False, index=True):
    tags = [
        '<meta charset="UTF-8">', '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<meta name="theme-color" content="#092C34">',
        f'<title>{e(title)}</title>', f'<meta name="description" content="{e(description)}">',
        f'<meta name="robots" content="{"index,follow,max-image-preview:large" if index else "noindex,follow"}">',
        f'<link rel="canonical" href="{e(absolute(path))}">',
    ]
    if path == '/':
        verification = CONFIG.get('search_verification', {})
        for provider, name in [('google', 'google-site-verification'), ('bing', 'msvalidate.01')]:
            value = verification.get(provider)
            if value:
                if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9._-]{8,256}', value):
                    raise ValueError(f'Invalid {provider} public verification code')
                tags.append(f'<meta name="{name}" content="{e(value)}">')
    if index:
        pair = {lang: path, ('fr' if lang == 'en' else 'en'): other}
        tags.extend(f'<link rel="alternate" hreflang="{code}" href="{e(absolute(pair[code]))}">' for code in ['en', 'fr'])
        tags.append(f'<link rel="alternate" hreflang="x-default" href="{e(absolute(pair["en"]))}">')
    tags += [
        '<meta property="og:type" content="website">', f'<meta property="og:site_name" content="{e(CONFIG["name"])}">',
        f'<meta property="og:title" content="{e(title)}">', f'<meta property="og:description" content="{e(description)}">',
        f'<meta property="og:url" content="{e(absolute(path))}">',
        f'<meta property="og:locale" content="{"fr_FR" if lang == "fr" else "en_US"}">',
        f'<meta property="og:locale:alternate" content="{"en_US" if lang == "fr" else "fr_FR"}">',
        f'<meta property="og:image" content="{absolute("/assets/lubricants-social.jpg")}">',
        '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="800">',
        f'<meta property="og:image:alt" content="{e(COPY[lang]["heroAlt"])}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{e(title)}">', f'<meta name="twitter:description" content="{e(description)}">',
        f'<meta name="twitter:image" content="{absolute("/assets/lubricants-social.jpg")}">',
        '<link rel="icon" type="image/svg+xml" href="/assets/dune-symbol.svg?v=oil-amber-1">',
    ]
    tags.extend(f'<link rel="stylesheet" href="/{name}?v={VERSION}">' for name in css)
    if endpoint:
        tags.append('<meta name="dune-enquiry-endpoint" content="https://energydune-enquiries.tonygu0826.workers.dev/enquiries">')
    if script:
        tags.append(f'<script src="/app.js?v={VERSION}" defer></script>')
    if structured:
        data = json.dumps(structured, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
        tags.append('<script type="application/ld+json">' + data + '</script>')
    return '<head>\n  ' + '\n  '.join(tags) + '\n</head>'


def register(path, other, lang, title, description, document, kind, modified=True):
    OUTPUTS[file_for(path)] = document + '\n'
    ROUTES.append({'path': path, 'alternate': other, 'language': lang, 'title': title, 'description': description, 'file': file_for(path), 'kind': kind, 'lastmod': UPDATED if modified else None})


def render_header(lang, other):
    ui = UI[lang]
    return f'''<a class="skip-link" href="#main">{e(COPY[lang]['skip'])}</a>
<header class="site-header"><div class="content-header-inner">
<a class="brand" href="{home(lang)}" aria-label="{e(COPY[lang]['home'])}"><img class="brand-logo" src="/assets/dune-logo-light.svg?v=logo-align-1" width="520" height="180" alt="DUNE ENERGY GLOBAL"></a>
<nav class="content-nav" aria-label="{e(COPY[lang]['navLabel'])}"><a href="{route(PILLAR, lang)}">{'Lubrifiants' if lang == 'fr' else 'Lubricants'}</a><a href="{prefix(lang)}/products/">{e(ui['products'])}</a><a href="{route(GUIDE, lang)}">{e(ui['guide'])}</a><a href="{prefix(lang)}/about/">{e(ui['about'])}</a></nav>
<a class="content-language" data-language-link href="{other}" hreflang="{'fr' if lang == 'en' else 'en'}" lang="{'fr' if lang == 'en' else 'en'}" aria-label="{e(ui['language'])}">{'FR' if lang == 'en' else 'EN'}</a>
</div></header>'''


def footer(lang):
    ui = UI[lang]
    return f'''<footer class="content-footer"><p>© 2026 DUNE ENERGY GLOBAL INC. {e(COPY[lang]['rights'])}</p><nav aria-label="{e(ui['related'])}"><a href="{home(lang)}">{e(ui['home'])}</a><a href="{mail(lang)}">{e(ui['contact'])}</a><a href="/privacy{'-fr' if lang == 'fr' else ''}.html">{e(COPY[lang]['privacy'])}</a><a href="/terms{'-fr' if lang == 'fr' else ''}.html">{e(COPY[lang]['terms'])}</a></nav></footer>'''


def breadcrumb(crumbs, lang):
    return '<nav class="breadcrumbs" aria-label="' + ('Fil d’Ariane' if lang == 'fr' else 'Breadcrumb') + '"><ol>' + ''.join('<li>' + (f'<span aria-current="page">{e(label)}</span>' if i == len(crumbs) - 1 else f'<a href="{href}">{e(label)}</a>') + '</li>' for i, (label, href) in enumerate(crumbs)) + '</ol></nav>'


def cta(lang, category=None):
    return f'<section class="content-cta"><h2>{e(UI[lang]["enquiry"])}</h2><p>{e(UI[lang]["specifications"])}</p><a class="button button-dark" href="{e(mail(lang, category))}">{e(COPY[lang]["startConversation"])} <span aria-hidden="true">↗</span></a></section>'


def related(lang, exclude=None):
    current = next((p for p in PAGES + [PILLAR] if p['id'] == exclude), None)
    selected = current.get('related_page_ids', []) if current else []
    candidates = [p for p in CATEGORIES if p['id'] != exclude and (not selected or p['id'] in selected)]
    cards = ''.join(f'<a class="related-card" href="{route(p, lang)}"><h3>{e(p[lang]["title"])}</h3><p>{e(p[lang]["summary"])}</p></a>' for p in candidates)
    if exclude != GUIDE['id']:
        cards += f'<a class="related-card" href="{route(GUIDE, lang)}"><h3>{e(UI[lang]["guide"])}</h3><p>{e(GUIDE[lang]["summary"])}</p></a>'
    if exclude != PILLAR['id']:
        cards += f'<a class="related-card" href="{route(PILLAR, lang)}"><h3>{e(PILLAR[lang]["title"])}</h3><p>{e(PILLAR[lang]["meta_description"])}</p></a>'
    return '<section class="content-section"><h2>' + e(UI[lang]['related']) + '</h2><div class="related-grid">' + cards + '</div></section>'


def page_shell(path, other, lang, title, description, heading, summary, body, crumbs, kind='WebPage', aside='', extra=None):
    data = schema(path, lang, title, description, kind, crumbs, extra)
    document = f'<!doctype html>\n<html lang="{lang}">\n' + head(path, other, lang, title, description, data) + f'\n<body class="content-page">\n' + render_header(lang, other)
    document += '<main class="content-main" id="main">' + breadcrumb(crumbs, lang) + f'<header class="content-heading"><p class="eyebrow">DUNE ENERGY GLOBAL</p><h1>{e(heading)}</h1><p class="content-summary">{e(summary)}</p></header>'
    document += '<div class="content-layout"><article class="content-article">' + body + '</article>' + aside + '</div></main>' + footer(lang) + '</body></html>'
    register(path, other, lang, title, description, document, kind)


def render_category_or_guide(page, lang):
    text, ui = page[lang], UI[lang]
    path, other = route(page, lang), route(page, 'fr' if lang == 'en' else 'en')
    is_guide = page['id'] == 'lubricant-selection'
    is_pillar = page['id'] == 'lubricants'
    title = text['title'] + ' | DUNE ENERGY GLOBAL'
    crumbs = [(ui['home'], home(lang))]
    if not is_guide and not is_pillar:
        crumbs.append((ui['products'], prefix(lang) + '/products/'))
    crumbs.append((text['title'], path))
    body = '<p class="content-updated">' + e(ui['updated']) + '</p>'
    if text.get('applications'):
        body += '<section class="content-section"><h2>' + e(ui['applications']) + '</h2><ul>' + ''.join('<li>' + e(item) + '</li>' for item in text['applications']) + '</ul></section>'
    for section in text.get('sections', []):
        body += '<section class="content-section"><h2>' + e(section['heading']) + '</h2>' + ''.join('<p>' + e(p) + '</p>' for p in section['paragraphs'])
        cited = [SOURCES[s] for s in section.get('source_ids', []) if s in SOURCES and SOURCES[s].get('publish', True)]
        if cited:
            body += '<p class="source-links">' + ('Références : ' if lang == 'fr' else 'References: ') + ' · '.join(f'<a href="#reference-{e(source["id"])}">{e(source.get("publisher", source["title"]))}</a>' for source in cited) + '</p>'
        body += '</section>'
    if is_guide:
        body += render_comparison(lang)
    if text.get('checklist'):
        body += '<section class="content-section"><h2>' + e(ui['checklist']) + '</h2><ul>' + ''.join('<li>' + e(item) + '</li>' for item in text['checklist']) + '</ul></section>'
    if text.get('faqs'):
        body += '<section class="content-section"><h2>' + e(ui['questions']) + '</h2>' + ''.join('<h3>' + e(q['question']) + '</h3><p>' + e(q['answer']) + '</p>' for q in text['faqs']) + '</section>'
    source_ids = list(dict.fromkeys(page.get('source_ids', []) + [s for section in text.get('sections', []) for s in section.get('source_ids', [])] + [s for q in text.get('faqs', []) for s in q.get('source_ids', [])]))
    sources = [SOURCES[s] for s in source_ids if s in SOURCES and SOURCES[s].get('publish', True)]
    if sources:
        body += '<section class="content-section"><h2>' + e(ui['references']) + '</h2><p>' + e(ui['reference_note']) + '</p><ul class="source-list">' + ''.join(f'<li id="reference-{e(source["id"])}"><a href="{e(source["url"])}">{e(source.get("title_" + lang, source.get("title", source["id"])))}</a></li>' for source in sources) + '</ul></section>'
    body += cta(lang, None if is_guide or is_pillar else page['id']) + related(lang, page['id'])
    aside = '' if is_guide or is_pillar else '<aside class="content-aside"><h2>' + e(ui['summary']) + '</h2><p>' + e(text['summary']) + '</p><p>' + e(ui['specifications']) + '</p><a class="text-link" href="' + e(mail(lang, page['id'])) + '">' + e(ui['enquiry']) + '</a><p><a href="' + route(GUIDE, lang) + '">' + e(ui['guide']) + '</a></p></aside>'
    extra = {'dateModified': UPDATED}
    if is_pillar:
        extra['about'] = {'@type': 'Thing', 'name': 'Automotive and industrial lubricants'}
        extra['audience'] = {'@type': 'BusinessAudience', 'geographicArea': [{'@type': 'Country', 'name': country} for country in CONFIG['target_enquiry_markets']]}
        extra['mainEntity'] = {'@type': 'ItemList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': p[lang]['title'], 'url': absolute(route(p, lang))} for i, p in enumerate(CATEGORIES) if p['id'] != 'energy']}
    elif is_guide:
        extra['mainEntity'] = {'@type': 'Article', '@id': absolute(path) + '#article', 'headline': text['title'], 'description': text['summary'], 'inLanguage': lang, 'datePublished': UPDATED, 'dateModified': UPDATED, 'author': {'@id': absolute('/#organization')}, 'publisher': {'@id': absolute('/#organization')}, 'mainEntityOfPage': {'@id': absolute(path) + '#webpage'}}
    else:
        extra['mainEntity'] = {'@type': 'Service', '@id': absolute(path) + '#supply-enquiry', 'name': text['title'], 'serviceType': 'Product sales and supply enquiries', 'provider': {'@id': absolute('/#organization')}, 'description': text['summary'], 'url': absolute(mail(lang, page['id']))}
    page_shell(path, other, lang, title, text['meta_description'], text['title'], text['summary'], body, crumbs, 'WebPage' if is_guide or is_pillar else 'CollectionPage', aside, extra)


def render_comparison(lang):
    if lang == 'en':
        title, headers = 'Viscosity, consistency and performance are different', ['Designation', 'What it describes', 'What it does not confirm']
        rows = [('SAE J300', 'Engine oil viscosity grades, such as 5W-30.', 'API/ACEA performance, an OEM approval or drain interval.'), ('SAE J306', 'Automotive gear lubricant viscosity grades, such as 75W-90.', 'Interchangeability with an engine oil of a similar number.'), ('ISO VG', 'Industrial lubricant viscosity grade based on kinematic viscosity at 40°C.', 'Suitability for every hydraulic, gear or compressor application.'), ('NLGI', 'Grease consistency grade, such as NLGI 2.', 'Base oil viscosity, thickener compatibility or performance specification.'), ('API / ACEA / OEM', 'Performance categories, requirements or specific manufacturer approvals.', 'That every product of the same viscosity grade is approved.')]
    else:
        title, headers = 'Viscosité, consistance et performance : des notions distinctes', ['Désignation', 'Ce qu’elle décrit', 'Ce qu’elle ne confirme pas']
        rows = [('SAE J300', 'Les grades de viscosité des huiles moteur, par exemple 5W-30.', 'La performance API/ACEA, une homologation constructeur ou un intervalle de vidange.'), ('SAE J306', 'Les grades de viscosité des lubrifiants pour engrenages automobiles, par exemple 75W-90.', 'L’interchangeabilité avec une huile moteur portant un nombre proche.'), ('ISO VG', 'Le grade de viscosité des lubrifiants industriels, fondé sur la viscosité cinématique à 40 °C.', 'L’aptitude à toutes les applications hydrauliques, d’engrenages ou de compression.'), ('NLGI', 'Le grade de consistance d’une graisse, par exemple NLGI 2.', 'La viscosité de l’huile de base, la compatibilité des épaississants ou les performances.'), ('API / ACEA / OEM', 'Des catégories de performance, exigences ou homologations précises de constructeurs.', 'L’homologation de tout produit présentant le même grade de viscosité.')]
    return '<section class="content-section"><h2>' + e(title) + '</h2><div class="table-scroll" tabindex="0" role="region" aria-label="' + e(title) + '"><table class="comparison-table"><thead><tr>' + ''.join('<th scope="col">' + e(h) + '</th>' for h in headers) + '</tr></thead><tbody>' + ''.join('<tr><th scope="row">' + e(row[0]) + '</th>' + ''.join('<td>' + e(v) + '</td>' for v in row[1:]) + '</tr>' for row in rows) + '</tbody></table></div></section>'


def render_hub(lang):
    ui = UI[lang]
    path, other = prefix(lang) + '/products/', prefix('fr' if lang == 'en' else 'en') + '/products/'
    heading = 'Lubricants and energy products' if lang == 'en' else 'Lubrifiants et produits énergétiques'
    summary = 'Explore the product categories for your application, then send the specifications, quantity and destination needed for a quotation.' if lang == 'en' else 'Consultez les catégories adaptées à votre application, puis transmettez les spécifications, la quantité et la destination pour obtenir un devis.'
    body = related(lang) + '<p>' + e(ui['brand']) + '</p>' + cta(lang)
    extra = {'mainEntity': {'@type': 'ItemList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': p[lang]['title'], 'url': absolute(route(p, lang))} for i, p in enumerate(CATEGORIES)]}}
    page_shell(path, other, lang, heading + ' | DUNE ENERGY GLOBAL', summary, heading, summary, body, [(ui['home'], home(lang)), (ui['products'], path)], 'CollectionPage', extra=extra)


def render_about(lang):
    ui = UI[lang]
    path, other = prefix(lang) + '/about/', prefix('fr' if lang == 'en' else 'en') + '/about/'
    heading = 'About DUNE ENERGY GLOBAL' if lang == 'en' else 'À propos de DUNE ENERGY GLOBAL'
    summary = COPY[lang]['aboutLead']
    if lang == 'en':
        pairs = [('Legal company name', CONFIG['legal_name']), ('Business', 'Energy products and multi-brand lubricant sales'), ('Applications', 'Passenger vehicles, commercial vehicles and industrial equipment'), ('Enquiry brands shown on this website', 'SINOPEC and Great Wall Lubricants'), ('Communication', 'English and French'), ('Official email', CONFIG['email'])]
        paragraphs = ['Send your product category, preferred brand or reference, specifications, quantity and delivery destination through our enquiry page. Optional technical details help distinguish products with similar names or viscosity grades.', 'Availability, product specifications, packaging and delivery requirements are reviewed for the individual request. The website presents category-level information; it does not publish live inventory, product prices or confirmed lead times.', 'Ask for the relevant product data sheet (PDS/TDS), safety data sheet (SDS) and any required evidence of an OEM approval for the product being quoted. A safety data sheet is not a performance approval.']
    else:
        pairs = [('Dénomination légale', CONFIG['legal_name']), ('Activité', 'Vente de produits énergétiques et de lubrifiants multimarques'), ('Applications', 'Véhicules légers, véhicules commerciaux et équipements industriels'), ('Marques proposées pour les demandes sur ce site', 'SINOPEC et Great Wall Lubricants'), ('Communication', 'Anglais et français'), ('Courriel officiel', CONFIG['email'])]
        paragraphs = ['Transmettez la catégorie de produits, la marque ou la référence souhaitée, les spécifications, la quantité et la destination au moyen de notre page de demande. Les précisions techniques permettent de distinguer des produits aux noms ou aux grades de viscosité proches.', 'La disponibilité, les spécifications, le conditionnement et les besoins de livraison sont examinés pour chaque demande. Le site présente des informations par catégorie, sans publier de stocks en temps réel, de prix ou de délais confirmés.', 'Demandez la fiche technique (PDS/TDS), la fiche de données de sécurité (SDS/FDS) et les justificatifs d’homologation constructeur nécessaires pour le produit proposé. Une fiche de données de sécurité n’est pas une homologation de performance.']
    body = '<section class="content-section"><h2>' + e(ui['facts']) + '</h2><dl class="fact-list">' + ''.join('<div><dt>' + e(k) + '</dt><dd>' + e(v) + '</dd></div>' for k, v in pairs) + '</dl></section>'
    body += '<section class="content-section"><h2>' + e(ui['process']) + '</h2>' + ''.join('<p>' + e(p) + '</p>' for p in paragraphs) + '<p>' + e(ui['brand']) + '</p></section>'
    destination = PILLAR[lang]['sections'][-1]
    body += '<section class="content-section"><h2>' + e(destination['heading']) + '</h2>' + ''.join('<p>' + e(p) + '</p>' for p in destination['paragraphs']) + '</section>'
    body += cta(lang) + related(lang)
    page_shell(path, other, lang, heading, summary, heading, summary, body, [(ui['home'], home(lang)), (ui['about'], path)], 'AboutPage', extra={'mainEntity': {'@id': absolute('/#organization')}})


def localize_template(name, lang):
    document = html.document_fromstring((ROOT / 'site' / name).read_text())
    body = document.find('body')
    t = COPY[lang]
    for node in body.xpath('//*[@data-i18n]'):
        value = t[node.get('data-i18n')]
        for child in list(node):
            node.remove(child)
        node.text = value
    for node in body.xpath('//*[@data-i18n-placeholder]'):
        node.set('placeholder', t[node.get('data-i18n-placeholder')])
    for node in body.xpath('//*[@src]'):
        if not node.get('src').startswith(('/', 'http')):
            node.set('src', '/' + node.get('src'))
    for node in body.xpath('//*[@data-legal-page]'):
        node.set('href', '/' + node.get('data-legal-page') + ('-fr' if lang == 'fr' else '') + '.html')
    for node in body.xpath('//*[@data-home-link]'):
        node.set('href', home(lang))
    for node in body.xpath('//*[@data-inquiry]'):
        target = mail(lang)
        params = {key: node.get('data-' + key) for key in ['category', 'brand'] if node.get('data-' + key)}
        node.set('href', target + ('?' + urlencode(params) if params else ''))
    for node in body.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," brand ")]'):
        node.set('aria-label', t['home'])
    for cls, key in [('desktop-nav', 'navLabel'), ('filter-group', 'filterLabel')]:
        for node in body.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," ' + cls + ' ")]'):
            node.set('aria-label', t[key])
    for node in body.xpath('//*[@id="mobile-nav"]'):
        node.set('aria-label', t['mobileNavLabel'])
    for node in body.xpath('//*[@id="product-list"]'):
        node.set('aria-label', t['productListLabel'])
    for node in body.xpath('//*[@data-scroll-products]'):
        node.set('aria-label', t['productScrollPrevious' if node.get('data-scroll-products') == '-1' else 'productScrollNext'])
    for node in body.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," product-count ")]'):
        node.text = t['productCount'].replace('{n}', '6')
    for node in body.xpath('//*[@data-brand]'):
        node.set('aria-label', t['brandAsk'].replace('{brand}', node.get('data-brand')))
    for node in body.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," menu-toggle ")]'):
        node.set('aria-label', t['menuOpen'])
    for node in body.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," hero-scroll ")]'):
        node.set('aria-label', t['explore'])
    for node in body.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," language-current ")]'):
        node.text = lang.upper()
    for node in body.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," language-next ")]'):
        node.text = 'EN' if lang == 'fr' else 'FR'
    return body


def render_existing_template(lang, is_mail=False):
    body = localize_template('mail.html' if is_mail else 'home.html', lang)
    path = mail(lang) if is_mail else home(lang)
    other_lang = 'fr' if lang == 'en' else 'en'
    other = mail(other_lang) if is_mail else home(other_lang)
    switch = body.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," language-switch ")]')[0]
    switch.tag = 'a'
    switch.attrib.pop('type', None)
    switch.set('href', other)
    switch.set('hreflang', other_lang)
    switch.set('lang', other_lang)
    switch.set('data-language-link', '')
    switch.set('aria-label', COPY[lang]['switchLanguage'])
    if not is_mail:
        hero = body.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," hero-image ")]')[0]
        hero.set('src', '/assets/lubricants-hero-1536.webp')
        hero.set('srcset', ', '.join(f'/assets/lubricants-hero-{width}.webp {width}w' for width in [640, 1024, 1536]))
        hero.set('sizes', '100vw')
        hero.set('alt', COPY[lang]['heroAlt'])
        for page in CATEGORIES:
            card = body.xpath('//*[@data-product="' + page['id'] + '"]')[0]
            heading = card.find('h3')
            key = heading.attrib.pop('data-i18n')
            link = etree.Element('a', href=route(page, lang), attrib={'class': 'product-detail-link', 'data-i18n': key})
            link.text = heading.text
            heading.text = None
            heading.append(link)
        products = body.xpath('//*[@id="products"]')[0]
        strip = html.fragment_fromstring('<div class="resource-strip"><p>' + e(UI[lang]['resources']) + '</p><div class="resource-links"><a href="' + route(PILLAR, lang) + '">' + ('Lubrifiants' if lang == 'fr' else 'Lubricants') + '</a><a href="' + prefix(lang) + '/products/">' + e(UI[lang]['all_products']) + '</a><a href="' + route(GUIDE, lang) + '">' + e(UI[lang]['guide']) + '</a></div></div>')
        products.append(strip)
        about = body.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," about-copy ")]')[0]
        about.append(html.fragment_fromstring('<a class="text-link" href="' + prefix(lang) + '/about/">' + e(UI[lang]['about']) + ' <span aria-hidden="true">↗</span></a>'))
    elif lang == 'fr':
        for node in body.xpath('//noscript/p'):
            node.text = 'Activez JavaScript pour envoyer ce formulaire, ou écrivez directement à info@energydune.com.'
    title = COPY[lang]['enquiryPageTitle' if is_mail else 'pageTitle']
    desc = COPY[lang]['enquiryPageDescription' if is_mail else 'metaDescription']
    extra = {'mainEntity': {'@id': absolute('/#organization')}} if is_mail else {'mainEntity': {'@type': 'ItemList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': p[lang]['title'], 'url': absolute(route(p, lang))} for i, p in enumerate(CATEGORIES)]}}
    data = schema(path, lang, title, desc, 'ContactPage' if is_mail else 'WebPage', extra=extra)
    css = ('styles.css', 'mail.css') if is_mail else ('styles.css', 'seo.css')
    document = f'<!doctype html>\n<html lang="{lang}">\n' + head(path, other, lang, title, desc, data, css, True, is_mail) + '\n' + html.tostring(body, encoding='unicode', method='html') + '\n</html>'
    register(path, other, lang, title, desc, document, 'ContactPage' if is_mail else 'WebPage', not is_mail)


def render_legal():
    for name in ['privacy', 'terms']:
        for lang in LANGUAGES:
            filename = name + ('-fr' if lang == 'fr' else '') + '.html'
            text = (ROOT / 'site/legal' / filename).read_text()
            path = '/' + filename
            other = '/' + name + ('-fr' if lang == 'en' else '') + '.html'
            doc = html.document_fromstring(text)
            title = doc.findtext('head/title')
            description = doc.xpath('//meta[@name="description"]/@content')[0]
            text = re.sub(r'<head>.*?</head>', head(path, other, lang, title, description, schema(path, lang, title, description), ('legal.css',)), text, count=1, flags=re.S)
            text = text.replace('href="./?lang=' + lang + '"', 'href="' + home(lang) + '"')
            text = text.replace('href="/mail/?lang=' + lang + '"', 'href="' + mail(lang) + '"')
            register(path, other, lang, title, description, text.rstrip(), 'WebPage', False)


def render_404():
    title = 'Page not found | DUNE ENERGY GLOBAL'
    OUTPUTS['404.html'] = '<!doctype html>\n<html lang="en">' + head('/404.html', None, 'en', title, 'The requested page could not be found.', None, index=False) + '<body class="content-page">' + render_header('en', '/fr/') + '<main id="main" class="content-main"><header class="content-heading"><p class="eyebrow">404</p><h1>Page not found</h1><p lang="fr">Page introuvable</p></header><p><a href="/">English homepage</a> · <a href="/fr/" lang="fr">Accueil en français</a></p><p><a class="button button-dark" href="/mail/">Send an enquiry</a></p></main>' + footer('en') + '</body></html>\n'


def render_discovery():
    namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
    xhtml = 'http://www.w3.org/1999/xhtml'
    ET.register_namespace('', namespace)
    ET.register_namespace('xhtml', xhtml)
    root = ET.Element('{' + namespace + '}urlset')
    for item in ROUTES:
        url = ET.SubElement(root, '{' + namespace + '}url')
        ET.SubElement(url, '{' + namespace + '}loc').text = absolute(item['path'])
        if item['lastmod']:
            ET.SubElement(url, '{' + namespace + '}lastmod').text = item['lastmod']
        pair = {item['language']: item['path'], ('fr' if item['language'] == 'en' else 'en'): item['alternate']}
        for code in ['en', 'fr', 'x-default']:
            ET.SubElement(url, '{' + xhtml + '}link', rel='alternate', hreflang=code, href=absolute(pair['en' if code == 'x-default' else code]))
    ET.indent(root, space='  ')
    OUTPUTS['sitemap.xml'] = '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(root, encoding='unicode') + '\n'
    bots = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Meta-WebIndexer', 'facebookexternalhit']
    OUTPUTS['robots.txt'] = '# Public pages may be crawled by search engines and user-requested AI retrieval.\n' + '\n'.join('User-agent: ' + bot for bot in bots) + '\nAllow: /\n\nUser-agent: *\nAllow: /\n\nSitemap: ' + absolute('/sitemap.xml') + '\n'
    lines = ['# DUNE ENERGY GLOBAL', '', '> Energy products and multi-brand lubricants for automotive, commercial vehicle and industrial applications. Official website: https://energydune.com/.', '', 'DUNE ENERGY GLOBAL INC. is the legal company name. Contact: info@energydune.com. Availability and specifications are confirmed by quotation. SINOPEC and Great Wall Lubricants identify requested products; their listing does not imply authorised distribution. This website publishes category-level information, not live inventory, prices, SKU-level approvals or confirmed lead times.', '', '## Company and enquiries', '', '- [Company profile](https://energydune.com/about/): Public company identity, scope and quotation process.', '- [Send an enquiry](https://energydune.com/mail/): Direct enquiry form.', '- [French homepage](https://energydune.com/fr/): Site en français.', '- [French company profile](https://energydune.com/fr/about/): Informations sur l’entreprise.', '', '## Product information', '']
    lines += [f'- [Automotive and industrial lubricants]({absolute(route(PILLAR, "en"))}): Lubricating oils, greases, application choices and enquiries with US or Canadian destinations; supply terms require a quotation.', f'- [Lubrifiants automobiles et industriels]({absolute(route(PILLAR, "fr"))}): Version française.']
    for p in CATEGORIES:
        lines.append(f'- [{p["en"]["title"]}]({absolute(route(p, "en"))}): {p["en"]["summary"]}')
        lines.append(f'- [{p["fr"]["title"]}]({absolute(route(p, "fr"))}): Version française.')
    lines += ['', '## Selection reference', '', f'- [Lubricant selection guide]({absolute(route(GUIDE, "en"))}): SAE, ISO VG, NLGI, performance specifications, OEM approvals and enquiry details.', f'- [Guide de sélection]({absolute(route(GUIDE, "fr"))}): Version française.', '', '## Public machine-readable access', '', '- [MCP documentation](https://energydune-mcp.tonygu0826.workers.dev/docs): Public company and category lookup tools. Its enquiry tool prepares a draft; it does not send email.', '', '## Policies and discovery', '', '- [Privacy policy](https://energydune.com/privacy.html)', '- [Terms of use](https://energydune.com/terms.html)', '- [XML sitemap](https://energydune.com/sitemap.xml)', '']
    OUTPUTS['llms.txt'] = '\n'.join(lines)
    OUTPUTS['indexnow-key.txt'] = (ROOT / 'site/indexnow-key.txt').read_text().strip() + '\n'


def build(check=False):
    OUTPUTS['app.js'] = (ROOT / 'site/app.template.js').read_text().replace('__UI_TRANSLATIONS__', json.dumps(COPY, ensure_ascii=False, indent=2))
    for lang in LANGUAGES:
        render_existing_template(lang)
        render_existing_template(lang, True)
        render_category_or_guide(PILLAR, lang)
        render_hub(lang)
        for page in PAGES:
            render_category_or_guide(page, lang)
        render_about(lang)
    render_legal()
    render_404()
    render_discovery()
    OUTPUTS['site/routes.json'] = json.dumps(ROUTES, ensure_ascii=False, indent=2) + '\n'
    mismatches = []
    for name, text in OUTPUTS.items():
        path = ROOT / name
        if check:
            if not path.exists() or path.read_text() != text:
                mismatches.append(name)
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)
    if mismatches:
        raise SystemExit('Generated files differ: ' + ', '.join(mismatches))
    print(('Verified' if check else 'Generated') + f' {len(ROUTES)} indexable documents, custom 404, app.js and discovery files.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    build(parser.parse_args().check)
