import copy
import json
from pathlib import Path
import unittest
from unittest.mock import patch
from import_file_plan import run, validate

DATA = json.loads((Path(__file__).resolve().parents[1] / 'data/file-plans/ssdp-2024-v4.json').read_text())

class SsdpImportTests(unittest.TestCase):
    def test_complete_source_and_page_boundaries(self):
        validate(DATA)
        rows = {r['code']: r for r in DATA['items']}
        self.assertEqual(718, len(rows))
        self.assertEqual(17, sum(r['parentCode'] is None for r in rows.values()))
        self.assertEqual('663', rows['663.99']['parentCode'])  # continued on PDF page 5
        self.assertEqual('952.03.16', rows['952.03.16.02']['parentCode'])  # page 19 -> 20
        self.assertEqual('Ulusal Tahkim', rows['641.02.01']['title'])
        self.assertEqual('Mal Alım İşi', rows['934.01']['title'])
        self.assertEqual('B', rows['641.02.01']['retention'])
        self.assertEqual('A3', rows['641.02.01']['disposal'])
        self.assertNotIn('952.03.01', rows)  # explicitly removed in source
        self.assertTrue(all(not r['isSelectable'] for r in rows.values() if r['parentCode'] is None))
        self.assertFalse(rows['020']['isSelectable'])
        self.assertFalse(rows['030.01']['isSelectable'])

    def test_invalid_parent_is_rejected_before_network(self):
        invalid = copy.deepcopy(DATA)
        invalid['items'][1]['parentCode'] = 'missing'
        with patch('import_file_plan.request') as api:
            with self.assertRaises(ValueError): run(invalid, 'unused', True)
            api.assert_not_called()

    def test_replay_is_read_only_and_drift_is_rejected(self):
        ids = {r['code']: str(i) for i, r in enumerate(DATA['items'])}
        rows = [dict(r, id=ids[r['code']], parentId=ids.get(r['parentCode'])) for r in DATA['items']]
        plan = dict(code=DATA['code'], version=DATA['version'], id='plan')
        def get(api, path, data=None):
            self.assertIsNone(data, 'Replay must never write')
            return {'items': [plan], 'totalCount': 1} if '?' in path else {'items': rows}
        with patch('import_file_plan.request', side_effect=get):
            run(DATA, 'unused', True)
            rows[-1]['title'] = 'changed'
            with self.assertRaises(ValueError): run(DATA, 'unused', True)

if __name__ == '__main__': unittest.main()
