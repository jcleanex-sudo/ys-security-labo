import { SAFE, buildFormation, decide, netEdge, remainingMinutes, ticketEdge } from "./core.js";

const VENUES = ["札幌","函館","福島","新潟","東京","中山","中京","京都","阪神","小倉"];
const STORE_KEY = "keiba-edge-lab-races-v1";
const $ = (selector) => document.querySelector(selector);
const elements = {
  date: $("#raceDate"), venue: $("#venue"), race: $("#raceNumber"), horseRows: $("#horseRows"),
  decision: $("#decision"), main: $("#mainTickets"), cover: $("#coverTickets"), ranking: $("#rankingGrid"), skip: $("#skipList"),
};
let state = loadState();
let activeKey = "";
let repositoryStatus = { history: {}, learning: {} };

function todayJst() { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date()); }
function loadState() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } }
function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function raceKey(date = elements.date.value, venue = elements.venue.value, race = elements.race.value) { return `${date}|${venue}|${race}`; }
function statusClass(status) { return status === "UP" ? "up" : status === "DOWN" ? "down" : status === "WATCH" ? "watch" : "blocked"; }
function setStatus(node, status) { node.textContent = status; node.className = statusClass(status); }
function percent(value, digits = 1) { return Number.isFinite(Number(value)) ? `${Number(value).toFixed(digits)}%` : "--"; }
function splitLines(value) { return String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 5); }

function addHorseRow(horse = {}) {
  if (elements.horseRows.children.length >= 6) return;
  const row = $("#horseRowTemplate").content.firstElementChild.cloneNode(true);
  row.querySelector('[data-field="number"]').value = horse.number ?? "";
  row.querySelector('[data-field="name"]').value = horse.name ?? "";
  row.querySelector('[data-field="score"]').value = horse.score ?? "";
  row.querySelector('[data-action="remove"]').addEventListener("click", () => { row.remove(); previewFormation(); });
  row.querySelectorAll("input").forEach((input) => input.addEventListener("input", previewFormation));
  elements.horseRows.append(row);
}

function horsesFromForm() {
  return [...elements.horseRows.children].map((row) => ({
    number: Number(row.querySelector('[data-field="number"]').value),
    name: row.querySelector('[data-field="name"]').value.trim(),
    score: Number(row.querySelector('[data-field="score"]').value),
  })).filter((horse) => horse.number > 0 || horse.name || horse.score > 0);
}

function recordFromForm() {
  return {
    date: elements.date.value, venue: elements.venue.value, race: Number(elements.race.value), startTime: $("#startTime").value,
    observedAt: $("#observedAt").value, modelProbability: $("#modelProbability").value, marketProbability: $("#marketProbability").value,
    confidence: $("#confidence").value, agreement: $("#agreement").value, dataRate: $("#dataRate").value, costRate: $("#costRate").value,
    reasons: splitLines($("#reasons").value), invalidConditions: $("#invalidConditions").value.trim(), horses: horsesFromForm(),
    ticketOdds: state[activeKey]?.ticketOdds || {}, savedAt: new Date().toISOString(),
  };
}

function fillForm(record = {}) {
  $("#startTime").value = record.startTime || ""; $("#observedAt").value = record.observedAt || "";
  $("#modelProbability").value = record.modelProbability ?? ""; $("#marketProbability").value = record.marketProbability ?? "";
  $("#confidence").value = record.confidence ?? ""; $("#agreement").value = record.agreement ?? ""; $("#dataRate").value = record.dataRate ?? "";
  $("#costRate").value = record.costRate ?? "2"; $("#reasons").value = (record.reasons || []).join("\n");
  $("#invalidConditions").value = record.invalidConditions || ""; elements.horseRows.replaceChildren();
  (record.horses?.length ? record.horses : [{},{},{},{},{}]).forEach(addHorseRow);
}

