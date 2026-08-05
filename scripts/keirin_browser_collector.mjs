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
    const bodyText = document.body?.innerText || "";
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
        mark: cells[1] || "",
        raw_cells: cells,
      });
      seen.add(name);
      if (riders.length >= 9) break;
    }
    riders.sort((a, b) => Number(a.number) - Number(b.number));
    const performanceTable = keyTables.find((table) => table.flat().join(" ").includes("直近4ヶ月成績"));
    const performanceRows = (performanceTable || []).filter((row) => /^\d{2,3}\.\d{1,2}$/.test(String(row?.[0] || "").trim()));
    performanceRows.slice(0, riders.length).forEach((row, index) => {
      const rates = String(row[3] || "").match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
      const moves = String(row[1] || "").match(/\d+/g)?.map(Number) || [];
      const bhs = String(row[2] || "").match(/\d+/g)?.map(Number) || [];
      riders[index].performance = {
        rating: Number(row[0]),
        winRate: rates[0] ?? null,
        top2Rate: rates[1] ?? null,
        top3Rate: rates[2] ?? null,
        escapeWins: moves[0] ?? null,
        sprintWins: moves[1] ?? null,
        passWins: moves[2] ?? null,
        markWins: moves[3] ?? null,
        backstretch: bhs[0] ?? null,
        home: bhs[1] ?? null,
        starts: bhs[2] ?? null,
      };
    });
    return {
      race_number: raceMatch ? Number(raceMatch[1]) : null,
      race_class: raceMatch?.[2] || "",
      distance_m: raceMatch ? Number(raceMatch[3]) : null,
      riders,
      basic_tables: keyTables,
    };
  });
}

async function extractOdds(tab) {
  const raw = await tab.playwright.evaluate(() => {
    const bodyText = document.body?.innerText || "";
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
    let raceOptions = await tab.playwright.evaluate(() => Array.from(document.querySelectorAll('button[id^="hhRaceBtn"]')).filter((button) => !button.disabled && /^hhRaceBtn\d+$/.test(button.id)).map((button) => ({
      id: button.id,
      startTime: (button.innerText || "").match(/\d{2}:\d{2}/)?.[0] || null,
    })));
    raceOptions = [...new Map(raceOptions.map((option) => [option.id, option])).values()]
      .sort((a, b) => Number(a.id.replace(/\D/g, "")) - Number(b.id.replace(/\D/g, "")));

    for (const raceOption of raceOptions) {
      const raceId = raceOption.id;
      const raceNumber = Number(raceId.replace(/\D/g, ""));
      try {
        await tab.playwright.locator(`#${raceId}`).click();
        await pause(320);
        const basicButton = tab.playwright.locator("#rcbtn1");
        if (await basicButton.count() === 1) {
          await basicButton.click();
          await pause(130);
        }
        let basic = await extractBasic(tab);
        if (basic.race_number && basic.race_number !== raceNumber) throw new Error(`race selection mismatch expected=${raceNumber} actual=${basic.race_number}`);
        const oddsButton = tab.playwright.locator("#rcbtn6");
        if (await oddsButton.count() !== 1) throw new Error("odds tab missing");
        // KEIRIN.JP sometimes leaves a transparent navigation layer above this
        // already-verified, unique tab button. A forced click targets only the
        // confirmed #rcbtn6 element and avoids treating that presentation layer
        // as missing source data.
        await oddsButton.click({ force: true });
        await pause(320);
        let oddsData = await extractOdds(tab);
        let preliminaryExpected = expectedOddsCount(oddsData.numbers.length || basic.riders.length);
        if (Object.keys(oddsData.odds).length !== preliminaryExpected) {
          await pause(700);
          await oddsButton.click({ force: true });
          await pause(320);
          const retryOdds = await extractOdds(tab);
          if (Object.keys(retryOdds.odds).length > Object.keys(oddsData.odds).length) oddsData = retryOdds;
        }
        const performanceCount = basic.riders.filter((rider) => Number.isFinite(Number(rider.performance?.rating))).length;
        const expectedRiders = oddsData.numbers.length || basic.riders.length;
        if ((basic.riders.length !== expectedRiders || performanceCount !== basic.riders.length) && await basicButton.count() === 1) {
          await basicButton.click({ force: true });
          await pause(400);
          const retryBasic = await extractBasic(tab);
          const basicQuality = (candidate) => candidate.riders.filter((rider) => rider.name).length
            + candidate.riders.filter((rider) => Number.isFinite(Number(rider.performance?.rating))).length * 2;
          if (basicQuality(retryBasic) > basicQuality(basic)) basic = retryBasic;
          await oddsButton.click({ force: true });
          await pause(320);
        }
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
          start_time: raceOption.startTime,
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
        const reason = String(error?.message || error);
        blocked.push({ race: raceNumber, reason });
        try {
          const destination = await saveRaceRecord({
            status: "DATA BLOCKED",
            block_reason: reason,
            scope: "PRIVATE_LOCAL_ONLY",
            publication_allowed: false,
            permission_reference: config.permissionReference,
            source_url: await tab.url(),
            venue: venue.name,
            venue_code: venue.code,
            race_date: config.raceDate,
            race_number: raceNumber,
            riders: [],
            odds_type: "trifecta",
            odds: {},
            odds_count: 0,
            expected_odds_count: 0,
            extracted_at: new Date().toISOString(),
          }, config.outputDirectory);
          saved.push({ race: raceNumber, status: "DATA BLOCKED", odds: 0, expected: 0, result: "NOT_AVAILABLE", path: destination });
        } catch (saveError) {
          blocked[blocked.length - 1].reason = `${reason}; blocked-record save failed: ${String(saveError?.message || saveError)}`;
        }
      }
    }
    return { venue: venue.name, races: raceOptions.length, saved, blocked };
  } finally {
    await tab.close();
  }
}
