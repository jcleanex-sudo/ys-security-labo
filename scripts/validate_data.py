from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    print(f"DATA BLOCKED: {message}", file=sys.stderr)
    raise SystemExit(1)


def load(name: str) -> dict:
    path = ROOT / "data" / name
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"{name} is unreadable: {type(exc).__name__}")
    if not isinstance(value, dict):
        fail(f"{name} must contain an object")
    return value


def validate_history(payload: dict) -> None:
    races = payload.get("races")
    if not isinstance(races, list):
        fail("historical_races.json races must be an array")
    if races and not payload.get("source_terms_confirmed"):
        fail("source_terms_confirmed must be true before history can be used")
    required = {"race_id", "decided_at", "baseline_probability", "candidate_probability", "market_probability", "odds", "result"}
    seen: set[str] = set()
    for index, race in enumerate(races):
        if not isinstance(race, dict) or not required.issubset(race):
            fail(f"race[{index}] is missing required fields")
        race_id = str(race["race_id"])
        if race_id in seen:
            fail(f"duplicate race_id: {race_id}")
        seen.add(race_id)
        try:
            datetime.fromisoformat(str(race["decided_at"]).replace("Z", "+00:00"))
            values = [float(race[key]) for key in ("baseline_probability", "candidate_probability", "market_probability", "odds")]
        except (TypeError, ValueError):
            fail(f"race[{index}] has invalid date or number")
        if not all(0 <= value <= 1 for value in values[:3]) or values[3] <= 1:
            fail(f"race[{index}] has out-of-range probabilities or odds")
        if race["result"] not in (0, 1, False, True):
            fail(f"race[{index}] result must be 0 or 1")


def main() -> None:
    validate_history(load("historical_races.json"))
    model = load("model.json")
    weights = model.get("active_weights")
    if not isinstance(weights, dict) or not weights or abs(sum(float(value) for value in weights.values()) - 1) > 1e-9:
        fail("model weights must exist and sum to 1")
    load("status.json")
    print("OK: data contracts are valid")


if __name__ == "__main__":
    main()
