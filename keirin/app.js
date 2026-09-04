import { analyzeKeirinRace } from "./core.js?v=20260905-2";

const $ = (selector) => document.querySelector(selector);
let dataset = { venues: [], raceDate: "" };
let selectedVenueCode = "";
let selectedRaceNumber = 1;
let isRefreshing = false;
const AUTO_REFRESH_MS = 60_000;
function selectedVenue() { return dataset.venues.find((venue) => venue.code === selectedVenueCode); }
function selectedRace() { return selectedVenue()?.races.find((race) => race.number === selectedRaceNumber); }
function fmtDate(value) { return value ? value.replaceAll("-", "/") : "--"; }
function formatOdds(value) { return Number(value).toLocaleString("ja-JP", { maximumFractionDigits: 1 }); }
function analyzeRace(race) {
  return analyzeKeirinRace(race);
}
function currentJstDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function loadData({ initial = false } = {}) {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    const cacheBuster = `t=${Date.now()}`;
    const [response, learningResponse] = await Promise.all([
      fetch(`./data/today.json?${cacheBuster}`, { cache: "no-store" }),
      fetch(`./data/learning.json?${cacheBuster}`, { cache: "no-store" }),
    ]);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    dataset = await response.json();
    const dateMatches = dataset.raceDate === currentJstDate();
    if (!dateMatches) {
      dataset.venues = dataset.venues.map((venue) => ({
        ...venue,
        races: venue.races.map((race) => ({ ...race, status: "DATA BLOCKED", blockReason: `開催日不一致：保存${dataset.raceDate} / 今日${currentJstDate()}` })),
      }));
    }
    if (learningResponse.ok) renderLearning(await learningResponse.json());
    $("#raceDate").value = dataset.raceDate;
    if (initial || !selectedVenueCode) {
      const query = new URLSearchParams(location.search);
      selectedVenueCode = query.get("venue") || dataset.venues[0]?.code || "";
      selectedRaceNumber = Number(query.get("race")) || selectedVenue()?.races[0]?.number || 1;
    }
    if (!selectedVenue()) selectedVenueCode = dataset.venues[0]?.code || "";
    if (!selectedRace()) selectedRaceNumber = selectedVenue()?.races[0]?.number || 1;
    renderAll();
    const updatedAt = new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
    $("#sourceBadge").textContent = dateMatches
      ? `${fmtDate(dataset.raceDate)} / ${dataset.source}・自動更新 ${updatedAt}`
      : `DATA BLOCKED：${fmtDate(dataset.raceDate)}は前日データ`;
  } catch (error) {
    $("#sourceBadge").textContent = "DATA BLOCKED";
    $("#blockedMessage").textContent = `表示データを読み込めません: ${error.message}`;
    $("#mobileStatus").textContent = "DATA BLOCKED";
  } finally {
    isRefreshing = false;
  }
}

