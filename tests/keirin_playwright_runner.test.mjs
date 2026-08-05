import assert from "node:assert/strict";
import test from "node:test";
import { jstDateParts } from "../scripts/collect_keirin_playwright.mjs";

test("scheduled collector derives the race date in JST", () => {
  assert.deepEqual(jstDateParts(new Date("2026-08-05T15:30:00Z")), {
    year: "2026", month: "08", day: 6, monthDay: "08/06", raceDate: "2026-08-06",
  });
});
