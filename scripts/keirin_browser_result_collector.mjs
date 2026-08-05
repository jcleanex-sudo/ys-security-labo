import { saveResultRecord } from "./keirin_private_store.mjs";

export async function extractOfficialResult(tab) {
  return tab.playwright.evaluate(() => {
    const finishOrder = Array.from(document.querySelector("#rrDispTyakuJyun")?.rows || []).slice(1)
      .map((row) => Number(row.cells?.[1]?.innerText?.trim())).filter(Number.isInteger);
    const payoutText = document.querySelector("#rrDispHaraiGaku")?.innerText || "";
    const trifecta = payoutText.match(/3連単\s*([1-9]-[1-9]-[1-9])\s*([\d,]+)円/);
    return { finish_order: finishOrder, trifecta_combination: trifecta?.[1] || "", trifecta_payout_yen: trifecta ? Number(trifecta[2].replace(/,/g, "")) : null };
  });
}

export async function saveOfficialResult(tab, venue, config) {
  const result = await extractOfficialResult(tab);
  const raceNumber = Number(config.raceNumber);
  const top3 = result.finish_order.slice(0, 3).join("-");
  const ok = result.finish_order.length >= 3 && top3 === result.trifecta_combination && Number.isInteger(result.trifecta_payout_yen);
  const record = {
    status: ok ? "OK" : "DATA BLOCKED",
    block_reason: ok ? null : "official result is unavailable, incomplete, or failed cross-check",
    scope: "PRIVATE_LOCAL_ONLY", publication_allowed: false,
    permission_reference: config.permissionReference, source_url: await tab.url(),
    venue: venue.name, venue_code: venue.code, race_date: config.raceDate, race_number: raceNumber,
    ...result, extracted_at: new Date().toISOString(),
  };
  const destination = await saveResultRecord(record, config.outputDirectory);
  return { ...record, destination };
}
