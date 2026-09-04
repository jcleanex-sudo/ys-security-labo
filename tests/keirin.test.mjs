import assert from "node:assert/strict";
import test from "node:test";
import { analyzeKeirinRace, analyzeMarketOdds, buildKeirinFormation, keirinTicketEdge, orderedChance, parseOfficialPerformance, parseOfficialRiderIdentities } from "../keirin/core.js";

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

test("market analysis returns an index and ten candidates", () => {
  const odds = {};
  let value = 5;
  for (const first of [1, 2, 3, 4, 5]) for (const second of [1, 2, 3, 4, 5]) for (const third of [1, 2, 3, 4, 5]) {
    if (new Set([first, second, third]).size === 3) odds[`${first}-${second}-${third}`] = value++;
  }
  const result = analyzeMarketOdds(odds, "OK");
  assert.ok(result.index > 0 && result.index <= 99);
  assert.equal(result.tickets.length, 10);
  assert.match(result.scenario, /1着軸/);
});

test("official four-month performance is mapped by rider number", () => {
  const tables = [[
    ["直近4ヶ月成績 ※ 率は％表示"],
    ["競走得点", "決まり手", "B H S", "勝率 ２連対率 ３連対率"],
    ["88.50", "1 2 3 4", "5 6 7", "20 40 60"],
    ["86.25", "0 1 2 3", "2 3 4", "10 30 50"],
  ]];
  const parsed = parseOfficialPerformance(tables, [{ number: 2 }, { number: 1 }]);
  assert.deepEqual(parsed.map((item) => item.number), [1, 2]);
  assert.equal(parsed[0].rating, 88.5);
  assert.equal(parsed[0].top3Rate, 60);
});

test("official entry table recovers every rider identity without guessing", () => {
  const tables = [[
    ["枠番", "印", "車番", "選手名 府県/級班前現/脚質", "期別"],
    ["", "", "6", "吉川 悟 大 阪/A3A2/追", "79 49"],
    ["", "▲", "7", "柴田 功一郎 神奈川/A3A2/追", "79 50"],
  ]];
  const riders = parseOfficialRiderIdentities(tables);
  assert.equal(riders[0].name, "吉川 悟");
  assert.equal(riders[0].prefecture, "大阪");
  assert.equal(riders[1].name, "柴田 功一郎");
  assert.equal(riders[1].style, "追");
});

test("hybrid analysis exposes model probability, agreement and net edge", () => {
  const odds = {};
  for (const first of [1, 2, 3, 4, 5]) for (const second of [1, 2, 3, 4, 5]) for (const third of [1, 2, 3, 4, 5]) {
    if (new Set([first, second, third]).size === 3) odds[`${first}-${second}-${third}`] = 4 + first * 8 + second * 2 + third;
  }
  const riders = [1, 2, 3, 4, 5].map((number) => ({
    number,
    performance: { rating: 92 - number, winRate: 30 - number, top2Rate: 50 - number, top3Rate: 70 - number, escapeWins: 8 - number, sprintWins: 6 - number, passWins: 5 - number, markWins: 4 - number, backstretch: 10 - number, home: 8 - number, starts: 6 - number },
  }));
  const result = analyzeKeirinRace({ status: "OK", odds, riders, alignment: "1 2 3 4 5" });
  assert.equal(result.modelReady, true);
  assert.equal(result.dataRate, 100);
  assert.equal(result.tickets.length, 10);
  assert.ok(result.agreement >= 0 && result.agreement <= 100);
  assert.ok(Number.isFinite(result.tickets[0].modelProbability));
  assert.ok(Number.isFinite(result.tickets[0].netEdge));
  assert.equal(result.logicName, "べた子式・競輪複合因子 v1");
  assert.equal(result.modelAxis, 1);
  assert.equal(result.agreement, 100);
  assert.equal(result.riderAssessments.length, 5);
  assert.equal(result.riderAssessments[0].number, 1);
  assert.equal(result.riderAssessments[0].abilityIndex, 71);
  assert.equal(result.riderAssessments[0].tacticalLabel, "自在");
  assert.equal(result.riderAssessments[0].alignmentPosition, 1);
  assert.notEqual(result.tickets[0].modelProbability, result.tickets[0].marketProbability);
  assert.ok(Number.isFinite(result.tickets[0].expectedProfitYen));
});

test("betako safety gate marks weak factor agreement as SKIP", () => {
  const odds = {};
  for (const first of [1, 2, 3, 4, 5]) for (const second of [1, 2, 3, 4, 5]) for (const third of [1, 2, 3, 4, 5]) {
    if (new Set([first, second, third]).size === 3) odds[`${first}-${second}-${third}`] = 5 + first + second + third;
  }
  const riders = [1, 2, 3, 4, 5].map((number) => ({
    number,
    performance: { rating: number === 1 ? 95 : 80 + number, winRate: number === 2 ? 40 : 10, top2Rate: number === 3 ? 60 : 20, top3Rate: number === 4 ? 80 : 30, escapeWins: number === 5 ? 9 : 1, sprintWins: 0, passWins: number === 2 ? 8 : 1, markWins: 0, backstretch: number, home: number, starts: number },
  }));
  const result = analyzeKeirinRace({ status: "OK", odds, riders, alignment: "1 2 3 4 5" });
  assert.equal(result.selectionPassed, false);
  assert.equal(result.recommendation, "SKIP");
});

test("hybrid edge stays blocked when official performance is incomplete", () => {
  const result = analyzeKeirinRace({ status: "OK", odds: { "1-2-3": 10 }, riders: [{ number: 1 }] });
  assert.equal(result.modelReady, false);
  assert.deepEqual(result.edgeTickets, []);
});

test("betako tactical model blocks when official alignment is missing", () => {
  const complete = [1, 2, 3, 4, 5].map((number) => ({
    number,
    style: number === 1 ? "逃" : "追",
    performance: { rating: 90, winRate: 20, top2Rate: 40, top3Rate: 60, escapeWins: 1, sprintWins: 1, passWins: 1, markWins: 1, backstretch: 1, home: 1, starts: 1 },
  }));
  const result = analyzeKeirinRace({ status: "OK", odds: { "1-2-3": 10 }, riders: complete });
  assert.equal(result.modelReady, false);
  assert.equal(result.alignmentVerified, false);
  assert.match(result.scenario, /並び予想/);
});
