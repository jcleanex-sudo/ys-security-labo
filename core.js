export const SAFE = Object.freeze({ minConfidence: 60, strictConfidence: 70, minAgreement: 60, minDataRate: 95, minEdge: 3, minRemainingMinutes: 5, staleMinutes: 30 });

export function finite(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function netEdge(modelProbability, marketProbability, costRate = 2) {
  const model = finite(modelProbability);
  const market = finite(marketProbability);
  const cost = finite(costRate);
  if (model === null || market === null || market <= 0 || cost === null) return null;
  return (model - market) - cost;
}

export function remainingMinutes(date, startTime, now = new Date()) {
  if (!date || !startTime) return null;
  const deadline = new Date(`${date}T${startTime}:00+09:00`);
  if (Number.isNaN(deadline.getTime())) return null;
  return (deadline.getTime() - now.getTime()) / 60000;
}

export function orderedProbability(scores, ticket) {
  const pool = scores.map((score, index) => ({ index, score: Math.max(0, Number(score) || 0) }));
  if (pool.length < 3 || new Set(ticket).size !== 3 || ticket.some((i) => !pool[i])) return null;
  let probability = 1;
  const remaining = [...pool];
  for (const selectedIndex of ticket) {
    const total = remaining.reduce((sum, item) => sum + item.score, 0);
    const position = remaining.findIndex((item) => item.index === selectedIndex);
    if (total <= 0 || position < 0) return null;
    probability *= remaining[position].score / total;
    remaining.splice(position, 1);
  }
  return probability;
}

export function buildFormation(horses) {
  const ranked = horses
    .map((horse, original) => ({ ...horse, original, number: Number(horse.number), score: Number(horse.score) }))
    .filter((horse) => Number.isInteger(horse.number) && horse.number > 0 && horse.score > 0)
    .sort((a, b) => b.score - a.score || a.number - b.number);
  if (ranked.length < 5) return { main: [], cover: [], ranked };
  const t = (...positions) => positions.map((position) => ranked[position].number);
  return {
    ranked,
    main: [t(0,1,2), t(0,2,1), t(0,1,3), t(0,2,3), t(0,3,1), t(0,3,2)],
    cover: [t(1,0,2), t(2,0,1), t(1,0,3), t(2,0,3), t(0,1,4), t(0,2,4)],
  };
}

export function ticketEdge(horses, ticket, odds, costRate = 2) {
  const scores = horses.map((horse) => Number(horse.score) || 0);
  const indices = ticket.map((number) => horses.findIndex((horse) => Number(horse.number) === Number(number)));
  const probability = orderedProbability(scores, indices);
  const numericOdds = finite(odds);
  if (probability === null || numericOdds === null || numericOdds <= 1) return null;
  return (probability * numericOdds - 1) * 100 - Number(costRate || 0);
}

export function decide(record, now = new Date()) {
  const fields = [record.modelProbability, record.marketProbability, record.confidence, record.agreement, record.dataRate];
  if (fields.some((value) => finite(value) === null) || !record.startTime || !record.observedAt) {
    return { status: "DATA BLOCKED", reason: "必須データ不足" };
  }
  const observed = new Date(record.observedAt);
  if (Number.isNaN(observed.getTime()) || Math.abs(now.getTime() - observed.getTime()) / 60000 > SAFE.staleMinutes) {
    return { status: "DATA BLOCKED", reason: "データが古い、または取得時刻が不正" };
  }
  const remaining = remainingMinutes(record.date, record.startTime, now);
  if (remaining === null || remaining < SAFE.minRemainingMinutes) return { status: "WATCH", reason: "締切5分未満または発走済み" };
  const edge = netEdge(record.modelProbability, record.marketProbability, record.costRate);
  if (Number(record.dataRate) < SAFE.minDataRate) return { status: "DATA BLOCKED", reason: "データ取得率95%未満" };
  if (Number(record.confidence) < SAFE.minConfidence || Number(record.agreement) < SAFE.minAgreement || edge < SAFE.minEdge) {
    return { status: "WATCH", reason: "安全基準未達", edge, remaining };
  }
  return { status: edge >= 0 ? "UP" : "DOWN", reason: Number(record.confidence) >= SAFE.strictConfidence ? "厳格仮想枠" : "実験用仮想枠", edge, remaining };
}
