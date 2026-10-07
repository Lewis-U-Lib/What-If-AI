"""Apply the public terminology pass after the pinned record review.

Source citations, titles, quoted prompts, license statements, locators, identifiers,
and every earlier data stage remain intact. Input/output hashes make this editorial
pass reviewable and refuse an upstream change until its source boundaries are checked.
"""
import copy
import hashlib
import json
import re

WORD = re.compile(r"\bactivities\b|\bactivity\b", re.I)
QUOTE = re.compile(r'“[^”]*”|"[^"\n]*"|‘[^’]*’|(?<!\w)\'[^\'\n]+\'(?!\w)|https?://[^\s<>]+')
FIELDS = {'t', 'sum', 'chg', 'na', 'dl', 'ad', 'rf', 'gate', 'risk', 'evs', 'dep', 'chk', 'licn', 'pa'}


def hashes(raw):
    return {name: hashlib.sha256(body).hexdigest() for name, body in raw.items()}


def replace_prose(text, protected=(), phrases=()):
    """Replace editorial nouns, preserving exact source spans and URLs."""
    spans = [(m.start(), m.end()) for m in QUOTE.finditer(text)]
    for fragment in protected:
        spans.extend((m.start(), m.end()) for m in re.finditer(re.escape(fragment), text))
    def rewrite(value):
        for before, after in phrases:
            value = value.replace(before, after)
        # 'use' starts with a consonant sound: an activity -> a use-case idea.
        value = re.sub(r'\b([Aa])n(?=\s+activity\b)', lambda m: m[1], value)
        def noun(m):
            word = m.group()
            result = 'use-case ideas' if word.lower() == 'activities' else 'use-case idea'
            return result.upper() if word.isupper() else result[0].upper() + result[1:] if word[0].isupper() else result
        return WORD.sub(noun, value)
    result, start = [], 0
    for left, right in sorted(spans):
        if left < start:
            continue
        result.extend((rewrite(text[start:left]), text[left:right]))
        start = right
    return ''.join(result) + rewrite(text[start:])


def apply_terminology(source, manifest):
    result = copy.deepcopy(source)
    changed = []
    protected = manifest['protected_phrases']
    phrases = manifest['contextual_rewording']
    def edit(obj, key, location):
        before = obj[key]
        if not isinstance(before, str):
            return
        after = replace_prose(before, protected, phrases)
        if before != after:
            obj[key] = after
            changed.append(location)
    for record in result['acts.json']['acts']:
        for key in FIELDS & record.keys():
            if key == 't' and record['id'] in manifest['source_titles']:
                if record[key] != manifest['source_titles'][record['id']]:
                    raise ValueError('Protected source title changed: ' + record['id'])
                continue
            edit(record, key, record['id'] + '.' + key)
        for i, row in enumerate(record.get('rel', [])):
            edit(row, 1, record['id'] + '.rel.' + str(i) + '.1')
        for i, row in enumerate(record.get('srp', [])):
            edit(row, 1, record['id'] + '.srp.' + str(i) + '.1')
        for i in range(len(record.get('miss', []))):
            edit(record['miss'], i, record['id'] + '.miss.' + str(i))
        # Attribution lines begin with source bibliographic/rights wording. Only
        # the collection-authored explanation after 'Changes:' is editable.
        if record.get('attr'):
            lines = []
            for line in record['attr'].split('\n'):
                prefix, sep, prose = line.partition('Changes: ')
                lines.append(prefix + sep + replace_prose(prose, protected, phrases))
            after = '\n'.join(lines)
            if after != record['attr']:
                record['attr'] = after
                changed.append(record['id'] + '.attr')

    def walk(obj, location):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key in {'acts', 'works', 'items', 'url', 'link', 'key', 'id'}:
                    continue
                if isinstance(value, str):
                    edit(obj, key, location + '.' + key)
                else:
                    walk(value, location + '.' + key)
        elif isinstance(obj, list):
            for i, value in enumerate(obj):
                if isinstance(value, str):
                    edit(obj, i, location + '.' + str(i))
                else:
                    walk(value, location + '.' + str(i))
    for name in result:
        walk(result[name], name)
    # One source-access note contains editorial prose after a verbatim license
    # quotation. All other bibliography fields remain byte-for-byte intact.
    for work in result['register.json']['works']:
        if work['id'] == 'SRC-0143':
            edit(work, 'lic', 'SRC-0143.lic')
    return result, changed


def terminology_files(raw, manifest_file, pin=False):
    manifest = json.loads(manifest_file.read_text(encoding='utf-8'))
    if not pin and hashes(raw) != manifest['input_sha256']:
        raise ValueError('Terminology input changed; review source quotations before repinning.')
    source = {name: json.loads(body) for name, body in raw.items()}
    result, changed = apply_terminology(source, manifest)
    output = {name: (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')
              if value != source[name] else raw[name] for name, value in result.items()}
    if pin:
        manifest.update(input_sha256=hashes(raw), output_sha256=hashes(output), changed_fields=len(changed))
        manifest_file.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    elif hashes(output) != manifest['output_sha256'] or len(changed) != manifest['changed_fields']:
        raise ValueError('Terminology output differs from the reviewed hashes or counts.')
    metadata = {'revision': hashlib.sha256(manifest_file.read_bytes()).hexdigest()[:12],
                'reviewed': manifest['reviewed'], 'changed_fields': len(changed)}
    return output, metadata


def reviewed_input(root):
    from editorial_corrections import corrected_files
    from publication_review import reviewed_files
    from serial_commas import punctuated_files
    from curation import curated_files
    from tiers import tiered_files
    from ai_use import ai_use_files
    from record_review import record_review_files
    release = json.loads((root / 'data/release.json').read_text())
    raw, _, _ = corrected_files(root / 'data', release, root / 'content/editorial-corrections.json')
    raw, _, _ = reviewed_files(raw, release, root / 'content/publication-review.json')
    for stage, filename in [(punctuated_files, 'serial-comma-corrections'), (curated_files, 'curation'),
                            (tiered_files, 'tiers'), (ai_use_files, 'ai-use'), (record_review_files, 'record-review')]:
        raw, _, _ = stage(raw, root / 'content' / (filename + '.json'))
    return raw


if __name__ == '__main__':
    from pathlib import Path
    import sys
    if sys.argv[1:] != ['--pin']:
        raise SystemExit('usage: python3 tools/terminology.py --pin')
    root = Path(__file__).resolve().parents[1]
    _, metadata = terminology_files(reviewed_input(root), root / 'content/terminology.json', pin=True)
    print(json.dumps(metadata))
