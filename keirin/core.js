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
