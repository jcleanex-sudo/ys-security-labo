import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { collectVenue } from "./keirin_browser_collector.mjs";

export function jstDateParts(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    year: parts.year,
    month: parts.month,
    day: Number(parts.day),
    monthDay: `${parts.month}/${parts.day}`,
    raceDate: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function createBrowserAdapter(playwrightBrowser) {
  return {
    tabs: {
      async new() {
        const page = await playwrightBrowser.newPage();
        return {
          playwright: page,
          goto: (url) => page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 }),
          url: async () => page.url(),
          close: () => page.close(),
        };
      },
    },
  };
}

async function discoverVenues(page, date) {
  await page.goto(`https://keirin.jp/pc/raceschedule?scym=${date.month}&scyy=${date.year}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  return page.evaluate((targetDay) => Array.from(document.querySelectorAll("tr")).map((row) => {
    const cells = Array.from(row.cells || []);
    let dayCursor = 1;
    let active = false;
    for (let index = 1; index < cells.length; index += 1) {
      const cell = cells[index];
      const span = Number(cell.colSpan || 1);
      const anchor = cell.querySelector('a[data-pprm-href="/pc/racelist"]');
      if (anchor && dayCursor <= targetDay && dayCursor + span - 1 >= targetDay) active = true;
      dayCursor += span;
    }
    const venueLink = row.querySelector('a[href^="/pc/jyosellinfo?jocd="]');
    return {
      name: (venueLink?.textContent || "").trim(),
      code: new URL(venueLink?.href || location.href).searchParams.get("jocd"),
      active,
    };
  }).filter((venue) => venue.active && venue.name && venue.code), date.day);
}

async function main() {
  const permissionReference = String(process.env.KEIRIN_PERMISSION_REFERENCE || "").trim();
  if (!permissionReference) throw new Error("DATA BLOCKED: KEIRIN_PERMISSION_REFERENCE is required");
  const date = process.env.RACE_DATE
    ? (() => { const [year, month, day] = process.env.RACE_DATE.split("-"); return { year, month, day: Number(day), monthDay: `${month}/${day}`, raceDate: process.env.RACE_DATE }; })()
    : jstDateParts();
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(date.raceDate)) throw new Error("DATA BLOCKED: invalid race date");

  const outputDirectory = path.resolve(process.env.KEIRIN_PRIVATE_ROOT || "private_keirin_data");
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const adapter = createBrowserAdapter(browser);
  const results = [];
  try {
    const schedulePage = await browser.newPage();
    const venues = await discoverVenues(schedulePage, date);
    await schedulePage.close();
    if (!venues.length) throw new Error("DATA BLOCKED: no official venues found for today");
    const config = { ...date, permissionReference, outputDirectory, collectResults: true };
    for (let index = 0; index < venues.length; index += 2) {
      results.push(...await Promise.all(venues.slice(index, index + 2).map((venue) => collectVenue(adapter, venue, config))));
    }
  } finally {
    await browser.close();
  }

  const collectedRaces = results.reduce((sum, venue) => sum + venue.saved.length, 0);
  if (!collectedRaces) throw new Error("DATA BLOCKED: no races were saved");
  execFileSync(process.execPath, ["scripts/audit_keirin_daily.mjs", date.raceDate, outputDirectory], { stdio: "inherit" });
  const audit = JSON.parse(await readFile(path.join(outputDirectory, "audit", `${date.raceDate}.json`), "utf8"));
  if (audit.invalid > 0 || audit.races !== collectedRaces) {
    throw new Error(`DATA BLOCKED: audit failed invalid=${audit.invalid} audited=${audit.races} collected=${collectedRaces}`);
  }
  execFileSync(process.execPath, ["scripts/build_keirin_view_data.mjs", date.raceDate, outputDirectory, "keirin/data/today.json"], { stdio: "inherit" });
  execFileSync(process.execPath, ["scripts/build_keirin_learning_status.mjs", outputDirectory, "keirin/data/learning.json"], { stdio: "inherit" });
  const summary = {
    generatedAt: new Date().toISOString(), raceDate: date.raceDate,
    venues: results.length, races: collectedRaces,
    ok: results.reduce((sum, venue) => sum + venue.saved.filter((race) => race.status === "OK").length, 0),
    blocked: results.reduce((sum, venue) => sum + venue.blocked.length, 0),
    results: results.reduce((sum, venue) => sum + venue.saved.filter((race) => race.result === "OK").length, 0),
  };
  await writeFile("keirin/data/collection.json", `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1]?.endsWith("collect_keirin_playwright.mjs")) await main();
