#!/usr/bin/env python3
"""Write a record-by-record comparison of the built catalog with its prior rights."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
from license_scope import prior_public_data

ROOT = Path(__file__).resolve().parents[1]


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                     separators=(',', ':')).encode()).hexdigest()


def audit(site):
    manifest = json.loads((ROOT / 'content/tool-license.json').read_text())
    version = json.loads((site / 'version.json').read_text())
    before_raw = prior_public_data(ROOT)
    after_raw = {name: (site / version['assets']['data/' + name]).read_bytes() for name in before_raw}
    for name in before_raw:
        assert hashlib.sha256(before_raw[name]).hexdigest() == manifest['input_sha256'][name], name
        assert hashlib.sha256(after_raw[name]).hexdigest() == manifest['output_sha256'][name], name
    before = {k: json.loads(v) for k,v in before_raw.items()}
    after = {k: json.loads(v) for k,v in after_raw.items()}
    entries, sources, quotes = [], [], []
    for old, new in zip(before['acts.json']['acts'], after['acts.json']['acts']):
        old_fields = {k:v for k,v in old.items() if k != 'licn'}
        new_fields = {k:v for k,v in new.items() if k != 'licn'}
        assert old_fields == new_fields, old['id']
        changed = old.get('licn') != new.get('licn')
        assert changed == (old['id'] in manifest['clarified_ids']), old['id']
        entries.append({'id':old['id'], 'title':old['t'], 'license':old['lic'],
                        'license_url':old.get('licu'), 'before_protected_fields_sha256':digest(old_fields),
                        'after_protected_fields_sha256':digest(new_fields), 'protected_fields_unchanged':True,
                        'clarified_note':{'before':old['licn'],'after':new['licn']} if changed else None})
    for old, new in zip(before['register.json']['works'], after['register.json']['works']):
        assert old == new, old['id']
        sources.append({'id':old['id'],'title':old['t'],'license_or_rights_statement':old.get('lic'),
                        'before_sha256':digest(old),'after_sha256':digest(new),'all_fields_unchanged':True})
    for old_tier, new_tier in zip(before['register.json']['policy']['tiers'],after['register.json']['policy']['tiers']):
        for i,(old,new) in enumerate(zip(old_tier['items'],new_tier['items'])):
            assert old == new
            quotes.append({'id':old_tier['key']+':'+str(i),'license':old['lic'],
                           'before_sha256':digest(old),'after_sha256':digest(new),'all_fields_unchanged':True})
    assert before_raw['register.json'] == after_raw['register.json']
    assert before_raw['guide.json'] == after_raw['guide.json']
    assert len(entries) == len(after['acts.json']['acts']) == 1033
    assert len(sources) == len(after['register.json']['works']) == 618
    assert version['tool_license'] == manifest['tool_license']
    return {'effective':manifest['effective'],'site_commit':version['site_commit'],
            'tool_license':manifest['tool_license'],'scope_revision':version['license_scope'],
            'summary':{'entries_verified':len(entries),'sources_verified':len(sources),
                       'policy_quotations_verified':len(quotes),'entry_licenses_changed':0,
                       'source_records_changed':0,'clarified_notes':len(manifest['clarified_ids']),
                       'register_and_guide_bytes_unchanged':True,
                       'entry_license_distribution':dict(collections.Counter(e['license'] for e in entries))},
            'public_data_sha256':{'before':manifest['input_sha256'],'after':manifest['output_sha256']},
            'entries':entries,'sources':sources,'policy_quotations':quotes,
            'preserved_component_files':manifest['preserved_files_sha256']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--site',type=Path,default=ROOT / '_site')
    parser.add_argument('--output',type=Path,required=True)
    args = parser.parse_args()
    report = audit(args.site)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(json.dumps(report['summary']))
