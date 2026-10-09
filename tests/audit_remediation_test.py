"""Source-facing and import safeguards for the October 9 audit corrections."""
import copy, hashlib, json, pathlib, sys, tempfile, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
from check_release import check, check_urls
class AuditCorrections(unittest.TestCase):
 def test_policy_segments_are_reproducible(self):
  snapshot=json.loads((ROOT/'docs/research/policy-excerpts-2026-10-09.json').read_text())
  reg=json.loads((ROOT/'data/register.json').read_text())
  current={q['who']:q for tier in reg['policy']['tiers'] for q in tier['items']}
  self.assertEqual(len(snapshot['examples']),21)
  for item in snapshot['examples']:
   text=item['source_text'];ranges=item['ranges'];q=current[item['contributor']]
   self.assertEqual(hashlib.sha256(text.encode()).hexdigest(),item['source_text_sha256'])
   self.assertTrue(all(0<=a<b<=len(text) for a,b in ranges))
   self.assertTrue(all(ranges[i][1]<=ranges[i+1][0] for i in range(len(ranges)-1)))
   quote=('… ' if ranges[0][0]>0 else '')+' … '.join(text[a:b] for a,b in ranges)+(' …' if ranges[-1][1]<len(text) else '')
   self.assertEqual(q['quote'],quote,item['contributor'])
   self.assertEqual(q['lic'],item['previous_display']['lic'])
   self.assertEqual(q['lic'],item['displayed_license'])
   self.assertEqual(q['source_row'],item['row'])
   self.assertEqual(q['accessed'],snapshot['accessed'])
  self.assertIn('research or summarization',current['Kendra Albert']['quote'])
  self.assertIn('each week',current['Ricela Feliciano']['quote'])
  self.assertIn('LIS 408',current['David McHugh']['course'])
  self.assertIn('LIS 640',current['David McHugh']['version_note'])
  for tier in reg['policy']['tiers']:
   self.assertNotIn('Runs in a course',tier['reads'])
  self.assertIn('accessibility',reg['policy']['tiers'][0]['gist'])
 def test_external_url_allowlist(self):
  for value in ['javascript:alert(1)','data:text/html,test','vbscript:x','//example.org','https://example.org/\nx',True,['https://example.org'],'https://']:
   self.assertTrue(check_urls({'url':value}),repr(value))
  for value in ['https://doi.org/10.1/example','http://example.org/a?b=1&c=2','']:
   self.assertFalse(check_urls({'link':value}))
 def test_release_rejects_unsafe_url_even_with_valid_fingerprint(self):
  with tempfile.TemporaryDirectory() as d:
   dest=pathlib.Path(d)
   for p in (ROOT/'data').glob('*.json'): (dest/p.name).write_bytes(p.read_bytes())
   acts=json.loads((dest/'acts.json').read_text());acts['acts'][0]['url']='javascript:alert(1)'
   raw=json.dumps(acts).encode();(dest/'acts.json').write_bytes(raw)
   rel=json.loads((dest/'release.json').read_text());rel['files']['acts.json']={'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
   (dest/'release.json').write_text(json.dumps(rel))
   errors,_=check(dest)
   self.assertTrue(any('external link' in e for e in errors))
 def test_edition_and_unavailable_source_remain_distinct(self):
  reg=json.loads((ROOT/'data/register.json').read_text());works={w['id']:w for w in reg['works']}
  for id,edition in [('CSR-0206','august-2025'),('CSR-0210','january-2024'),('CSR-0213','august-2026')]:
   self.assertTrue(works[id]['link'].endswith('/'+edition+'/'))
   self.assertEqual(works[id]['doi'],'10.37514/TWR-J.2024.2.1.01')
  self.assertIn('not-found',works['SRC-0181']['access'])
if __name__=='__main__':unittest.main()
