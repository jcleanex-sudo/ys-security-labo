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
