import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "collect_keirin_private.py"
SPEC = importlib.util.spec_from_file_location("collect_keirin_private", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class PrivateCollectorTests(unittest.TestCase):
    def test_schedule_url(self):
        self.assertEqual(
            MODULE.schedule_url("2026-08"),
            "https://keirin.jp/pc/raceschedule?scym=08&scyy=2026",
        )

    def test_rejects_non_official_domain(self):
        with self.assertRaises(ValueError):
            MODULE.validate_url("https://example.com/pc/raceschedule")

    def test_rejects_http(self):
        with self.assertRaises(ValueError):
            MODULE.validate_url("http://keirin.jp/pc/raceschedule")

    def test_extracts_tables(self):
        parser = MODULE.SimpleTableParser()
        parser.feed("<table><tr><th>場</th><th>日</th></tr><tr><td>平塚</td><td>4</td></tr></table>")
        self.assertEqual(parser.tables, [[["場", "日"], ["平塚", "4"]]])

    def test_interval_guard(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            (output / "collector_state.json").write_text(
                '{"last_request_epoch": 9999999999999}', encoding="utf-8"
            )
            with self.assertRaises(RuntimeError):
                MODULE.enforce_interval(output, 60)


if __name__ == "__main__":
    unittest.main()
