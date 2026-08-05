import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

export async function buildLearningStatus(privateRoot) {
  const dailyRoot = path.join(privateRoot, "daily");
  const snapshotFiles = await walkJson(dailyRoot);
  const snapshots = [];
  for (const file of snapshotFiles) {
    try { snapshots.push(JSON.parse(await readFile(file, "utf8"))); } catch { /* invalid snapshots are excluded and counted below */ }
  }
  const latestByRace = new Map();
  for (const record of snapshots) {
    const key = `${record.race_date}|${record.venue_code}|${record.race_number}`;
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
  const dataCompleteness = latest.length ? completeLatest / latest.length * 100 : 0;
  const metrics = {
    dataCompleteness,
    labeledResults: labeled.length,
    observedDays: observedDates.size,
    chronologicalSplit: false,
    profitFactor: null,
    maximumDrawdown: null,
    confidenceInterval95: false,
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
    confidenceInterval95: null,
    weightUpdateAllowed: safety.allowed,
    failedGates: safety.failed,
    limits: SAFETY_LIMITS,
    note: safety.allowed
      ? "全安全基準を通過しました。別工程の承認後にのみ重み更新できます。"
      : "結果ラベルと検証期間が不足しているため、重みは更新していません。",
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
