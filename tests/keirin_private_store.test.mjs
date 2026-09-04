import assert from "node:assert/strict";
import test from "node:test";
import { validateRaceRecord, validateResultRecord } from "../scripts/keirin_private_store.mjs";
import { expectedExactaOddsCount, expectedOddsCount, expectedQuinellaOddsCount, expectedTrioOddsCount } from "../scripts/keirin_browser_collector.mjs";

function sampleRecord() {
  return {
    status: "OK",
    scope: "PRIVATE_LOCAL_ONLY",
    publication_allowed: false,
    permission_reference: "test",
    venue: "テスト競輪場",
    race_date: "2026-08-04",
    race_number: 1,
    riders: [{ number: 1 }, { number: 2 }, { number: 3 }],
    odds: {
      "1-2-3": 10, "1-3-2": 11, "2-1-3": 12,
      "2-3-1": 13, "3-1-2": 14, "3-2-1": 15,
    },
  };
}

test("official result requires finish and payout cross-check", () => {
  const record = { status: "OK", scope: "PRIVATE_LOCAL_ONLY", publication_allowed: false, permission_reference: "test", venue: "別府", venue_code: "86", race_date: "2026-08-04", race_number: 7, finish_order: [1, 5, 4, 3], trifecta_combination: "1-5-4", trifecta_payout_yen: 13380 };
  assert.deepEqual(validateResultRecord(record), []);
  assert.ok(validateResultRecord({ ...record, trifecta_combination: "1-4-5" }).includes("trifecta_combination"));
});

test("private store accepts complete trifecta odds", () => {
  assert.deepEqual(validateRaceRecord(sampleRecord()), []);
});

test("private store blocks incomplete trifecta odds", () => {
  const record = sampleRecord();
  delete record.odds["3-2-1"];
  assert.ok(validateRaceRecord(record).includes("odds_complete"));
});

test("private store blocks publication-enabled records", () => {
  const record = sampleRecord();
  record.publication_allowed = true;
  assert.ok(validateRaceRecord(record).includes("publication_allowed"));
});

test("DATA BLOCKED can be recorded without rider details", () => {
  const record = sampleRecord();
  record.status = "DATA BLOCKED";
  record.riders = [];
  record.odds = {};
  assert.deepEqual(validateRaceRecord(record), []);
});

test("nine riders require 504 trifecta odds", () => {
  assert.equal(expectedOddsCount(9), 504);
  assert.equal(expectedTrioOddsCount(9), 84);
  assert.equal(expectedExactaOddsCount(9), 72);
  assert.equal(expectedQuinellaOddsCount(9), 36);
});
