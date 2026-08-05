import importlib.util
import itertools
import sys
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "validate_keirin_race_export.py"
SPEC = importlib.util.spec_from_file_location("validate_keirin_race_export", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def valid_payload():
    numbers = [1, 2, 3]
    return {
        "scope": "PRIVATE_LOCAL_ONLY",
        "publication_allowed": False,
        "permission_reference": "test-permission",
        "venue": "テスト競輪場",
        "race_date": "2026-08-04",
        "race_number": 1,
        "riders": [{"number": number} for number in numbers],
        "odds": {"-".join(map(str, combo)): 10.0 for combo in itertools.permutations(numbers, 3)},
        "odds_count": 6,
    }


class RaceExportTests(unittest.TestCase):
    def test_complete_odds_pass(self):
        self.assertEqual(MODULE.validate(valid_payload()), [])

    def test_missing_odds_blocks(self):
        payload = valid_payload()
        payload["odds"].pop("1-2-3")
        errors = MODULE.validate(payload)
        self.assertTrue(any("missing odds" in error for error in errors))

    def test_publication_flag_blocks(self):
        payload = valid_payload()
        payload["publication_allowed"] = True
        self.assertIn("publication_allowed must be false", MODULE.validate(payload))


if __name__ == "__main__":
    unittest.main()
