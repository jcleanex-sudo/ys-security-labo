export function buildKeirinFormation(riders) {
  const ranked = riders.map((rider) => ({...rider, number:Number(rider.number), score:Number(rider.score)})).filter((rider) => Number.isInteger(rider.number) && rider.number > 0 && rider.score > 0).sort((a,b) => b.score-a.score || a.number-b.number);
  if (ranked.length < 5) return {main:[],cover:[],ranked};
  const t = (...positions) => positions.map((position) => ranked[position].number);
  return {ranked, main:[t(0,1,2),t(0,2,1),t(0,1,3),t(0,2,3),t(0,3,1),t(0,3,2)], cover:[t(1,0,2),t(2,0,1),t(1,0,3),t(2,0,3),t(0,1,4),t(0,2,4)]};
}

export function orderedChance(riders, ticket) {
  const pool = riders.map((rider) => ({number:Number(rider.number),score:Math.max(0,Number(rider.score)||0)}));
  let chance = 1;
  for (const number of ticket) {
    const total = pool.reduce((sum,rider)=>sum+rider.score,0);
    const index = pool.findIndex((rider)=>rider.number===Number(number));
    if (index < 0 || total <= 0) return null;
    chance *= pool[index].score/total;
    pool.splice(index,1);
  }
  return chance;
}

export function keirinTicketEdge(riders,ticket,odds,cost=2) {
  const numericOdds=Number(odds);
  if (!odds || !Number.isFinite(numericOdds) || numericOdds<=1) return null;
  const chance=orderedChance(riders,ticket);
  return chance===null?null:(chance*numericOdds-1)*100-Number(cost||0);
}

