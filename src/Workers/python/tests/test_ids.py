import unittest
from mbb_worker_common.ids import deterministic_event_id
class IdTests(unittest.TestCase):
    def test_deterministic(self):
        source="01900000-0000-7000-8000-000000000001"; self.assertEqual(deterministic_event_id(source,"ocr-completed-v1"),deterministic_event_id(source,"ocr-completed-v1"))
    def test_kind_changes_id(self):
        source="01900000-0000-7000-8000-000000000001"; self.assertNotEqual(deterministic_event_id(source,"a"),deterministic_event_id(source,"b"))
if __name__=="__main__": unittest.main()