function renderTickets(target, tickets, record, allHorses) {
  if (!tickets.length) { target.innerHTML = '<div class="empty">候補馬を5頭以上入力してください</div>'; return; }
  const ranked = tickets.map((ticket) => ({ ticket, odds: record.ticketOdds?.[ticket.join("-")] || "", edge: ticketEdge(allHorses, ticket, record.ticketOdds?.[ticket.join("-")], record.costRate) }));
  ranked.sort((a, b) => (b.edge ?? -Infinity) - (a.edge ?? -Infinity));
  target.replaceChildren(...ranked.map(({ ticket, odds, edge }) => {
    const row = document.createElement("div"); row.className = "ticket";
    row.innerHTML = `<div class="ticket-picks">${ticket.map((number) => `<b>${number}</b>`).join("")}</div><input type="number" min="1.1" step="0.1" aria-label="${ticket.join("-")}の3連単オッズ" placeholder="オッズ" value="${odds}"><em>${edge === null ? "edge --" : `edge ${edge >= 0 ? "+" : ""}${edge.toFixed(1)}%`}</em>`;
    row.querySelector("input").addEventListener("change", (event) => {
      const current = state[activeKey] || recordFromForm(); current.ticketOdds ||= {}; current.ticketOdds[ticket.join("-")] = event.target.value;
      state[activeKey] = current; saveState(); renderCurrent(current);
    });
    return row;
  }));
}

function previewFormation() { const transient = recordFromForm(); renderTicketArea(transient); }
function renderTicketArea(record) {
  const formation = buildFormation(record.horses || []);
  renderTickets(elements.main, formation.main, record, record.horses || []); renderTickets(elements.cover, formation.cover, record, record.horses || []);
}

function renderCurrent(record = {}) {
  const result = decide(record);
  setStatus(elements.decision, result.status);
  $("#modelValue").textContent = percent(record.modelProbability); $("#marketValue").textContent = percent(record.marketProbability);
  const edge = netEdge(record.modelProbability, record.marketProbability, record.costRate); $("#edgeValue").textContent = edge === null ? "--" : `${edge >= 0 ? "+" : ""}${edge.toFixed(1)}%`;
  $("#confidenceValue").textContent = percent(record.confidence, 0); $("#dataRateValue").textContent = percent(record.dataRate, 0);
  const remaining = remainingMinutes(record.date, record.startTime); $("#remainingValue").textContent = remaining === null ? "--" : remaining < 0 ? "発走済" : `${Math.floor(remaining)}分`;
  renderTicketArea(record); renderDashboard();
}

function openSelectedRace() {
  activeKey = raceKey(); const record = state[activeKey] || { date: elements.date.value, venue: elements.venue.value, race: Number(elements.race.value), ticketOdds: {} };
  fillForm(record); renderCurrent(record); history.replaceState(null, "", `?date=${encodeURIComponent(elements.date.value)}&venue=${encodeURIComponent(elements.venue.value)}&race=${elements.race.value}#prediction`);
}

