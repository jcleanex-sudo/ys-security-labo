from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "data" / "historical_races.json"
FIELDS = ("race_id", "decided_at", "baseline_probability", "candidate_probability", "market_probability", "odds", "result")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: python scripts/import_history.py approved-history.csv")
    source = Path(sys.argv[1])
    with source.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or not set(FIELDS).issubset(reader.fieldnames):
            raise SystemExit(f"DATA BLOCKED: CSV requires {', '.join(FIELDS)}")
        races = [{key: (int(row[key]) if key == "result" else float(row[key]) if key in {"baseline_probability","candidate_probability","market_probability","odds"} else row[key]) for key in FIELDS} for row in reader]
    payload = json.loads(TARGET.read_text(encoding="utf-8"))
    payload["races"] = races
    payload["source"] = f"manual_import:{source.name}"
    payload["source_terms_confirmed"] = False
    TARGET.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Imported with source_terms_confirmed=false. Confirm rights before validation.")


if __name__ == "__main__":
    main()
