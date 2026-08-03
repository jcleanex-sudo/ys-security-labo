from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HISTORY = ROOT / "data" / "historical_races.json"
MODEL = ROOT / "data" / "model.json"
STATUS = ROOT / "data" / "status.json"
MIN_TOTAL = 200
MIN_VALIDATION = 60
EDGE = 0.03
STAKE = 100.0


def metrics(rows: list[dict], field: str) -> dict:
    pnl: list[float] = []
    wins = 0
    for row in rows:
        probability = float(row[field])
        market = float(row["market_probability"])
        if probability - market < EDGE:
            continue
        won = int(row["result"]) == 1
        wins += int(won)
        pnl.append(STAKE * (float(row["odds"]) - 1) if won else -STAKE)
    equity = peak = drawdown = 0.0
    for value in pnl:
        equity += value
        peak = max(peak, equity)
        drawdown = max(drawdown, peak - equity)
    gains = sum(value for value in pnl if value > 0)
    losses = -sum(value for value in pnl if value < 0)
    total = len(pnl)
    rate = wins / total if total else 0.0
    margin = 1.96 * math.sqrt(rate * (1 - rate) / total) if total else 0.0
    return {
        "bets": total, "wins": wins, "net_profit": round(sum(pnl), 2),
        "profit_factor": round(gains / losses, 3) if losses else None,
        "max_drawdown": round(drawdown, 2), "win_rate": rate,
        "win_rate_ci95": [max(0.0, rate - margin), min(1.0, rate + margin)] if total else None,
    }


def main() -> None:
    history = json.loads(HISTORY.read_text(encoding="utf-8"))
    model = json.loads(MODEL.read_text(encoding="utf-8"))
    rows = sorted(history.get("races", []), key=lambda row: row["decided_at"])
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    response = {
        "history": {"total_races": len(rows), "validated_races": 0, "net_profit": None, "profit_factor": None, "max_drawdown": None, "win_rate_ci95": None},
        "learning": {"status": "DATA BLOCKED", "message": f"利用条件を確認した過去レースが不足しています（最低{MIN_TOTAL}件、検証期間{MIN_VALIDATION}件）", "logic_version": model["logic_version"], "evaluated_at": now, "weight_updated": False},
    }
    if len(rows) < MIN_TOTAL:
        STATUS.write_text(json.dumps(response, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(response["learning"]["message"])
        return
    split = int(len(rows) * 0.7)
    training, validation = rows[:split], rows[split:]
    if len(validation) < MIN_VALIDATION or training[-1]["decided_at"] >= validation[0]["decided_at"]:
        response["learning"]["message"] = "時系列分割の安全基準を満たしていません"
        STATUS.write_text(json.dumps(response, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return
    baseline = metrics(validation, "baseline_probability")
    candidate = metrics(validation, "candidate_probability")
    ci_ok = candidate["win_rate_ci95"] and baseline["win_rate_ci95"] and candidate["win_rate_ci95"][0] >= baseline["win_rate_ci95"][0]
    pf_ok = candidate["profit_factor"] is not None and candidate["profit_factor"] >= 1.05 and (baseline["profit_factor"] is None or candidate["profit_factor"] >= baseline["profit_factor"])
    safety_pass = candidate["bets"] >= MIN_VALIDATION and candidate["net_profit"] > max(0, baseline["net_profit"]) and candidate["max_drawdown"] <= max(STAKE, baseline["max_drawdown"] * 1.05) and pf_ok and ci_ok
    response["history"] = {
        "total_races": len(rows), "validated_races": len(validation), "net_profit": candidate["net_profit"], "profit_factor": candidate["profit_factor"],
        "max_drawdown": candidate["max_drawdown"], "win_rate_ci95": "–".join(f"{value * 100:.1f}%" for value in candidate["win_rate_ci95"]) if candidate["win_rate_ci95"] else None,
    }
    response["learning"].update(status="WATCH", message="候補重みは安全基準未達のため不採用")
    if safety_pass:
        candidate_weights = history.get("candidate_weights")
        if isinstance(candidate_weights, dict) and abs(sum(float(value) for value in candidate_weights.values()) - 1) < 1e-9:
            model.update(active_weights=candidate_weights, updated_at=now, update_reason="walk_forward_all_safety_gates_passed")
            MODEL.write_text(json.dumps(model, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            response["learning"].update(status="UP", message="旧ロジック → 新ロジック：時系列外部検証の全安全基準を通過", weight_updated=True)
    STATUS.write_text(json.dumps(response, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(response["learning"]["message"])


if __name__ == "__main__":
    main()
