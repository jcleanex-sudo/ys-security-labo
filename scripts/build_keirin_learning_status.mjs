import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyzeKeirinRace, parseOfficialPerformance } from "../keirin/core.js";

export const SAFETY_LIMITS = Object.freeze({
  minimumLabeledResults: 200,
  minimumObservedDays: 60,
  minimumDataCompleteness: 95,
  minimumProfitFactor: 1.05,
  maximumDrawdown: 20,
});

export function evaluateLearningSafety(metrics) {
  const gates = {
    dataCompleteness: Number(metrics.dataCompleteness) >= SAFETY_LIMITS.minimumDataCompleteness,
    labeledResults: Number(metrics.labeledResults) >= SAFETY_LIMITS.minimumLabeledResults,
    observedDays: Number(metrics.observedDays) >= SAFETY_LIMITS.minimumObservedDays,
    chronologicalSplit: metrics.chronologicalSplit === true,
    profitFactor: Number(metrics.profitFactor) >= SAFETY_LIMITS.minimumProfitFactor,
    maximumDrawdown: metrics.maximumDrawdown !== null
      && metrics.maximumDrawdown !== undefined
      && metrics.maximumDrawdown !== ""
      && Number.isFinite(Number(metrics.maximumDrawdown))
      && Number(metrics.maximumDrawdown) <= SAFETY_LIMITS.maximumDrawdown,
    confidenceInterval95: metrics.confidenceInterval95 === true,
  };
  const failed = Object.entries(gates).filter(([, passed]) => !passed).map(([name]) => name);
  return { allowed: failed.length === 0, gates, failed };
}

async function walkJson(directory) {
  const files = [];
  try {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) files.push(...await walkJson(target));
      else if (entry.isFile() && entry.name.endsWith(".json")) files.push(target);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return files;
}

function wilsonInterval(successes, total) {
  if (!total) return null;
  const z = 1.959963984540054;
  const proportion = successes / total;
  const denominator = 1 + z ** 2 / total;
  const center = (proportion + z ** 2 / (2 * total)) / denominator;
  const margin = z * Math.sqrt((proportion * (1 - proportion) + z ** 2 / (4 * total)) / total) / denominator;
  return { lower: Number((Math.max(0, center - margin) * 100).toFixed(1)), upper: Number((Math.min(1, center + margin) * 100).toFixed(1)) };
}

