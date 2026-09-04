import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseOfficialPerformance, parseOfficialRiderIdentities } from "../keirin/core.js";

const [date, privateRootArg = "private_keirin_data", outputArg = "keirin/data/today.json"] = process.argv.slice(2);
if (!/^20\d{2}-\d{2}-\d{2}$/.test(date || "")) {
  throw new Error("usage: node scripts/build_keirin_view_data.mjs YYYY-MM-DD [private-root] [output]");
}

const privateRoot = path.resolve(privateRootArg);
const dailyRoot = path.join(privateRoot, "daily", date);
const venueDirs = (await readdir(dailyRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .sort((a, b) => a.name.localeCompare(b.name));

const venues = [];
let permissionReference = "";
const basicQuality = (record) => {
  const riders = record.riders || [];
  const performance = parseOfficialPerformance(record.basic_tables, riders);
  const named = riders.filter((rider) => rider.name).length;
  const aligned = record.alignment_table?.[1]?.[0] ? 1 : 0;
  return performance.length * 100 + named * 10 + aligned;
};
for (const venueDir of venueDirs) {
  const venuePath = path.join(dailyRoot, venueDir.name);
  const raceDirs = (await readdir(venuePath, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^race_\d{2}$/.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  const races = [];
  for (const raceDir of raceDirs) {
    const racePath = path.join(venuePath, raceDir.name);
    const files = (await readdir(racePath)).filter((name) => name.endsWith(".json")).sort();
    if (!files.length) continue;
    const records = await Promise.all(files.map(async (name) => JSON.parse(await readFile(path.join(racePath, name), "utf8"))));
    const record = records.at(-1);
    const basicRecord = [...records].sort((a, b) => basicQuality(b) - basicQuality(a)
      || String(b.extracted_at).localeCompare(String(a.extracted_at)))[0];
    const performance = new Map();
    for (const source of [...records].sort((a, b) => basicQuality(b) - basicQuality(a))) {
      for (const item of parseOfficialPerformance(source.basic_tables, source.riders)) {
        if (!performance.has(item.number)) performance.set(item.number, item);
      }
      for (const rider of source.riders || []) {
        if (rider.performance && !performance.has(Number(rider.number))) performance.set(Number(rider.number), rider.performance);
      }
    }
    const identityByNumber = new Map();
    for (const source of records) for (const rider of [...(source.riders || []), ...parseOfficialRiderIdentities(source.basic_tables)]) {
      const number = Number(rider.number);
      if (!Number.isInteger(number)) continue;
      const quality = [rider.name, rider.prefecture, rider.class_history, rider.style].filter(Boolean).length;
      const previous = identityByNumber.get(number);
      if (!previous || quality > previous.quality) identityByNumber.set(number, { rider, quality });
    }
    permissionReference ||= String(record.permission_reference || "");
    const oddsKeys = Object.keys(record.odds || {});
    const oddsRiderNumbers = [...new Set(oddsKeys.flatMap((key) => key.split("-").map(Number)).filter(Number.isInteger))].sort((a, b) => a - b);
    races.push({
      number: record.race_number,
      status: record.status,
      blockReason: record.block_reason,
      oddsUpdatedAt: record.odds_updated_at || null,
      oddsCount: oddsKeys.length,
      expectedOddsCount: record.expected_odds_count ?? null,
      raceClass: basicRecord.race_class || record.race_class || null,
      distanceM: basicRecord.distance_m || record.distance_m || null,
      startTime: record.start_time || basicRecord.start_time || null,
      oddsExtractedAt: record.extracted_at || null,
      basicExtractedAt: basicRecord.extracted_at || null,
      snapshotCount: records.length,
      riders: [...new Set([
        ...oddsRiderNumbers,
        ...records.flatMap((source) => (source.riders || []).map((rider) => Number(rider.number)).filter(Number.isInteger)),
      ])].sort((a, b) => a - b).map((number) => {
        const rider = identityByNumber.get(number)?.rider || {};
        return {
          number,
          name: rider.name || "",
          prefecture: rider.prefecture || "",
          classHistory: rider.class_history || "",
          style: rider.style || "",
          mark: rider.mark || rider.raw_cells?.[1] || "",
          performance: rider.performance || performance.get(number) || null,
        };
      }),
      alignment: basicRecord.alignment_table?.[1]?.[0] || record.alignment_table?.[1]?.[0] || null,
      riderNumbers: oddsRiderNumbers.length
        ? oddsRiderNumbers
        : (record.riders || []).map((rider) => Number(rider.number)).filter(Number.isInteger),
      odds: record.status === "OK" ? record.odds : {},
      trioOddsUpdatedAt: record.trio_odds_updated_at || null,
      trioOddsCount: Object.keys(record.trio_odds || {}).length,
      expectedTrioOddsCount: record.expected_trio_odds_count ?? null,
      trioOdds: record.status === "OK" ? (record.trio_odds || {}) : {},
      exactaOddsUpdatedAt: record.exacta_odds_updated_at || null,
      exactaOddsCount: Object.keys(record.exacta_odds || {}).length,
      expectedExactaOddsCount: record.expected_exacta_odds_count ?? null,
      exactaOdds: record.status === "OK" ? (record.exacta_odds || {}) : {},
      quinellaOddsUpdatedAt: record.quinella_odds_updated_at || null,
      quinellaOddsCount: Object.keys(record.quinella_odds || {}).length,
      expectedQuinellaOddsCount: record.expected_quinella_odds_count ?? null,
      quinellaOdds: record.status === "OK" ? (record.quinella_odds || {}) : {},
    });
  }
  venues.push({
    code: venueDir.name,
    name: races.length ? (JSON.parse(await readFile(path.join(venuePath, raceDirs[0].name, (await readdir(path.join(venuePath, raceDirs[0].name))).filter((name) => name.endsWith(".json")).sort().at(-1)), "utf8")).venue || `競輪場 ${venueDir.name}`) : `競輪場 ${venueDir.name}`,
    races,
  });
}

const payload = {
  schemaVersion: 2,
  raceDate: date,
  generatedAt: new Date().toISOString(),
  permissionReference: permissionReference || "DATA BLOCKED",
  source: "KEIRIN.JP",
  notice: "許可済みデータから表示に必要な項目だけを整形。欠損値の推測補完はしていません。",
  venues,
};

const output = path.resolve(outputArg);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, venues: venues.length, races: venues.reduce((sum, venue) => sum + venue.races.length, 0) }, null, 2));