export function analyzeMarketOdds(odds, status = "OK") {
  const entries = Object.entries(odds || {}).map(([combo, value]) => ({ combo, odds: Number(value), numbers: combo.split("-").map(Number) })).filter((item) => item.odds > 1).sort((a, b) => a.odds - b.odds);
  if (!entries.length || status !== "OK") return { index: 0, grade: "--", tickets: [], scenario: "オッズ未取得のためAI予想展開を作成できません。" };
  const rawTotal = entries.reduce((sum, item) => sum + 1 / item.odds, 0);
  const weighted = entries.map((item) => ({ ...item, weight: (1 / item.odds) / rawTotal }));
  const positionMass = [new Map(), new Map(), new Map()];
  for (const item of weighted) item.numbers.forEach((number, position) => positionMass[position].set(number, (positionMass[position].get(number) || 0) + item.weight));
  const rankedPosition = positionMass.map((mass) => [...mass.entries()].sort((a, b) => b[1] - a[1]));
  const firstClarity = rankedPosition[0][0]?.[1] || 0;
  const topTenMass = weighted.slice(0, 10).reduce((sum, item) => sum + item.weight, 0);
  const oddsGap = entries[1] ? Math.min(1, Math.max(0, entries[1].odds / entries[0].odds - 1)) : 0;
  const rankScore = 30 + firstClarity * 40 + Math.sqrt(topTenMass) * 35 + oddsGap * 5;
  const index = Math.max(1, Math.min(96, Math.round(rankScore)));
  const grade = index >= 80 ? "S" : index >= 70 ? "A" : index >= 60 ? "B" : "C";
  const axis = rankedPosition[0][0]?.[0];
  const second = rankedPosition[1].slice(0, 2).map(([number]) => number);
  const third = rankedPosition[2].slice(0, 3).map(([number]) => number);
  return {
    index,
    grade,
    tickets: entries.slice(0, 10),
    scenario: `市場分布では${axis}番を1着軸に、2着は${second.join("・")}番、3着は${third.join("・")}番が中心です。指数${index}はオッズのまとまりを示す参考値で、ライン・欠場・直前気配が未確認なら見送ります。`,
    firstClarity,
    topTenMass,
    rankScore,
  };
}

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export function parseOfficialPerformance(basicTables, riders) {
  const orderedRiders = [...(riders || [])]
    .filter((rider) => Number.isInteger(Number(rider.number)))
    .sort((a, b) => Number(a.number) - Number(b.number));
  const table = (basicTables || []).find((candidate) =>
    (candidate || []).flat().join(" ").includes("直近4ヶ月成績"),
  );
  const rows = (table || []).filter((row) => /^\d{2,3}\.\d{1,2}$/.test(String(row?.[0] || "").trim()));
  return rows.slice(0, orderedRiders.length).map((row, index) => {
    const rates = String(row[3] || "").match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
    const moves = String(row[1] || "").match(/\d+/g)?.map(Number) || [];
    const bhs = String(row[2] || "").match(/\d+/g)?.map(Number) || [];
    return {
      number: Number(orderedRiders[index].number),
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
}

export function parseOfficialRiderIdentities(basicTables) {
  const prefectures = ["北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島", "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川", "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜", "静岡", "愛知", "三重", "滋賀", "京都", "大阪", "兵庫", "奈良", "和歌山", "鳥取", "島根", "岡山", "広島", "山口", "徳島", "香川", "愛媛", "高知", "福岡", "佐賀", "長崎", "熊本", "大分", "宮崎", "鹿児島", "沖縄"];
  const prefecturePattern = prefectures.map((prefecture) => [...prefecture].join("\\s*")).join("|");
  const detailPattern = new RegExp(`^(.*?)(\\(補充\\)\\s*)?(${prefecturePattern})$`);
  const identities = new Map();
  for (const table of basicTables || []) for (const row of table || []) {
    const number = Number(row?.find((cell) => /^[1-9]$/.test(String(cell).trim())));
    const detail = row?.find((cell) => String(cell).includes("/") && /\/(?:SS|S[12]|A[123]|L[12])/.test(String(cell)));
    if (!Number.isInteger(number) || !detail) continue;
    const [identityText, classHistory = "", style = ""] = String(detail).split("/");
    const match = identityText.trim().match(detailPattern);
    if (!match) continue;
    const name = match[1].trim();
    const prefecture = `${match[2] ? "(補充)" : ""}${match[3].replace(/\s+/g, "")}`;
    const mark = String(row?.[1] || "").trim();
    const candidate = { number, name, prefecture, class_history: classHistory, style, mark };
    const quality = [name, prefecture, classHistory, style].filter(Boolean).length;
    if (!identities.has(number) || quality > identities.get(number).quality) identities.set(number, { ...candidate, quality });
  }
  return [...identities.values()].map(({ quality, ...identity }) => identity).sort((a, b) => a.number - b.number);
}

function standardize(values, value) {
  const average = values.reduce((sum, item) => sum + item, 0) / values.length;
  const deviation = Math.sqrt(values.reduce((sum, item) => sum + (item - average) ** 2, 0) / values.length) || 1;
  return (value - average) / deviation;
}

function officialRiderScores(riders) {
  const requiredFields = ["rating", "winRate", "top2Rate", "top3Rate", "escapeWins", "sprintWins", "passWins", "markWins", "backstretch", "home", "starts"];
  const usable = (riders || []).filter((rider) => {
    const performance = rider.performance || {};
    return requiredFields.every((field) => Number.isFinite(Number(performance[field])));
  });
  if (usable.length !== (riders || []).length || usable.length < 5) return [];
  const ratings = usable.map((rider) => Number(rider.performance.rating));
  const wins = usable.map((rider) => Number(rider.performance.winRate));
  const top2 = usable.map((rider) => Number(rider.performance.top2Rate));
  const top3 = usable.map((rider) => Number(rider.performance.top3Rate));
  const attacks = usable.map((rider) => Number(rider.performance.escapeWins) + Number(rider.performance.sprintWins));
  const positions = usable.map((rider) => Number(rider.performance.passWins) + Number(rider.performance.markWins));
  const activities = usable.map((rider) => Number(rider.performance.backstretch) + Number(rider.performance.home) * 0.5 + Number(rider.performance.starts) * 0.25);
  return usable.map((rider) => ({
    number: Number(rider.number),
    score: 0.38 * standardize(ratings, Number(rider.performance.rating))
      + 0.22 * standardize(wins, Number(rider.performance.winRate))
      + 0.14 * standardize(top2, Number(rider.performance.top2Rate))
      + 0.10 * standardize(top3, Number(rider.performance.top3Rate))
      + 0.08 * standardize(attacks, Number(rider.performance.escapeWins) + Number(rider.performance.sprintWins))
      + 0.05 * standardize(positions, Number(rider.performance.passWins) + Number(rider.performance.markWins))
      + 0.03 * standardize(activities, Number(rider.performance.backstretch) + Number(rider.performance.home) * 0.5 + Number(rider.performance.starts) * 0.25),
  }));
}

function plackettLuceProbability(scores, numbers, temperature = 0.65) {
  const pool = scores.map((rider) => ({ ...rider, weight: Math.exp(rider.score / temperature) }));
  let probability = 1;
  for (const number of numbers) {
    const total = pool.reduce((sum, rider) => sum + rider.weight, 0);
    const index = pool.findIndex((rider) => rider.number === number);
    if (index < 0 || total <= 0) return 0;
    probability *= pool[index].weight / total;
    pool.splice(index, 1);
  }
  return probability;
}

function permutations3(numbers) {
  const [a, b, c] = numbers;
  return [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]];
}

export function buildTrioCandidates(scores, trioOdds = null, safetyMargin = 2) {
  const numbers = [...scores].map((rider) => Number(rider.number)).sort((a, b) => a - b);
  const expectedCount = numbers.length * (numbers.length - 1) * (numbers.length - 2) / 6;
  const suppliedOdds = Object.entries(trioOdds || {}).filter(([, value]) => Number(value) > 1);
  const oddsComplete = expectedCount > 0 && suppliedOdds.length === expectedCount;
  const rawMarketTotal = oddsComplete ? suppliedOdds.reduce((sum, [, odds]) => sum + 1 / Number(odds), 0) : 0;
  const candidates = [];
  for (let first = 0; first < numbers.length - 2; first += 1) {
    for (let second = first + 1; second < numbers.length - 1; second += 1) {
      for (let third = second + 1; third < numbers.length; third += 1) {
        const combination = [numbers[first], numbers[second], numbers[third]];
        const modelProbability = permutations3(combination)
          .reduce((sum, order) => sum + plackettLuceProbability(scores, order), 0);
        const combo = combination.join("-");
        const odds = oddsComplete ? Number(trioOdds[combo]) : null;
        const rawMarketProbability = odds ? 1 / odds : null;
        const marketProbability = odds ? rawMarketProbability / rawMarketTotal : null;
        const netEdge = odds ? (modelProbability - rawMarketProbability) * 100 - Number(safetyMargin || 0) : null;
        const expectedProfitYen = odds ? modelProbability * odds * 100 - 100 : null;
        candidates.push({
          betType: "3連複",
          combo,
          numbers: combination,
          modelProbability,
          odds,
          rawMarketProbability,
          marketProbability,
          netEdge,
          expectedProfitYen,
          status: odds ? (netEdge > 0 ? "WATCH" : "SKIP") : "DATA BLOCKED",
        });
      }
    }
  }
  return candidates.sort((a, b) => b.modelProbability - a.modelProbability || a.combo.localeCompare(b.combo, "ja", { numeric: true }));
}

export function buildTwoRiderCandidates(scores, oddsSource = null, unordered = false, safetyMargin = 2) {
  const numbers = [...scores].map((rider) => Number(rider.number)).sort((a, b) => a - b);
  const expectedCount = unordered ? numbers.length * (numbers.length - 1) / 2 : numbers.length * (numbers.length - 1);
  const suppliedOdds = Object.entries(oddsSource || {}).filter(([, value]) => Number(value) > 1);
  const oddsComplete = expectedCount > 0 && suppliedOdds.length === expectedCount;
  const rawMarketTotal = oddsComplete ? suppliedOdds.reduce((sum, [, odds]) => sum + 1 / Number(odds), 0) : 0;
  const candidates = [];
  for (const first of numbers) for (const second of numbers) {
    if (first === second || (unordered && first > second)) continue;
    const combination = [first, second];
    const modelProbability = unordered
      ? plackettLuceProbability(scores, combination) + plackettLuceProbability(scores, [second, first])
      : plackettLuceProbability(scores, combination);
    const combo = combination.join("-");
    const odds = oddsComplete ? Number(oddsSource[combo]) : null;
    const rawMarketProbability = odds ? 1 / odds : null;
    const marketProbability = odds ? rawMarketProbability / rawMarketTotal : null;
    const netEdge = odds ? (modelProbability - rawMarketProbability) * 100 - Number(safetyMargin || 0) : null;
    candidates.push({
      betType: unordered ? "2車複" : "2車単",
      combo,
      numbers: combination,
      modelProbability,
      odds,
      rawMarketProbability,
      marketProbability,
      netEdge,
      expectedProfitYen: odds ? modelProbability * odds * 100 - 100 : null,
      status: odds ? (netEdge > 0 ? "WATCH" : "SKIP") : "DATA BLOCKED",
    });
  }
  return candidates.sort((a, b) => b.modelProbability - a.modelProbability || a.combo.localeCompare(b.combo, "ja", { numeric: true }));
}

function mixedTen(candidatesByType) {
  const score = (ticket) => ticket.modelProbability * 100 + clamp(ticket.netEdge ?? -20, -20, 20) * 0.25;
  const quotas = { "2車複": 3, "3連複": 3, "2車単": 2, "3連単": 2 };
  const selected = [];
  const remaining = [];
  for (const [betType, candidates] of Object.entries(candidatesByType)) {
    const ranked = [...candidates].filter((ticket) => ticket.odds).sort((a, b) => score(b) - score(a));
    selected.push(...ranked.slice(0, quotas[betType] || 0));
    remaining.push(...ranked.slice(quotas[betType] || 0));
  }
  if (selected.length < 10) selected.push(...remaining.sort((a, b) => score(b) - score(a)).slice(0, 10 - selected.length));
  return selected.sort((a, b) => score(b) - score(a)).slice(0, 10);
}

export function analyzeKeirinRace(race, { safetyMargin = 2 } = {}) {
  const market = analyzeMarketOdds(race?.odds, race?.status);
  if (race?.status !== "OK" || !market.tickets.length) {
    return { ...market, modelReady: false, confidence: 0, agreement: 0, dataRate: 0, edgeTickets: [] };
  }
  const entries = Object.entries(race.odds || {}).map(([combo, value]) => ({
    combo,
    odds: Number(value),
    numbers: combo.split("-").map(Number),
  })).filter((item) => item.odds > 1);
  const rawMarketTotal = entries.reduce((sum, item) => sum + 1 / item.odds, 0);
  const marketEntries = entries.map((item) => ({ ...item, marketProbability: (1 / item.odds) / rawMarketTotal }));
  const riders = (race.riders || []).filter((rider) => Number.isInteger(Number(rider.number)));
  const alignmentOrder = String(race?.alignment || "").match(/[1-9]/g)?.map(Number) || [];
  const riderNumberSet = new Set(riders.map((rider) => Number(rider.number)));
  const alignmentVerified = alignmentOrder.length === riders.length
    && new Set(alignmentOrder).size === riders.length
    && alignmentOrder.every((number) => riderNumberSet.has(number));
  const scores = officialRiderScores(riders);
  const requiredFields = ["rating", "winRate", "top2Rate", "top3Rate", "escapeWins", "sprintWins", "passWins", "markWins", "backstretch", "home", "starts"];
  const availableFields = riders.reduce((sum, rider) => sum + requiredFields.filter((field) => Number.isFinite(Number(rider.performance?.[field]))).length, 0);
  const performanceCoverage = riders.length ? availableFields / (riders.length * requiredFields.length) : 0;
  if (scores.length !== riders.length || !alignmentVerified) {
    return {
      ...market,
      modelReady: false,
      confidence: Math.round(market.index * 0.55),
      agreement: 0,
      dataRate: Math.round(performanceCoverage * 100),
      edgeTickets: [],
      tickets: market.tickets.map((ticket) => ({ ...ticket, modelProbability: null, marketProbability: null, netEdge: null })),
      alignmentVerified,
      scenario: !alignmentVerified
        ? "公式の並び予想を全選手分確認できないため、べた子式の展開評価とnet edgeはDATA BLOCKEDです。"
        : `公式4か月成績が${Math.round(performanceCoverage * 100)}%しか揃っていないため、独立モデルとnet edgeはDATA BLOCKEDです。市場人気は参考表示に限定します。`,
    };
  }
  const modelRaw = marketEntries.map((entry) => plackettLuceProbability(scores, entry.numbers));
  const modelTotal = modelRaw.reduce((sum, probability) => sum + probability, 0) || 1;
  const tickets = marketEntries.map((entry, index) => {
    const modelProbability = modelRaw[index] / modelTotal;
    const rawMarketProbability = 1 / entry.odds;
    const netEdge = (modelProbability - rawMarketProbability) * 100 - Number(safetyMargin || 0);
    const expectedProfitYen = modelProbability * entry.odds * 100 - 100;
    return { ...entry, betType: "3連単", officialProbability: modelProbability, modelProbability, rawMarketProbability, netEdge, expectedProfitYen };
  });
  const factorValue = (rider, factor) => {
    const p = rider.performance;
    if (factor === "attack") return Number(p.escapeWins) + Number(p.sprintWins);
    if (factor === "position") return Number(p.passWins) + Number(p.markWins);
    return Number(p[factor]);
  };
  const factors = ["rating", "winRate", "top2Rate", "top3Rate", "attack", "position"];
  const modelAxis = [...scores].sort((a, b) => b.score - a.score || a.number - b.number)[0]?.number;
  const factorWinners = factors.map((factor) => [...riders].sort((a, b) => factorValue(b, factor) - factorValue(a, factor) || Number(a.number) - Number(b.number))[0]?.number);
  const agreement = Math.round(factorWinners.filter((number) => number === modelAxis).length / factors.length * 100);
  const riderAssessments = [...scores].sort((a, b) => b.score - a.score || a.number - b.number).map((rider, index) => ({
    ...(() => {
      const source = riders.find((item) => Number(item.number) === rider.number);
      const p = source.performance;
      const attack = Number(p.escapeWins) + Number(p.sprintWins) + Number(p.backstretch) * 0.5;
      const chase = Number(p.passWins) + Number(p.markWins) + Number(p.home) * 0.25;
      const tacticalRaw = source.style === "逃" ? attack : source.style === "追" ? chase : Math.max(attack, chase);
      return { tacticalRaw, style: source.style || "--", alignmentPosition: alignmentOrder.indexOf(rider.number) + 1 };
    })(),
    number: rider.number,
    rank: index + 1,
    abilityIndex: clamp(Math.round(50 + rider.score * 15), 1, 99),
    factorWins: factorWinners.filter((number) => number === rider.number).length,
    role: index === 0 ? "本命" : index === 1 ? "対抗" : index === 2 ? "単穴" : "相手",
  }));
  const tacticalValues = riderAssessments.map((item) => item.tacticalRaw);
  riderAssessments.forEach((item) => {
    item.tacticalIndex = clamp(Math.round(50 + standardize(tacticalValues, item.tacticalRaw) * 15), 1, 99);
    item.tacticalLabel = item.style === "逃" ? "先行" : item.style === "追" ? "追込" : "自在";
  });
  const dataRate = Math.round(performanceCoverage * 100);
  const winWeights = scores.map((rider) => Math.exp(rider.score / 0.65));
  const topWinProbability = Math.max(...winWeights) / winWeights.reduce((sum, value) => sum + value, 0);
  const index = clamp(Math.round(25 + topWinProbability * 45 + agreement * 0.15 + dataRate * 0.03), 1, 90);
  const grade = index >= 82 ? "S" : index >= 72 ? "A" : index >= 62 ? "B" : "C";
  const ranked = [...tickets].sort((a, b) => b.modelProbability - a.modelProbability || a.odds - b.odds);
  const trioCandidates = buildTrioCandidates(scores, race.trioOdds, safetyMargin);
  const exactaCandidates = buildTwoRiderCandidates(scores, race.exactaOdds, false, safetyMargin);
  const quinellaCandidates = buildTwoRiderCandidates(scores, race.quinellaOdds, true, safetyMargin);
  const mixedTickets = mixedTen({ "2車複": quinellaCandidates, "3連複": trioCandidates, "2車単": exactaCandidates, "3連単": tickets });
  const availableBetTypes = [...new Set(mixedTickets.map((ticket) => ticket.betType))];
  const edgeTickets = [...tickets].filter((ticket) => ticket.netEdge > 0)
    .sort((a, b) => b.netEdge - a.netEdge || b.modelProbability - a.modelProbability);
  const selectionPassed = index >= 75 && agreement >= 75 && dataRate === 100;
  const recommendation = selectionPassed ? "WATCH" : "SKIP";
  return {
    index,
    grade,
    rankScore: index,
    modelReady: true,
    confidence: index,
    agreement,
    dataRate,
    alignmentVerified,
    alignmentOrder,
    modelAxis,
    factorWinners,
    riderAssessments,
    selectionPassed,
    recommendation,
    logicName: "べた子式・競輪4券種混合 v3",
    primaryBetType: "4券種混合",
    primaryOddsReady: mixedTickets.length === 10,
    availableBetTypes,
    primaryTickets: mixedTickets,
    tickets: ranked.slice(0, 10),
    edgeTickets: edgeTickets.slice(0, 10),
    scenario: `べた子式で競走得点・勝率・連対率・決まり手・脚質別展開力を複合評価。公式並び${alignmentOrder.join("-")}を照合し、${modelAxis}番を能力軸候補、3連単・3連複・2車単・2車複を比較。6因子一致度${agreement}%・指数${index}。${selectionPassed ? "直前確認まではWATCH" : "公開基準未達のためSKIP"}です。`,
  };
}
