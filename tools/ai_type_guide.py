"""Combine the sourced AI-guide prose with the public collection.

Classification keys, capability filters, idea IDs, and counts remain upstream-owned.
The reference ledger is independent of the activity collection's bibliography.
"""
import copy
import hashlib
import json
import re
from urllib.parse import urlsplit


FIELDS = {'name', 'preview', 'what', 'does', 'io', 'why', 'limits', 'citations'}


def validate(guide, types):
    if guide['schema'] != 1 or set(guide['types']) != {t['key'] for t in types}:
        raise ValueError('AI guide must cover exactly the existing related-idea keys.')
    if set(guide['no_ai']) != {'name', 'preview', 'text', 'rationale', 'suggestion'}:
        raise ValueError('AI guide cannot change the no-student-tool count or filter.')
    sources = guide['sources']
    ids = [s['id'] for s in sources]
    if len(ids) != len(set(ids)) or ids != list(range(1, len(ids) + 1)):
        raise ValueError('AI guide source IDs must be unique, stable, consecutive integers.')
    urls = [s['url'] for s in sources]
    if len(set(urls)) != len(urls) or any(not isinstance(u, str) or re.search(r'[\x00-\x20\x7f]', u) or urlsplit(u).scheme != 'https' or not urlsplit(u).hostname for u in urls):
        raise ValueError('AI guide sources need unique HTTPS URLs.')
    if any(not all(s.get(k) for k in ('title', 'kind', 'locator')) for s in sources):
        raise ValueError('AI guide sources need titles, publication status, and locators.')
    keys = [k for group in guide['groups'] for k in group['keys']]
    if len(keys) != len(set(keys)) or set(keys) != set(guide['types']) | {'noai'}:
        raise ValueError('AI guide groups must cover each entry exactly once.')
    if set(guide['groups'][-1]['keys']) != {'institutional', 'noai'}:
        raise ValueError('Access and participation choices must be separate from AI capabilities.')
    for key, t in guide['types'].items():
        if set(t) != FIELDS:
            raise ValueError('AI guide may change only its prose fields: ' + key)
        if not all(t[k] for k in FIELDS - {'citations'}):
            raise ValueError('AI guide has empty prose: ' + key)
        if set(t['citations']) != {'what', 'does', 'io', 'limits'}:
            raise ValueError('AI guide requires explicit source mappings: ' + key)
        if key != 'institutional' and any(not refs for refs in t['citations'].values()):
            raise ValueError('AI capability explanations require sources: ' + key)
    used = set()
    def visit(value):
        if isinstance(value, dict):
            if 'refs' in value:
                used.update(value['refs'])
            if 'citations' in value:
                for refs in value['citations'].values():
                    used.update(refs)
            for child in value.values():
                visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)
    visit(guide)
    if used != set(ids):
        raise ValueError('AI guide has unknown citations or uncited references.')


def ai_type_guide_files(raw, guide_file):
    body = guide_file.read_bytes()
    guide = json.loads(body)
    register = json.loads(raw['register.json'])
    original = register['types']
    validate(guide, original['types'])
    result = copy.deepcopy(guide)
    result['types'] = [dict(t, **guide['types'][t['key']]) for t in original['types']]
    result['no_ai'] = dict(original['no_ai'], **guide['no_ai'])
    register['types'] = result
    output = dict(raw)
    output['register.json'] = (json.dumps(register, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')
    hashes = lambda values: {k: hashlib.sha256(v).hexdigest() for k, v in values.items()}
    return output, {'revision': hashlib.sha256(body).hexdigest()[:12], 'reviewed': guide['reviewed'],
                    'source_count': len(guide['sources']), 'input_sha256': hashes(raw), 'output_sha256': hashes(output)}
