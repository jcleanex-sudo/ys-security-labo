import { saveRaceRecord } from "./keirin_private_store.mjs";
import { saveOfficialResult } from "./keirin_browser_result_collector.mjs";

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForLocator(locator, timeoutMilliseconds = 15_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    if (await locator.count() > 0) return;
    await pause(200);
  }
  throw new Error("page transition timed out");
}

export const expectedOddsCount = (riderCount) => riderCount * (riderCount - 1) * (riderCount - 2);

async function extractBasic(tab) {
  return tab.playwright.evaluate(() => {
    const bodyText = document.body.innerText || "";
    const raceMatch = bodyText.match(/\n(\d{1,2})R\s+([^\n]+?)\s+(\d+)m/);
    const tableRows = (table) => Array.from(table?.rows || []).map((row) =>
      Array.from(row.cells || []).map((cell) => (cell.innerText || "").trim().replace(/\s+/g, " ")),
    ).filter((row) => row.some(Boolean));
    const keyTables = Array.from(document.querySelectorAll("table"))
      .filter((table) => /枠\s*番|直近4ヶ月成績|競走得点|並び予想|決まり手/.test(table.innerText || "") && (table.innerText || "").length < 25000)
      .sort((a, b) => (a.innerText || "").length - (b.innerText || "").length)
      .slice(0, 16)
      .map(tableRows);
    const candidateRows = Array.from(document.querySelectorAll("tr")).filter((row) => {
      const link = Array.from(row.querySelectorAll("a")).find((anchor) => /\s/.test((anchor.textContent || "").trim()) && (anchor.textContent || "").trim().length <= 20);
      return link && /\/(?:SS|S[12]|A[12]|L[12])/.test(row.innerText || "");
    });
    const seen = new Set();
    const riders = [];
    for (const row of candidateRows) {
      const nameLink = Array.from(row.querySelectorAll("a")).find((anchor) => /\s/.test((anchor.textContent || "").trim()) && (anchor.textContent || "").trim().length <= 20);
      const name = (nameLink?.textContent || "").trim().replace(/\s+/g, " ");
      if (!name || seen.has(name)) continue;
      const cells = Array.from(row.cells || []).map((cell) => (cell.innerText || "").trim().replace(/\s+/g, " "));
      const numberCell = cells.find((value) => /^[1-9]$/.test(value));
      const detail = cells.find((value) => value.includes(name) && /\//.test(value)) || row.innerText || "";
      const detailMatch = detail.replace(name, "").match(/([^/]+)\/([^/\s]+)\/([^\s]+)/);
      riders.push({
        number: numberCell ? Number(numberCell) : null,
        name,
        prefecture: (detailMatch?.[1] || "").replace(/\s+/g, ""),
        class_history: detailMatch?.[2] || "",
        style: detailMatch?.[3] || "",
        raw_cells: cells,
      });
      seen.add(name);
      if (riders.length >= 9) break;
    }
    return {
      race_class: raceMatch?.[2] || "",
      distance_m: raceMatch ? Number(raceMatch[3]) : null,
      riders,
      basic_tables: keyTables,
    };
  });
}

async function extractOdds(tab) {
  const raw = await tab.playwright.evaluate(() => {
    const bodyText = document.body.innerText || "";
    const oddsByFirst = {};
    const numbers = [];
    for (let number = 1; number <= 9; number += 1) {
      if (document.getElementById(`o3tLnkSyaban${number}`)) numbers.push(number);
    }
    const selectors = [];
    for (const first of numbers) {
      oddsByFirst[String(first)] = {};
      for (const second of numbers) for (const third of numbers) {
        if (first !== second && first !== third && second !== third) selectors.push(`#OZZ${first}${second}${third}`);
      }
    }
    (selectors.length ? document.querySelectorAll(selectors.join(",")) : []).forEach((element) => {
      const match = element.id.match(/^OZZ([1-9])([1-9])([1-9])$/);
      const value = (element.textContent || "").trim().replace(/,/g, "");
      if (match && /^\d+(?:\.\d+)?$/.test(value)) oddsByFirst[match[1]][`${match[1]}-${match[2]}-${match[3]}`] = Number(value);
    });
    const updateMatch = bodyText.match(/(\d{2}:\d{2})\s*現在/);
    const votesMatch = (document.querySelector("table.htb_tbl")?.innerText || "").match(/([\d,]+)/);
    const tableRows = (table) => Array.from(table?.rows || []).map((row) =>
      Array.from(row.cells || []).map((cell) => (cell.innerText || "").trim().replace(/\s+/g, " ")),
    ).filter((row) => row.some(Boolean));
    const alignment = Array.from(document.querySelectorAll("table"))
      .filter((table) => (table.innerText || "").includes("並び予想"))
      .sort((a, b) => (a.innerText || "").length - (b.innerText || "").length)[0];
    return {
      odds_by_first: oddsByFirst,
      numbers,
      odds_updated_at: updateMatch?.[1] || "",
      sales_votes: votesMatch ? Number(votesMatch[1].replace(/,/g, "")) : null,
      alignment_table: alignment ? tableRows(alignment) : [],
    };
  });
  return {
    ...raw,
    odds: Object.assign({}, ...Object.values(raw.odds_by_first || {})),
  };
}

export async function collectVenue(browser, venue, config) {
  const tab = await browser.tabs.new();
  const saved = [];
  const blocked = [];
  try {
    await tab.goto(`https://keirin.jp/pc/raceschedule?scym=${config.month}&scyy=${config.year}`);
    const events = await tab.playwright.evaluate(() => Array.from(document.querySelectorAll("tr")).map((row) => {
      const cells = Array.from(row.cells || []);
      let dayCursor = 1;
      const links = [];
      for (let index = 1; index < cells.length; index += 1) {
        const cell = cells[index];
        const span = Number(cell.colSpan || 1);
        const startDay = dayCursor;
        const endDay = dayCursor + span - 1;
        const anchor = cell.querySelector('a[data-pprm-href="/pc/racelist"]');
        if (anchor) links.push({
          startDay,
          endDay,
          encp: anchor.getAttribute("data-pprm-encp"),
          disp: anchor.getAttribute("data-pprm-dkbn") === "2" ? "PJ0302" : "PJ0301",
        });
        dayCursor += span;
      }
      return {
        code: new URL(row.querySelector('a[href^="/pc/jyosellinfo?jocd="]')?.href || location.href).searchParams.get("jocd"),
        links,
      };
    }));
    const event = events.find((item) => item.code === venue.code)?.links
      .find((item) => item.startDay <= config.day && item.endDay >= config.day);
    if (!event) throw new Error("current event link not found");
    const eventLink = tab.playwright.locator(`a[data-pprm-href="/pc/racelist"][data-pprm-encp="${event.encp}"]`);
    if (await eventLink.count() !== 1) throw new Error("event link not unique");
    if (typeof tab.postNavigation === "function") {
      await tab.postNavigation("/pc/racelist", { encp: event.encp, disp: event.disp });
    } else {
      await eventLink.click();
    }
    await waitForLocator(tab.playwright.locator('a[name="hhlnkRaceDate"]'));
    const dateOptions = await tab.playwright.evaluate(() => Array.from(document.querySelectorAll('a[name="hhlnkRaceDate"]')).map((anchor) => ({ id: anchor.id, text: anchor.textContent.trim() })));
    const dateOption = dateOptions.find((item) => item.text.startsWith(config.monthDay));
    if (!dateOption) throw new Error(`${config.monthDay} date tab not found`);
    await tab.playwright.locator(`#${dateOption.id}`).click();
    await waitForLocator(tab.playwright.locator('button[id^="hhRaceBtn"]'));
    let raceIds = await tab.playwright.evaluate(() => Array.from(document.querySelectorAll('button[id^="hhRaceBtn"]')).filter((button) => !button.disabled && /^hhRaceBtn\d+$/.test(button.id)).map((button) => button.id));
    raceIds = [...new Set(raceIds)].sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")));

    for (const raceId of raceIds) {
      const raceNumber = Number(raceId.replace(/\D/g, ""));
      try {
        await tab.playwright.locator(`#${raceId}`).click();
        await pause(320);
        const basicButton = tab.playwright.locator("#rcbtn1");
        if (await basicButton.count() === 1) {
          await basicButton.click();
          await pause(130);
        }
        const basic = await extractBasic(tab);
        const oddsButton = tab.playwright.locator("#rcbtn6");
        if (await oddsButton.count() !== 1) throw new Error("odds tab missing");
        // KEIRIN.JP sometimes leaves a transparent navigation layer above this
        // already-verified, unique tab button. A forced click targets only the
        // confirmed #rcbtn6 element and avoids treating that presentation layer
        // as missing source data.
        await oddsButton.click({ force: true });
        await pause(320);
        const oddsData = await extractOdds(tab);
        const riderMap = new Map((basic.riders || []).filter((rider) => rider.number).map((rider) => [rider.number, rider]));
        const riderNumbers = oddsData.numbers.length
          ? oddsData.numbers
          : [...riderMap.keys()].sort((a, b) => a - b);
        const riders = riderNumbers.map((number) => riderMap.get(number) || { number, name: "", prefecture: "", class_history: "", style: "", raw_cells: [] });
        const expected = expectedOddsCount(riders.length);
        const oddsCount = Object.keys(oddsData.odds).length;
        const status = oddsCount === expected && expected > 0 ? "OK" : "DATA BLOCKED";
        const record = {
          status,
          block_reason: status === "OK" ? null : `odds unavailable or incomplete ${oddsCount}/${expected}`,
          scope: "PRIVATE_LOCAL_ONLY",
          publication_allowed: false,
          permission_reference: config.permissionReference,
          source_url: await tab.url(),
          venue: venue.name,
          venue_code: venue.code,
          race_date: config.raceDate,
          race_number: raceNumber,
          race_class: basic.race_class,
          distance_m: basic.distance_m,
          riders,
          basic_tables: basic.basic_tables,
          alignment_table: oddsData.alignment_table,
          odds_type: "trifecta",
          odds_updated_at: oddsData.odds_updated_at,
          sales_votes: oddsData.sales_votes,
          odds: oddsData.odds,
          odds_count: oddsCount,
          expected_odds_count: expected,
          extracted_at: new Date().toISOString(),
        };
        const destination = await saveRaceRecord(record, config.outputDirectory);
        let resultStatus = "NOT_AVAILABLE";
        if (config.collectResults === true) {
          const resultButton = tab.playwright.locator("#rcbtn8");
          if (await resultButton.count() === 1 && await resultButton.isEnabled()) {
            await resultButton.click({ force: true });
            await pause(250);
            const resultRecord = await saveOfficialResult(tab, venue, { ...config, raceNumber });
            resultStatus = resultRecord.status;
          }
        }
        saved.push({ race: raceNumber, status, odds: oddsCount, expected, result: resultStatus, path: destination });
        if (status !== "OK") blocked.push({ race: raceNumber, reason: record.block_reason });
      } catch (error) {
        blocked.push({ race: raceNumber, reason: String(error?.message || error) });
      }
    }
    return { venue: venue.name, races: raceIds.length, saved, blocked };
  } finally {
    await tab.close();
  }
}
