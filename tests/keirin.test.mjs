import assert from "node:assert/strict";
import test from "node:test";
import { buildKeirinFormation, keirinTicketEdge, orderedChance } from "../keirin/core.js";

const riders = [
  { number: 1, score: 40 },
  { number: 2, score: 25 },
  { number: 3, score: 18 },
  { number: 4, score: 10 },
  { number: 5, score: 7 },
];

test("keirin formation creates six main and six cover tickets", () => {
  const result = buildKeirinFormation(riders);
  assert.equal(result.main.length, 6);
  assert.equal(result.cover.length, 6);
  assert.equal(new Set([...result.main, ...result.cover].map((ticket) => ticket.join("-"))).size, 12);
});

test("keirin ordered chance uses the remaining rider pool", () => {
  const probability = orderedChance(
    [{ number: 1, score: 6 }, { number: 2, score: 3 }, { number: 3, score: 1 }],
    [1, 2, 3],
  );
  assert.ok(Math.abs(probability - 0.45) < 1e-9);
});

test("keirin ticket edge stays blocked until odds are entered", () => {
  assert.equal(keirinTicketEdge(riders, [1, 2, 3], "", 2), null);
});
