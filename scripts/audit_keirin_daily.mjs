import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateRaceRecord } from "./keirin_private_store.mjs";

const [date, rootArg = "private_keirin_data"] = process.argv.slice(2);
if (!/^20\d{2}-\d{2}-\d{2}$/.test(date || "")) {
  throw new Error("usage: node scripts/audit_keirin_daily.mjs YYYY-MM-DD [data-root]");
}

const root = path.resolve(rootArg);
const daily = path.join(root, "daily", date);
const venueDirectories = (await readdir(daily, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .sort((a, b) => a.name.localeCompare(b.name));

const races = [];
for (const venueEntry of venueDirectories) {
  const venuePath = path.join(daily, venueEntry.name);
  const raceDirectories = (await readdir(venuePath, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^race_\d{2}$/.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const raceEntry of raceDirectories) {
    const racePath = path.join(venuePath, raceEntry.name);
    const files = (await readdir(racePath)).filter((name) => name.endsWith(".json")).sort();
    if (!files.length) continue;
    const latest = files.at(-1);
    const fullPath = path.join(racePath, latest);
    try {
      const record = JSON.parse(await readFile(fullPath, "utf8"));
      const validationErrors = validateRaceRecord(record);
      races.push({
        venue_code: venueEntry.name,
        venue: record.venue,
        race_number: record.race_number,
        status: validationErrors.length ? "INVALID" : record.status,
        odds_count: Object.keys(record.odds || {}).length,
        expected_odds_count: record.expected_odds_count ?? null,
        extracted_at: record.extracted_at,
        validation_errors: validationErrors,
        file: path.relative(root, fullPath),
      });
    } catch (error) {
      races.push({
        venue_code: venueEntry.name,
        race_number: Number(raceEntry.name.slice(-2)),
        status: "INVALID",
        validation_errors: [String(error?.message || error)],
        file: path.relative(root, fullPath),
      });
    }
  }
}

const summary = {
  race_date: date,
  generated_at: new Date().toISOString(),
  scope: "PRIVATE_LOCAL_ONLY",
  publication_allowed: false,
  venues: new Set(races.map((race) => race.venue_code)).size,
  races: races.length,
  ok: races.filter((race) => race.status === "OK").length,
  data_blocked: races.filter((race) => race.status === "DATA BLOCKED").length,
  invalid: races.filter((race) => race.status === "INVALID").length,
  records: races,
};

const manifestDirectory = path.join(root, "audit");
await mkdir(manifestDirectory, { recursive: true });
const destination = path.join(manifestDirectory, `${date}.json`);
await writeFile(destination, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...summary, records: undefined, manifest: destination }, null, 2));
