import json
import pathlib
import sys
import tempfile
import unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'tools'))
from editorial import editorial_bytes

class EditorialTests(unittest.TestCase):
    def check(self, value):
        with tempfile.TemporaryDirectory() as d:
            p=pathlib.Path(d)/'review.json';p.write_text(json.dumps(value))
            return json.loads(editorial_bytes(p,{'A-1'}))
    def record(self):
        return {'version':1,'entries':{'A-1':{'reviewer':'Reviewer','checkedOn':'2026-11-17','scope':'Source description only','uncertainty':'Preparation time not established'}}}
    def test_empty_and_scoped_review(self):
        self.assertEqual(self.check({'version':1,'entries':{}})['entries'],{})
        self.assertEqual(self.check(self.record()),self.record())
    def test_claims_need_sources_and_estimates_need_basis(self):
        for extra in [{'effort':{'preparation':'30 minutes'}},{'use':{'kind':'reported','note':'Used'}},{'evidence':{'kind':'outcome_report','note':'Improved'}},{'checkedOn':'2026-02-31'},{'privateNotes':'Must not publish'}]:
            v=self.record();v['entries']['A-1'].update(extra)
            with self.assertRaises(ValueError):self.check(v)
    def test_unknown_id_rejected(self):
        v=self.record();v['entries']['UNKNOWN']=v['entries'].pop('A-1')
        with self.assertRaises(ValueError):self.check(v)
