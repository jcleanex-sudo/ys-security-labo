import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const SAFE_PART = /[^0-9A-Za-z_-]+/g;

function safePart(value) {
  const result = String(value ?? "").normalize("NFKC").replace(SAFE_PART, "_").replace(/^_+|_+$/g, "");
  if (!result) throw new Error("empty path component");
  return result.slice(0, 80);
}

export function validateRaceRecord(record) {
  const errors = [];
  if (record?.scope !== "PRIVATE_LOCAL_ONLY") errors.push("scope");
  if (record?.publication_allowed !== false) errors.push("publication_allowed");
  if (!String(record?.permission_reference ?? "").trim()) errors.push("permission_reference");
  if (!String(record?.venue ?? "").trim()) errors.push("venue");
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(String(record?.race_date ?? ""))) errors.push("race_date");
  if (!Number.isInteger(record?.race_number) || record.race_number < 1 || record.race_number > 12) errors.push("race_number");
  if (!Array.isArray(record?.riders) || record.riders.length > 9) errors.push("riders");

  if (record?.status === "OK") {
    if (record.riders.length < 3) errors.push("riders");
    const numbers = record.riders.map((rider) => rider?.number);
    const expected = new Set();
    for (const first of numbers) for (const second of numbers) for (const third of numbers) {
      if (first !== second && first !== third && second !== third) expected.add(`${first}-${second}-${third}`);
    }
    const actual = new Set(Object.keys(record?.odds ?? {}));
    if (expected.size !== actual.size || [...expected].some((key) => !actual.has(key))) errors.push("odds_complete");
    if ([...(actual ?? [])].some((key) => !(Number(record.odds[key]) > 0))) errors.push("odds_positive");
  } else if (record?.status !== "DATA BLOCKED") {
    errors.push("status");
  }
  return errors;
}

export async function saveRaceRecord(record, baseDirectory) {
  const errors = validateRaceRecord(record);
  if (errors.length) throw new Error(`invalid race record: ${errors.join(", ")}`);
  const root = path.resolve(baseDirectory);
  const venue = safePart(record.venue_code || record.venue);
  const extracted = safePart(record.extracted_at || new Date().toISOString());
  const directory = path.join(root, "daily", record.race_date, venue, `race_${String(record.race_number).padStart(2, "0")}`);
  await mkdir(directory, { recursive: true });
  const destination = path.join(directory, `${extracted}.json`);
  const temporary = `${destination}.tmp`;
  await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await rename(temporary, destination);
  return destination;
}

export function validateResultRecord(record) {
  const errors = [];
  if (record?.scope !== "PRIVATE_LOCAL_ONLY") errors.push("scope");
  if (record?.publication_allowed !== false) errors.push("publication_allowed");
  if (!String(record?.permission_reference ?? "").trim()) errors.push("permission_reference");
  if (!String(record?.venue ?? "").trim()) errors.push("venue");
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(String(record?.race_date ?? ""))) errors.push("race_date");
  if (!Number.isInteger(record?.race_number) || record.race_number < 1 || record.race_number > 12) errors.push("race_number");
  if (record?.status === "OK") {
    const top3 = Array.isArray(record.finish_order) ? record.finish_order.slice(0, 3) : [];
    if (top3.length !== 3 || top3.some((number) => !Number.isInteger(number) || number < 1 || number > 9) || new Set(top3).size !== 3) errors.push("finish_order");
    if (record.trifecta_combination !== top3.join("-")) errors.push("trifecta_combination");
    if (!Number.isInteger(record.trifecta_payout_yen) || record.trifecta_payout_yen <= 0) errors.push("trifecta_payout_yen");
  } else if (record?.status !== "DATA BLOCKED") errors.push("status");
  return [...new Set(errors)];
}

export async function saveResultRecord(record, baseDirectory) {
  const errors = validateResultRecord(record);
  if (errors.length) throw new Error(`invalid result record: ${errors.join(", ")}`);
  const venue = safePart(record.venue_code || record.venue);
  const extracted = safePart(record.extracted_at || new Date().toISOString());
  const directory = path.join(path.resolve(baseDirectory), "results", record.race_date, venue, `race_${String(record.race_number).padStart(2, "0")}`);
  await mkdir(directory, { recursive: true });
  const destination = path.join(directory, `${extracted}.json`);
  const temporary = `${destination}.tmp`;
  await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await rename(temporary, destination);
  return destination;
}
