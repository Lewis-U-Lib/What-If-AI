"""Validate the presentation overlay without altering the released collection."""
import json
import re
from urllib.parse import urlsplit, urldefrag

FILE_PATTERN = re.compile(r'\.(pdf|docx?|pptx?|xlsx?|zip)(?:[?#]|$)|/download/|/bitstreams?/|/viewcontent|/files/|/file/d/|[?&](download|format|export)=|arxiv.org/pdf/|/article/view/[^/]+/[^/]+', re.I)


def validate(policy, acts, register):
    def url(value):
        if not isinstance(value, str) or re.search(r'[\x00-\x20\x7f]', value):
            raise ValueError('Invalid source-link URL: ' + repr(value))
        u = urlsplit(value)
        if u.scheme not in ('https', 'http') or not u.hostname or u.username or u.password:
            raise ValueError('Invalid source-link URL: ' + value)

    current = {urldefrag(a['url'])[0] for a in acts['acts'] if a.get('url')}
    current.update(urldefrag(w['link'])[0] for w in register['works'] if w.get('link'))
    seen = set()
    for e in policy['entries']:
        if e['kind'] not in ('pdf', 'file', 'pdf-view', 'page') or not e['urls']:
            raise ValueError('Invalid source-link entry')
        if not e['title'] or not e['evidence'] or not e['reviewed']:
            raise ValueError('Source-link entry lacks review evidence')
        for u in e['urls']:
            url(u)
            if u in seen or u not in current or urldefrag(u)[1]:
                raise ValueError('Duplicate, stale, or fragment-bearing source-link key: ' + u)
            seen.add(u)
        if e['page']:
            url(e['page'])
            if e['page'] not in e['evidence']:
                raise ValueError('Source webpage lacks its evidence URL')
        for u in e['evidence']: url(u)
    missing = sorted(u for u in current if FILE_PATTERN.search(u) and u not in seen)
    if missing:
        raise ValueError('Review new file-like source URLs before publishing: ' + repr(missing))


def source_links_bytes(path, public_data):
    policy = json.loads(path.read_text(encoding='utf-8'))
    validate(policy, json.loads(public_data['acts.json']), json.loads(public_data['register.json']))
    return (json.dumps(policy, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')
