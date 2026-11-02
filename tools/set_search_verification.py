#!/usr/bin/env python3
"""Store a provider-issued public ownership meta tag. Does not log in or claim verification."""
import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
NAMES = {'google': 'google-site-verification', 'bing': 'msvalidate.01'}


class MetaReader(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []

    def handle_starttag(self, tag, attributes):
        if tag.lower() == 'meta':
            values = dict(attributes)
            if values.get('name', '').lower() in NAMES.values():
                self.tags.append((values['name'].lower(), values.get('content', '')))


def parse_value(provider, text):
    value = text.strip()
    if '<' in value:
        reader = MetaReader()
        reader.feed(value)
        matches = [content for name, content in reader.tags if name == NAMES[provider]]
        if len(matches) != 1:
            raise ValueError('Expected exactly one matching provider-issued ownership meta tag')
        value = matches[0]
    if not re.fullmatch(r'[A-Za-z0-9._-]{8,256}', value):
        raise ValueError('Invalid public verification code; do not use an account password or API key')
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('provider', choices=NAMES)
    parser.add_argument('--tag-file', required=True, type=Path, help='File containing the public ownership meta tag or its content value')
    args = parser.parse_args()
    code = parse_value(args.provider, args.tag_file.read_text())
    config = ROOT / 'site/config.json'
    data = json.loads(config.read_text())
    data.setdefault('search_verification', {})[args.provider] = code
    config.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f'Stored {args.provider} public ownership proof; rebuild and publish before asking the provider to verify. Account verification is not yet confirmed.')


if __name__ == '__main__':
    main()
