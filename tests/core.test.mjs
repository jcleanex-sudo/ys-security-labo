import assert from "node:assert/strict";
import test from "node:test";
import { buildFormation, decide, netEdge, orderedProbability, ticketEdge } from "../core.js";

test("net edge deducts cost", () => assert.equal(netEdge(68, 58, 2), 8));
test("blank numbers are treated as missing", () => assert.equal(netEdge("", 58, 2), null));
test("formation always makes 6 main and 6 cover tickets", () => {
  const result = buildFormation([{number:1,score:40},{number:2,score:25},{number:3,score:18},{number:4,score:10},{number:5,score:7}]);
  assert.equal(result.main.length, 6); assert.equal(result.cover.length, 6);
  assert.equal(new Set([...result.main,...result.cover].map((ticket) => ticket.join("-"))).size, 12);
});
test("ordered probability uses conditional remaining scores", () => assert.ok(Math.abs(orderedProbability([6,3,1],[0,1,2]) - 0.45) < 1e-9));
test("ticket edge is blocked without odds", () => assert.equal(ticketEdge([{number:1,score:6},{number:2,score:3},{number:3,score:1}],[1,2,3],"",2), null));
test("missing data returns DATA BLOCKED", () => assert.equal(decide({}).status, "DATA BLOCKED"));
test("all safety gates return UP", () => {
  const now = new Date("2026-08-04T00:00:00Z");
  const result = decide({date:"2026-08-04",startTime:"12:00",observedAt:"2026-08-04T08:50:00+09:00",modelProbability:70,marketProbability:60,confidence:72,agreement:70,dataRate:100,costRate:2}, now);
  assert.equal(result.status, "UP"); assert.equal(result.reason, "厳格仮想枠");
});
