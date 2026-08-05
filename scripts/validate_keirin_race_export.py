#!/usr/bin/env python3
"""Validate a private KEIRIN race/odds browser export without publishing it."""

from __future__ import annotations

import argparse
import itertools
import json
import sys
from pathlib import Path


def validate(payload: dict) -> list[str]:
    errors: list[str] = []
    if payload.get("scope") != "PRIVATE_LOCAL_ONLY":
        errors.append("scope must be PRIVATE_LOCAL_ONLY")
    if payload.get("publication_allowed") is not False:
        errors.append("publication_allowed must be false")
    if not str(payload.get("permission_reference") or "").strip():
        errors.append("permission_reference is required")
    if not str(payload.get("venue") or "").strip():
        errors.append("venue is required")
    if not str(payload.get("race_date") or "").strip():
        errors.append("race_date is required")
    if not isinstance(payload.get("race_number"), int):
        errors.append("race_number must be an integer")

    riders = payload.get("riders")
    if not isinstance(riders, list) or not 3 <= len(riders) <= 9:
        errors.append("riders must contain 3 to 9 entries")
        return errors
    numbers = [rider.get("number") for rider in riders if isinstance(rider, dict)]
    if len(numbers) != len(riders) or any(not isinstance(number, int) for number in numbers):
        errors.append("every rider needs an integer number")
        return errors
    if len(set(numbers)) != len(numbers):
        errors.append("rider numbers must be unique")

    odds = payload.get("odds")
    if not isinstance(odds, dict):
        errors.append("odds must be an object")
        return errors
    expected = {"-".join(map(str, combo)) for combo in itertools.permutations(numbers, 3)}
    actual = set(odds)
    missing = sorted(expected - actual)
    extra = sorted(actual - expected)
    if missing:
        errors.append(f"missing odds: {', '.join(missing[:10])}")
    if extra:
        errors.append(f"unexpected odds: {', '.join(extra[:10])}")
    if any(not isinstance(value, (int, float)) or value <= 0 for value in odds.values()):
        errors.append("all odds must be positive numbers")
    if payload.get("odds_count") != len(odds):
        errors.append("odds_count does not match odds")
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="ローカル競輪オッズJSONの完全性を検証します。")
    parser.add_argument("json_file", type=Path)
    args = parser.parse_args(argv)
    try:
        payload = json.loads(args.json_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"DATA BLOCKED: JSONを読めません: {exc}", file=sys.stderr)
        return 1
    errors = validate(payload)
    if errors:
        print("DATA BLOCKED: " + "; ".join(errors), file=sys.stderr)
        return 1
    print(json.dumps({"status": "OK", "odds_count": len(payload["odds"])}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