function recordsForDate() { return Object.values(state).filter((record) => record.date === elements.date.value); }
function renderDashboard() {
  const records = recordsForDate(); const assessed = records.map((record) => ({ record, result: decide(record), edge: netEdge(record.modelProbability, record.marketProbability, record.costRate) }));
  const eligible = assessed.filter(({ result }) => result.status === "UP" || result.status === "DOWN").sort((a,b) => (b.edge ?? -999) - (a.edge ?? -999));
  elements.ranking.replaceChildren(...(eligible.length ? eligible.map(({ record, result, edge }, index) => {
    const card = document.createElement("article"); card.className = "rank-card"; card.innerHTML = `<div class="rank-top"><span>#${index + 1}</span><b class="${statusClass(result.status)}">${result.status} · ${result.reason}</b></div><h3>${record.venue} ${record.race}R</h3><p>${record.reasons?.[0] || "根拠未入力"}</p><div class="rank-score"><strong>${edge?.toFixed(1)}%</strong><span>confidence ${record.confidence}%</span></div>`; return card;
  }) : [Object.assign(document.createElement("div"), { className: "empty", textContent: "安全基準を通過したレースはありません。見送りを維持します。" })]));
  const skipped = assessed.filter(({ result }) => result.status === "WATCH" || result.status === "DATA BLOCKED");
  elements.skip.innerHTML = skipped.length ? `<div class="skip-list">${skipped.map(({record,result}) => `<div class="skip-item"><span>${record.venue} ${record.race}R</span><b>${result.status} · ${result.reason}</b></div>`).join("")}</div>` : '<div class="empty">登録済みの見送り対象はありません</div>';
  const complete = assessed.filter(({record}) => Number(record.dataRate) >= SAFE.minDataRate).length; const coverage = records.length ? complete / records.length * 100 : 0;
  $("#raceCountHero").textContent = records.length; $("#coverageHero").innerHTML = `${coverage.toFixed(0)}<sup>%</sup>`;
  const strict = assessed.filter(({record,result}) => Number(record.confidence) >= 70 && ["UP","DOWN"].includes(result.status)).length;
  const experimental = assessed.filter(({record,result}) => Number(record.confidence) >= 60 && Number(record.confidence) < 70 && ["UP","DOWN"].includes(result.status)).length;
  $("#strictCountHero").textContent = strict; $("#experimentalCountHero").textContent = experimental; $("#strictSamples").textContent = `${strict}件`; $("#experimentalSamples").textContent = `${experimental}件`;
  const latest = records.map((r) => r.savedAt).filter(Boolean).sort().at(-1); $("#updatedHero").textContent = latest ? new Date(latest).toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}) : "--";
  const global = eligible.length ? "UP" : records.length ? "WATCH" : "DATA BLOCKED"; setStatus($("#globalStatus"), global); setStatus($("#rankingStatus"), global);
}

async function loadRepositoryStatus() {
  try { repositoryStatus = await fetch("data/status.json", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error(); return response.json(); }); } catch { repositoryStatus = { history: {}, learning: { status: "DATA BLOCKED", message: "公開検証データを取得できません" } }; }
  const h = repositoryStatus.history || {}, l = repositoryStatus.learning || {};
  $("#historyCount").textContent = h.total_races ?? 0; $("#validatedCount").textContent = h.validated_races ?? 0; $("#netProfit").textContent = h.net_profit == null ? "--" : `${h.net_profit >= 0 ? "+" : ""}${h.net_profit}`;
  $("#profitFactor").textContent = h.profit_factor ?? "--"; $("#maxDrawdown").textContent = h.max_drawdown ?? "--"; $("#confidenceInterval").textContent = h.win_rate_ci95 ?? "--";
  $("#learningStatus").textContent = l.status || "DATA BLOCKED"; $("#learningStatus").className = statusClass(l.status); $("#learningMessage").textContent = l.message || "履歴データが不足しています";
  $("#logicVersion").textContent = l.logic_version || "manual-composite-v1"; $("#lastEvaluated").textContent = l.evaluated_at || "--"; $("#weightUpdated").textContent = l.weight_updated ? "実施" : "未実施";
}

VENUES.forEach((venue) => elements.venue.add(new Option(venue, venue))); for (let race = 1; race <= 12; race += 1) elements.race.add(new Option(`${race}R`, String(race)));
const query = new URLSearchParams(location.search); elements.date.value = query.get("date") || todayJst(); elements.venue.value = query.get("venue") || "東京"; elements.race.value = query.get("race") || "1";
$("#raceSelector").addEventListener("submit", (event) => { event.preventDefault(); openSelectedRace(); });
$("#manualForm").addEventListener("submit", (event) => { event.preventDefault(); const record = recordFromForm(); state[activeKey] = record; saveState(); renderCurrent(record); });
$("#addHorse").addEventListener("click", () => addHorseRow());
$("#clearRace").addEventListener("click", () => { if (!confirm("この端末に保存した、このレースの入力を消去しますか？")) return; delete state[activeKey]; saveState(); openSelectedRace(); });
$("#shareButton").addEventListener("click", async () => { const url = location.href; try { await navigator.clipboard.writeText(url); $("#shareButton").textContent = "コピーしました"; } catch { prompt("共有URL", url); } setTimeout(() => $("#shareButton").textContent = "共有URLをコピー", 1800); });
openSelectedRace(); loadRepositoryStatus(); setInterval(() => renderCurrent(state[activeKey] || recordFromForm()), 60000);