function renderLearning(status) {
  const ready = status?.weightUpdateAllowed === true;
  $("#learningStatus").textContent = ready ? "READY" : "DATA BLOCKED";
  $("#learningStatus").className = `status ${ready ? "ok" : "blocked"}`;
  $("#learningSnapshots").textContent = `${status?.snapshots ?? 0}件`;
  $("#learningCompleteness").textContent = `${status?.completeLatest ?? 0}/${status?.uniqueRaces ?? 0}R (${status?.dataCompleteness ?? 0}%)`;
  $("#learningLabels").textContent = `${status?.labeledResults ?? 0}/${status?.limits?.minimumLabeledResults ?? 200}件`;
  $("#learningDays").textContent = `${status?.observedDays ?? 0}/${status?.limits?.minimumObservedDays ?? 60}日`;
  const labels = {
    dataCompleteness: "データ完全性 95%以上",
    labeledResults: "結果ラベル 200件以上",
    observedDays: "検証期間 60日以上",
    chronologicalSplit: "未来情報を混ぜない時系列分割",
    profitFactor: "利益係数 1.05以上",
    maximumDrawdown: "最大ドローダウン 20%以下",
    confidenceInterval95: "95%信頼区間を算出",
  };
  const failed = new Set(status?.failedGates || []);
  $("#learningGates").replaceChildren(...Object.entries(labels).map(([key, label]) => {
    const row = document.createElement("div");
    const passed = !failed.has(key);
    row.className = passed ? "gate-pass" : "gate-blocked";
    row.innerHTML = `<span>${passed ? "✓" : "—"}</span><b>${label}</b><em>${passed ? "通過" : "未達"}</em>`;
    return row;
  }));
  $("#weightUpdate").textContent = ready ? "許可" : "禁止";
  $("#weightUpdate").className = ready ? "allowed" : "denied";
  const diagnostic = status?.diagnostics?.evaluableRaces
    ? ` 診断${status.diagnostics.evaluableRaces}R：市場上位10点${status.diagnostics.marketTop10HitRate}% → べた子式${status.diagnostics.betakoTop10HitRate ?? status.diagnostics.hybridTop10HitRate}%（重み更新には未使用）。`
    : "";
  $("#learningNote").textContent = `${status?.note || "検証状況を取得できません。"}${diagnostic}`;
}

function renderSummary() {
  const races = dataset.venues.flatMap((venue) => venue.races);
  const ready = races.filter((race) => race.status === "OK").length;
  const blocked = races.length - ready;
  $("#venueCount").textContent = `${dataset.venues.length}場`;
  $("#raceCount").textContent = `${races.length}R`;
  $("#availableCount").textContent = `${ready}R`;
  $("#summaryVenues").textContent = dataset.venues.length;
  $("#summaryRaces").textContent = races.length;
  $("#summaryReady").textContent = ready;
  $("#summaryBlocked").textContent = blocked;
  $("#sourceBadge").textContent = `${fmtDate(dataset.raceDate)} / ${dataset.source}`;
  $("#mobileStatus").textContent = `${ready}/${races.length}R 取得済み`;
}

function renderRecommendations() {
  const ranked = dataset.venues.flatMap((venue) => venue.races.map((race) => ({ venue, race, analysis: analyzeRace(race) })))
    .filter((item) => item.race.status === "OK" && item.analysis.modelReady)
    .sort((a, b) => Number(b.analysis.selectionPassed) - Number(a.analysis.selectionPassed) || (b.analysis.rankScore || 0) - (a.analysis.rankScore || 0) || a.race.number - b.race.number)
    .slice(0, 3);
  $("#recommendedGrid").replaceChildren(...ranked.map((item, position) => {
    const card = document.createElement("article");
    card.className = `recommend-card rank-${position + 1}`;
    const tickets = (item.analysis.primaryTickets || item.analysis.tickets).slice(0, 3).map((ticket) => `<span>${ticket.betType || "3連単"} ${ticket.combo} <b>予測${formatOdds(ticket.modelProbability * 100)}%</b></span>`).join("");
    card.innerHTML = `<div class="recommend-rank"><b>${position + 1}</b><span>位</span></div><div class="recommend-body"><div class="race-card-top"><h3>${item.venue.name} ${item.race.number}R</h3><span class="index-badge">${item.analysis.recommendation}・${item.analysis.grade} / ${item.analysis.index}</span></div><p>${item.analysis.scenario}</p><div class="mini-tickets">${tickets}</div><button type="button">このレースを見る</button></div>`;
    card.querySelector("button").onclick = () => { selectedVenueCode = item.venue.code; selectedRaceNumber = item.race.number; syncUrl(); renderAll(); scrollTo({ top: $("#raceDetail").offsetTop - 16, behavior: "smooth" }); };
    return card;
  }));
}

