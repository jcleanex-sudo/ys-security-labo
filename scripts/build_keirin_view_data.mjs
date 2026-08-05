import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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
    const record = JSON.parse(await readFile(path.join(racePath, files.at(-1)), "utf8"));
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
      raceClass: record.race_class || null,
      distanceM: record.distance_m || null,
      riders: (record.riders || []).map((rider) => ({
        number: Number(rider.number),
        name: rider.name || "",
        prefecture: rider.prefecture || "",
        classHistory: rider.class_history || "",
        style: rider.style || "",
      })).filter((rider) => Number.isInteger(rider.number)),
      alignment: record.alignment_table?.[1]?.[0] || null,
      riderNumbers: oddsRiderNumbers.length
        ? oddsRiderNumbers
        : (record.riders || []).map((rider) => Number(rider.number)).filter(Number.isInteger),
      odds: record.status === "OK" ? record.odds : {},
    });
  }
  venues.push({
    code: venueDir.name,
    name: races.length ? (JSON.parse(await readFile(path.join(venuePath, raceDirs[0].name, (await readdir(path.join(venuePath, raceDirs[0].name))).filter((name) => name.endsWith(".json")).sort().at(-1)), "utf8")).venue || `競輪場 ${venueDir.name}`) : `競輪場 ${venueDir.name}`,
    races,
  });
}

const payload = {
  schemaVersion: 1,
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