export async function buildLearningStatus(privateRoot) {
  const dailyRoot = path.join(privateRoot, "daily");
  const snapshotFiles = await walkJson(dailyRoot);
  const snapshots = [];
  for (const file of snapshotFiles) {
    try { snapshots.push(JSON.parse(await readFile(file, "utf8"))); } catch { /* invalid snapshots are excluded and counted below */ }
  }
  const latestByRace = new Map();
  const snapshotsByRace = new Map();
  for (const record of snapshots) {
    const key = `${record.race_date}|${record.venue_code}|${record.race_number}`;
    if (!snapshotsByRace.has(key)) snapshotsByRace.set(key, []);
    snapshotsByRace.get(key).push(record);
    const previous = latestByRace.get(key);
    if (!previous || String(record.extracted_at) > String(previous.extracted_at)) latestByRace.set(key, record);
  }
  const latest = [...latestByRace.values()];
  const completeLatest = latest.filter((record) => record.status === "OK").length;
  const observedDates = new Set(latest.map((record) => record.race_date).filter(Boolean));
  const resultFiles = await walkJson(path.join(privateRoot, "results"));
  const results = [];
  for (const file of resultFiles) {
    try { results.push(JSON.parse(await readFile(file, "utf8"))); } catch { /* invalid results are excluded */ }
  }
  const latestResultByRace = new Map();
  for (const record of results) {
    const key = `${record.race_date}|${record.venue_code}|${record.race_number}`;
    const previous = latestResultByRace.get(key);
    if (!previous || String(record.extracted_at) > String(previous.extracted_at)) latestResultByRace.set(key, record);
  }
  const labeled = [...latestResultByRace.values()].filter((record) => record.status === "OK" && Array.isArray(record.finish_order) && record.finish_order.length >= 3);
  let marketTop10Hits = 0;
  let betakoTop10Hits = 0;
  let evaluableRaces = 0;
  for (const [key, raceSnapshots] of snapshotsByRace) {
    const result = latestResultByRace.get(key);
    if (result?.status !== "OK" || !result.trifecta_combination) continue;
    const oddsRecord = [...raceSnapshots].filter((record) => record.status === "OK" && Object.keys(record.odds || {}).length > 0)
      .sort((a, b) => String(b.extracted_at).localeCompare(String(a.extracted_at)))[0];
    if (!oddsRecord) continue;
    const basicRecord = [...raceSnapshots].sort((a, b) => {
      const performanceDifference = parseOfficialPerformance(b.basic_tables, b.riders).length - parseOfficialPerformance(a.basic_tables, a.riders).length;
      if (performanceDifference) return performanceDifference;
      return (b.riders || []).filter((rider) => rider.name).length - (a.riders || []).filter((rider) => rider.name).length;
    })[0];
    const performance = new Map(parseOfficialPerformance(basicRecord.basic_tables, basicRecord.riders).map((item) => [item.number, item]));
    const riders = (basicRecord.riders || []).filter((rider) => Number.isInteger(Number(rider.number))).map((rider) => ({
      number: Number(rider.number),
      performance: rider.performance || performance.get(Number(rider.number)) || null,
    }));
    const analysis = analyzeKeirinRace({ status: "OK", odds: oddsRecord.odds, riders });
    if (!analysis.modelReady) continue;
    const marketTop10 = Object.entries(oddsRecord.odds).sort((a, b) => Number(a[1]) - Number(b[1])).slice(0, 10).map(([combo]) => combo);
    evaluableRaces += 1;
    if (marketTop10.includes(result.trifecta_combination)) marketTop10Hits += 1;
    if (analysis.tickets.some((ticket) => ticket.combo === result.trifecta_combination)) betakoTop10Hits += 1;
  }
  const diagnostics = {
    status: evaluableRaces ? "RETROSPECTIVE_ONLY" : "DATA BLOCKED",
    logicName: "べた子式・競輪複合因子 v1",
    evaluableRaces,
    marketTop10Hits,
    betakoTop10Hits,
    marketTop10HitRate: evaluableRaces ? Number((marketTop10Hits / evaluableRaces * 100).toFixed(1)) : null,
    betakoTop10HitRate: evaluableRaces ? Number((betakoTop10Hits / evaluableRaces * 100).toFixed(1)) : null,
    betakoHitRateInterval95: wilsonInterval(betakoTop10Hits, evaluableRaces),
    eligibleForWeightUpdate: false,
  };
  const dataCompleteness = latest.length ? completeLatest / latest.length * 100 : 0;
  const metrics = {
    dataCompleteness,
    labeledResults: labeled.length,
    observedDays: observedDates.size,
    chronologicalSplit: false,
    profitFactor: null,
    maximumDrawdown: null,
    confidenceInterval95: evaluableRaces >= SAFETY_LIMITS.minimumLabeledResults && observedDates.size >= SAFETY_LIMITS.minimumObservedDays,
  };
  const safety = evaluateLearningSafety(metrics);
  return {
    generatedAt: new Date().toISOString(),
    status: safety.allowed ? "READY" : "DATA BLOCKED",
    snapshots: snapshotFiles.length,
    parsedSnapshots: snapshots.length,
    resultSnapshots: resultFiles.length,
    uniqueRaces: latest.length,
    completeLatest,
    labeledResults: labeled.length,
    observedDays: observedDates.size,
    dataCompleteness: Number(dataCompleteness.toFixed(1)),
    chronologicalSplit: false,
    profitFactor: null,
    maximumDrawdown: null,
    confidenceInterval95: diagnostics.betakoHitRateInterval95,
    diagnostics,
    weightUpdateAllowed: safety.allowed,
    failedGates: safety.failed,
    limits: SAFETY_LIMITS,
    note: safety.allowed
      ? "全安全基準を通過しました。別工程の承認後にのみ重み更新できます。"
      : "べた子式・競輪複合因子の回顧診断のみ実施。結果ラベル・検証期間・時系列分割が安全基準を満たすまで、重みは更新しません。",
  };
}

if (process.argv[1]?.endsWith("build_keirin_learning_status.mjs")) {
  const [privateRootArg = "private_keirin_data", outputArg = "keirin/data/learning.json"] = process.argv.slice(2);
  const status = await buildLearningStatus(path.resolve(privateRootArg));
  const output = path.resolve(outputArg);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(status, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ output, status: status.status, snapshots: status.snapshots, uniqueRaces: status.uniqueRaces, labeledResults: status.labeledResults }, null, 2));
}
