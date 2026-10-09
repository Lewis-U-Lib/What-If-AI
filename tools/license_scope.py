"""Clarify entry-license scope without relicensing any catalog material."""
import hashlib
import json


def hashes(raw):
    return {key: hashlib.sha256(value).hexdigest() for key, value in raw.items()}


def license_scope_files(raw, manifest_file, pin=False):
    manifest = json.loads(manifest_file.read_text(encoding='utf-8'))
    if not pin and hashes(raw) != manifest['input_sha256']:
        raise ValueError('License-scope input changed; review entry rights before repinning.')
    acts = json.loads(raw['acts.json'])
    replacements = {r['before']: r for r in manifest['note_replacements']}
    counts = {text: 0 for text in replacements}
    changed = []
    for entry in acts['acts']:
        note = entry.get('licn', '')
        if note in replacements:
            if entry['lic'] != 'CC BY-NC-SA 4.0':
                raise ValueError('Unexpected entry license: ' + entry['id'])
            entry['licn'] = replacements[note]['after']
            counts[note] += 1
            changed.append(entry['id'])
        elif 'collection’s' in note:
            raise ValueError('Unreviewed collection-license reference: ' + entry['id'])
    if any(counts[text] != row['count'] for text, row in replacements.items()):
        raise ValueError('License-scope note counts changed.')
    output = dict(raw)
    output['acts.json'] = (json.dumps(acts, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8')
    if pin:
        manifest.update(input_sha256=hashes(raw), output_sha256=hashes(output), clarified_ids=changed)
        manifest_file.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    elif hashes(output) != manifest['output_sha256'] or changed != manifest['clarified_ids']:
        raise ValueError('License-scope output differs from its reviewed hashes or entries.')
    metadata = {'revision': hashlib.sha256(manifest_file.read_bytes()).hexdigest()[:12],
                'effective': manifest['effective'], 'clarified_notes': len(changed)}
    return output, metadata, manifest['tool_license']


def prior_public_data(root):
    from ai_type_guide import ai_type_guide_files
    raw = {name: (root / 'data' / name).read_bytes() for name in ('acts.json', 'register.json', 'guide.json')}
    raw, _ = ai_type_guide_files(raw, root / 'content/ai-type-guide.json')
    return raw


if __name__ == '__main__':
    import sys
    from pathlib import Path
    if sys.argv[1:] != ['--pin']:
        raise SystemExit('usage: python3 tools/license_scope.py --pin')
    root = Path(__file__).resolve().parents[1]
    _, metadata, _ = license_scope_files(prior_public_data(root), root / 'content/tool-license.json', pin=True)
    print(json.dumps(metadata))
