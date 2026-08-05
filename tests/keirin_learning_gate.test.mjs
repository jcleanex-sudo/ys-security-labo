import assert from "node:assert/strict";
import test from "node:test";
import { evaluateLearningSafety } from "../scripts/build_keirin_learning_status.mjs";

test("learning stays blocked while result labels are missing", () => {
  const result = evaluateLearningSafety({ dataCompleteness: 100, labeledResults: 0, observedDays: 1 });
  assert.equal(result.allowed, false);
  assert.ok(result.failed.includes("labeledResults"));
  assert.ok(result.failed.includes("chronologicalSplit"));
  assert.ok(result.failed.includes("maximumDrawdown"));
});

test("learning is allowed only after every safety gate passes", () => {
  const result = evaluateLearningSafety({
    dataCompleteness: 99,
    labeledResults: 300,
    observedDays: 90,
    chronologicalSplit: true,
    profitFactor: 1.2,
    maximumDrawdown: 12,
    confidenceInterval95: true,
  });
  assert.equal(result.allowed, true);
  assert.deepEqual(result.failed, []);
});
