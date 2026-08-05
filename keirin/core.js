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
  const usable = (riders || []).filter((rider) => {
    const performance = rider.performance || {};
    return Number.isFinite(Number(performance.rating))
      && Number.isFinite(Number(performance.winRate))
      && Number.isFinite(Number(performance.top2Rate))
      && Number.isFinite(Number(performance.top3Rate));
  });
  if (usable.length !== (riders || []).length || usable.length < 5) return [];
  const ratings = usable.map((rider) => Number(rider.performance.rating));
  const wins = usable.map((rider) => Number(rider.performance.winRate));
  const top2 = usable.map((rider) => Number(rider.performance.top2Rate));
  const top3 = usable.map((rider) => Number(rider.performance.top3Rate));
  return usable.map((rider) => ({
    number: Number(rider.number),
    score: 0.45 * standardize(ratings, Number(rider.performance.rating))
      + 0.30 * standardize(wins, Number(rider.performance.winRate))
      + 0.15 * standardize(top2, Number(rider.performance.top2Rate))
      + 0.10 * standardize(top3, Number(rider.performance.top3Rate)),
  }));
}

function plackettLuceProbability(scores, numbers) {
  const pool = scores.map((rider) => ({ ...rider, weight: Math.exp(rider.score) }));
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

export function analyzeKeirinRace(race, { officialWeight = 0.25, costRate = 2 } = {}) {
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
  const scores = officialRiderScores(riders);
  const performanceCoverage = riders.length
    ? riders.filter((rider) => Number.isFinite(Number(rider.performance?.rating))).length / riders.length
    : 0;
  if (scores.length !== riders.length) {
    return {
      ...market,
      modelReady: false,
      confidence: Math.round(market.index * 0.55),
      agreement: 0,
      dataRate: Math.round(performanceCoverage * 100),
      edgeTickets: [],
      tickets: market.tickets.map((ticket) => ({ ...ticket, modelProbability: null, marketProbability: null, netEdge: null })),
      scenario: `公式4か月成績が${Math.round(performanceCoverage * 100)}%しか揃っていないため、独立モデルとnet edgeはDATA BLOCKEDです。市場人気は参考表示に限定します。`,
    };
  }
  const officialRaw = marketEntries.map((entry) => plackettLuceProbability(scores, entry.numbers));
  const officialTotal = officialRaw.reduce((sum, probability) => sum + probability, 0) || 1;
  const weight = clamp(Number(officialWeight), 0, 0.5);
  const tickets = marketEntries.map((entry, index) => {
    const officialProbability = officialRaw[index] / officialTotal;
    const modelProbability = (1 - weight) * entry.marketProbability + weight * officialProbability;
    const netEdge = (modelProbability * entry.odds - 1) * 100 - Number(costRate || 0);
    return { ...entry, officialProbability, modelProbability, netEdge };
  });
  const firstMarket = new Map(riders.map((rider) => [Number(rider.number), 0]));
  const firstOfficial = new Map(riders.map((rider) => [Number(rider.number), 0]));
  for (const ticket of tickets) {
    const first = ticket.numbers[0];
    firstMarket.set(first, (firstMarket.get(first) || 0) + ticket.marketProbability);
    firstOfficial.set(first, (firstOfficial.get(first) || 0) + ticket.officialProbability);
  }
  const totalVariation = 0.5 * [...firstMarket].reduce((sum, [number, probability]) =>
    sum + Math.abs(probability - (firstOfficial.get(number) || 0)), 0);
  const agreement = clamp(Math.round((1 - totalVariation) * 100), 0, 100);
  const dataRate = Math.round(performanceCoverage * 100);
  const index = clamp(Math.round(market.index * 0.45 + agreement * 0.25 + dataRate * 0.30), 1, 94);
  const grade = index >= 82 ? "S" : index >= 72 ? "A" : index >= 62 ? "B" : "C";
  const ranked = [...tickets].sort((a, b) => b.modelProbability - a.modelProbability || a.odds - b.odds);
  const edgeTickets = [...tickets].filter((ticket) => ticket.netEdge > 0)
    .sort((a, b) => b.netEdge - a.netEdge || b.modelProbability - a.modelProbability);
  const axis = ranked[0]?.numbers[0];
  return {
    index,
    grade,
    rankScore: index,
    modelReady: true,
    confidence: index,
    agreement,
    dataRate,
    tickets: ranked.slice(0, 10),
    edgeTickets: edgeTickets.slice(0, 10),
    scenario: `公式4か月成績と三連単市場を固定比率25:75で照合。${axis}番を中心候補とします。一致度${agreement}%で、学習ゲート通過前はnet edgeがプラスでもWATCHです。`,
  };
}