function renderVenueTabs() {
  const host = $("#venueTabs");
  host.replaceChildren(...dataset.venues.map((venue) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = venue.name;
    button.className = venue.code === selectedVenueCode ? "active" : "";
    button.onclick = () => {
      selectedVenueCode = venue.code;
      selectedRaceNumber = venue.races[0]?.number || 1;
      syncUrl(); renderAll();
    };
    return button;
  }));
}

function renderRaceTabs() {
  const host = $("#raceTabs");
  const races = selectedVenue()?.races || [];
  host.replaceChildren(...races.map((race) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${race.number}R`;
    button.className = `${race.number === selectedRaceNumber ? "active " : ""}${race.status === "OK" ? "ok-dot" : "blocked-dot"}`;
    button.onclick = () => { selectedRaceNumber = race.number; syncUrl(); renderAll(); };
    return button;
  }));
}

function renderRaceDetail() {
  const venue = selectedVenue();
  const race = selectedRace();
  $("#selectedVenue").textContent = venue?.name || "--";
  $("#selectedRace").textContent = `${race?.number ?? "--"}R`;
  const status = race?.status || "DATA BLOCKED";
  const analysis = analyzeRace(race);
  $("#raceStatus").textContent = status;
  $("#raceStatus").className = `status ${status === "OK" ? "ok" : "blocked"}`;
  const ready = status === "OK";
  $("#blockedMessage").className = `alert blocked-alert${ready ? " ready" : ""}`;
  $("#blockedMessage").textContent = ready
    ? (analysis.primaryOddsReady ? `公式オッズ確認済み：${analysis.availableBetTypes.join("・")}。混合10点を自動比較しています。` : "4券種の公式オッズ取得待ち。取得済み券種だけを表示します。")
    : `DATA BLOCKED：${race?.blockReason || "公式データが未提供または不完全です。"}`;
  $("#riderNumbers").textContent = race?.riderNumbers?.length ? race.riderNumbers.join("・") : "未取得";
  $("#oddsCompleteness").textContent = `${race?.trioOddsCount ?? 0} / ${race?.expectedTrioOddsCount ?? "--"}`;
  $("#oddsUpdated").textContent = race?.trioOddsUpdatedAt || race?.oddsUpdatedAt || "--";
  $("#raceClass").textContent = race?.raceClass || "クラス未取得";
  $("#raceDistance").textContent = race?.distanceM ? `${race.distanceM}m` : "距離未取得";
  $("#raceAlignment").textContent = race?.alignment || "未取得";
  const riders = [...(race?.riders || [])].sort((a, b) => a.number - b.number);
  const assessmentByNumber = new Map((analysis.riderAssessments || []).map((item) => [item.number, item]));
  $("#raceEntries").replaceChildren(...(riders.length ? riders.map((rider) => {
    const row = document.createElement("tr");
    const numberCell = document.createElement("td");
    const numberBadge = document.createElement("b");
    numberBadge.className = `rider-number number-${rider.number}`;
    numberBadge.textContent = rider.number;
    numberCell.append(numberBadge);
    const assessment = assessmentByNumber.get(Number(rider.number));
    const values = [rider.name, rider.prefecture, rider.classHistory, rider.style, assessment ? `${assessment.abilityIndex}（${assessment.rank}位）` : "--", assessment ? `${assessment.tacticalIndex}・${assessment.tacticalLabel}` : "--", assessment ? `${assessment.factorWins}/6・${assessment.role}` : "--"];
    row.append(numberCell, ...values.map((value, index) => {
      const cell = document.createElement("td");
      if (index === 0) {
        const strong = document.createElement("strong");
        strong.textContent = value || "--";
        cell.append(strong);
      } else cell.textContent = value || "--";
      return cell;
    }));
    return row;
  }) : [(() => { const row = document.createElement("tr"); const cell = document.createElement("td"); cell.colSpan = 8; cell.textContent = "出走表を取得できません。"; row.append(cell); return row; })()]));
  $("#aiIndexValue").textContent = analysis.index ? `${analysis.grade} / ${analysis.index}` : "--";
  $("#aiScenario").textContent = `${analysis.scenario}${analysis.modelReady ? ` データ取得率${analysis.dataRate}%・因子一致度${analysis.agreement}%・confidence ${analysis.confidence}%` : ""}`;
  const primaryTickets = analysis.primaryTickets || analysis.tickets;
  $("#aiTenTickets").replaceChildren(...(primaryTickets.length ? primaryTickets.map((ticket, index) => {
    const item = document.createElement("div");
    item.className = "ten-ticket";
    const detail = ticket.modelProbability === null || ticket.modelProbability === undefined
      ? `${ticket.odds ? `${formatOdds(ticket.odds)}倍` : "オッズ確認待ち"}`
      : ticket.rawMarketProbability === null
        ? `予測${formatOdds(ticket.modelProbability * 100)}% / net edge DATA BLOCKED`
        : `${formatOdds(ticket.odds)}倍 / 予測${formatOdds(ticket.modelProbability * 100)}% / 市場${formatOdds(ticket.rawMarketProbability * 100)}% / edge ${ticket.netEdge >= 0 ? "+" : ""}${formatOdds(ticket.netEdge)}% / 100円期待${ticket.expectedProfitYen >= 0 ? "+" : ""}${Math.round(ticket.expectedProfitYen)}円`;
    item.innerHTML = `<small>${index + 1}</small><b>${ticket.betType || "3連単"} ${ticket.combo}</b><span>${detail}</span>`;
    return item;
  }) : [Object.assign(document.createElement("div"), { className: "empty", textContent: "候補を表示できません。" })]));
  $("#currentDecision").textContent = race?.status === "OK" && analysis.modelReady ? analysis.recommendation : "DATA BLOCKED";
  const allOdds = Object.entries(race?.trioOdds || {});
  const odds = [...allOdds].sort((a, b) => a[1] - b[1]).slice(0, 18);
  const oddsCard = ([combo, value]) => {
    const item = document.createElement("div");
    item.className = "odd-card";
    const combination = document.createElement("span");
    const price = document.createElement("b");
    combination.textContent = combo;
    price.textContent = formatOdds(value);
    item.append(combination, price);
    return item;
  };
  $("#popularOdds").replaceChildren(...(odds.length ? odds.map(oddsCard) : [Object.assign(document.createElement("div"), { className: "empty", textContent: "オッズ未取得のため表示できません。" })]));
  $("#allOddsCount").textContent = allOdds.length;
  $("#allOdds").replaceChildren(...allOdds.sort((a, b) => a[0].localeCompare(b[0], "ja", { numeric: true })).map(oddsCard));
}

function syncUrl() { history.replaceState(null, "", `?venue=${encodeURIComponent(selectedVenueCode)}&race=${selectedRaceNumber}#today`); }
function renderAll() { renderSummary(); renderRecommendations(); renderVenueTabs(); renderRaceTabs(); renderRaceDetail(); }

$("#raceDate").onchange = () => { if ($("#raceDate").value !== dataset.raceDate) alert("現在保存されている取得日は " + dataset.raceDate + " です。"); $("#raceDate").value = dataset.raceDate; };
$("#refreshButton").onclick = async () => {
  const button = $("#refreshButton");
  button.disabled = true;
  button.textContent = "更新中…";
  await loadData();
  button.textContent = "更新済み";
  setTimeout(() => { button.disabled = false; button.textContent = "最新に更新"; }, 1200);
};
$("#shareButton").onclick = async () => { try { await navigator.clipboard.writeText(location.href); $("#shareButton").textContent = "コピー済み"; } catch { prompt("共有URL", location.href); } };

loadData({ initial: true });
setInterval(() => loadData(), AUTO_REFRESH_MS);
document.addEventListener("visibilitychange", () => { if (!document.hidden) loadData(); });
window.addEventListener("online", () => loadData());
