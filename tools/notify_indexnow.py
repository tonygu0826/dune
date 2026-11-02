#!/usr/bin/env python3
"""Notify public canonical URL changes. The host proof is intentionally public, not an account credential."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
HOST = 'energydune.com'
ORIGIN = 'https://' + HOST
ENDPOINT = 'https://api.indexnow.org/indexnow'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--submit', action='store_true', help='Perform the notification after verifying the live public host proof.')
    parser.add_argument('--receipt', default='.local/seo-geo/release/indexnow-receipt.json')
    parser.add_argument('--url', action='append', dest='selected_urls', help='Notify only this known canonical URL; repeat for multiple changed URLs')
    args = parser.parse_args()
    key = (ROOT / 'indexnow-key.txt').read_text().strip()
    assert re.fullmatch(r'[a-zA-Z0-9-]{8,128}', key), 'Invalid public host-proof format'
    routes = json.loads((ROOT / 'site/routes.json').read_text())
    canonical_urls = [ORIGIN + item['path'] for item in routes]
    urls = list(dict.fromkeys(args.selected_urls or canonical_urls))
    if not set(urls) <= set(canonical_urls):
        parser.error('Only canonical public URLs in site/routes.json may be notified; query strings and private or external URLs are not accepted')
    assert 0 < len(urls) <= 10000 and len(urls) == len(set(urls))
    assert all(url.startswith(ORIGIN + '/') and '?' not in url and '#' not in url for url in urls)
    key_url = ORIGIN + '/indexnow-key.txt'
    summary = {'endpoint': ENDPOINT, 'host': HOST, 'url_count': len(urls), 'key_location': key_url, 'submitted': False, 'indexing_confirmed': False}
    if not args.submit:
        print(json.dumps(summary, indent=2))
        return
    headers = {'User-Agent': 'energydune-site-maintenance/1.0 (+https://energydune.com/about/)'}
    with urlopen(Request(key_url, headers=headers), timeout=25) as response:
        assert response.status == 200 and response.read(1024).decode('utf-8-sig').strip() == key, 'Live host proof does not match; no notification sent'
    payload = {'host': HOST, 'key': key, 'keyLocation': key_url, 'urlList': urls}
    request = Request(ENDPOINT, data=json.dumps(payload).encode(), headers={**headers, 'Content-Type': 'application/json; charset=utf-8'}, method='POST')
    try:
        with urlopen(request, timeout=30) as response:
            status = response.status
    except HTTPError as error:
        status = error.code
    summary.update({'submitted': True, 'http_status': status, 'received': status in [200, 202], 'key_validation_pending': status == 202, 'submitted_at_utc': datetime.now(timezone.utc).isoformat(), 'urls': urls})
    output = ROOT / args.receipt
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(summary, indent=2) + '\n')
    print(json.dumps({key: value for key, value in summary.items() if key != 'urls'}, indent=2))
    if status not in [200, 202]:
        raise SystemExit(f'IndexNow notification not confirmed (HTTP {status}); do not treat this as indexing.')


if __name__ == '__main__':
    main()
