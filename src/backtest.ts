export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type StrategyKind = 'maCross' | 'rsiReversal' | 'macdCross' | 'bbReversal' | 'breakout';
export type LogicType = 'Trend' | 'Reversal' | 'Breakout' | 'Volatility';
export type Timeframe = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1' | 'W1' | 'MN';

export type BacktestSettings = {
  startDate: string;
  endDate: string;
  pair: string;
  timeframe: Timeframe;
  initialCapital: number;
  lotSize: number;
  spread: number;
  commission: number;
};

export type LogicParams = {
  maFast: number;
  maSlow: number;
  rsiPeriod: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  bollingerPeriod: number;
  breakoutPeriod: number;
};

export type LogicDefinition = {
  id: string;
  strategy: StrategyKind;
  type: LogicType;
  name: string;
  description: string;
  enabled: boolean;
  takeProfit: number;
  stopLoss: number;
  params: LogicParams;
};

export type Trade = {
  id: string;
  logicId: string;
  logicName: string;
  direction: 'Long' | 'Short';
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  exitReason: 'Signal' | 'TP' | 'SL' | 'Time' | 'End';
  pips: number;
  grossProfit: number;
  cost: number;
  profit: number;
  maxFloatingLoss: number;
  equity: number;
  drawdown: number;
  barsHeld: number;
};

export type CurvePoint = {
  label: string;
  value: number;
};

export type PeriodStat = {
  label: string;
  trades: number;
  wins: number;
  winRate: number;
  profit: number;
};

export type MarketRegime = 'Trend' | 'Range' | 'High Volatility' | 'Low Volatility';

export type ValidationSummary = {
  netProfit: number;
  profitFactor: number;
  maxDrawdown: number;
  winRate: number;
  tradeCount: number;
};

export type WalkForwardSegment = {
  label: string;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  inSample: ValidationSummary;
  outOfSample: ValidationSummary;
  score: number;
};

export type OutOfSampleAnalysis = {
  splitDate: string;
  inSample: ValidationSummary;
  outOfSample: ValidationSummary;
  retentionRate: number;
};

export type MonteCarloAnalysis = {
  runs: number;
  averageProfit: number;
  averageMaxDrawdown: number;
  worstMaxDrawdown: number;
  profitP10: number;
  profitP50: number;
  profitP90: number;
  winRateP10: number;
  winRateP50: number;
  winRateP90: number;
};

export type MarketRegimeStat = {
  regime: MarketRegime;
  bars: number;
  trades: number;
  winRate: number;
  netProfit: number;
  profitFactor: number;
  score: number;
};

export type ReliabilityAnalysis = {
  score: number;
  walkForward: WalkForwardSegment[];
  outOfSample: OutOfSampleAnalysis;
  monteCarlo: MonteCarloAnalysis;
  marketRegimes: MarketRegimeStat[];
  bestRegime: MarketRegime | '-';
};

export type BacktestAnalytics = {
  expectancy: number;
  riskReward: number;
  sharpeRatio: number;
  recoveryFactor: number;
  payoffRatio: number;
  averageHoldingBars: number;
  maxFloatingLoss: number;
  maxSingleLoss: number;
  maxSingleProfit: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  monthlyProfits: CurvePoint[];
  weekdayWinRates: PeriodStat[];
  hourlyWinRates: PeriodStat[];
  equityCurve: CurvePoint[];
  drawdownCurve: CurvePoint[];
};

export type ReliabilityLabel = 'High' | 'Medium' | 'Low';

export type BacktestWarning = {
  severity: 'warning' | 'danger';
  message: string;
};

export type BacktestResult = {
  logicId: string;
  logicName: string;
  logicType: LogicType;
  strategy: StrategyKind;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  tradeCount: number;
  netProfit: number;
  averageProfit: number;
  averageLoss: number;
  score: number;
  reliability: ReliabilityLabel;
  warnings: BacktestWarning[];
  trades: Trade[];
  analytics: BacktestAnalytics;
  validation: ReliabilityAnalysis;
};

export type CsvValidationIssue = {
  severity: 'warning' | 'error';
  message: string;
};

export type CsvValidationReport = {
  status: 'success' | 'warning' | 'error';
  score: number;
  rows: number;
  validRows: number;
  duplicateTimes: number;
  sorted: boolean;
  missingCandles: number;
  issues: CsvValidationIssue[];
};

export type CsvParseResult = {
  candles: Candle[];
  report: CsvValidationReport;
};

type Signal = 'buy' | 'sell' | 'flat';

export const strategyLabels: Record<StrategyKind, string> = {
  maCross: 'MA Cross',
  rsiReversal: 'RSI Reversal',
  macdCross: 'MACD Cross',
  bbReversal: 'Bollinger Band Reversal',
  breakout: 'Breakout',
};

export const defaultParams: LogicParams = {
  maFast: 8,
  maSlow: 24,
  rsiPeriod: 14,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  bollingerPeriod: 20,
  breakoutPeriod: 20,
};

export const defaultSettings: BacktestSettings = {
  startDate: '',
  endDate: '',
  pair: 'USDJPY',
  timeframe: 'H1',
  initialCapital: 1000000,
  lotSize: 1,
  spread: 0.8,
  commission: 0,
};

export const defaultLogics: LogicDefinition[] = [
  {
    id: 'logic-ma-cross',
    strategy: 'maCross',
    type: 'Trend',
    name: 'MA Cross',
    description: '短期移動平均が長期移動平均を上抜け、または下抜けした方向へ入る。',
    enabled: true,
    takeProfit: 55,
    stopLoss: 32,
    params: { ...defaultParams, maFast: 8, maSlow: 24 },
  },
  {
    id: 'logic-rsi-reversal',
    strategy: 'rsiReversal',
    type: 'Reversal',
    name: 'RSI Reversal',
    description: 'RSIの売られすぎ、買われすぎからの反転を狙う。',
    enabled: true,
    takeProfit: 42,
    stopLoss: 30,
    params: { ...defaultParams, rsiPeriod: 14 },
  },
  {
    id: 'logic-macd-cross',
    strategy: 'macdCross',
    type: 'Trend',
    name: 'MACD Cross',
    description: 'MACDラインとシグナルラインのクロスで転換を拾う。',
    enabled: true,
    takeProfit: 60,
    stopLoss: 36,
    params: { ...defaultParams, macdFast: 12, macdSlow: 26, macdSignal: 9 },
  },
  {
    id: 'logic-bb-reversal',
    strategy: 'bbReversal',
    type: 'Volatility',
    name: 'Bollinger Band Reversal',
    description: 'ボリンジャーバンド外側への行き過ぎから平均回帰を狙う。',
    enabled: true,
    takeProfit: 38,
    stopLoss: 28,
    params: { ...defaultParams, bollingerPeriod: 20 },
  },
  {
    id: 'logic-breakout',
    strategy: 'breakout',
    type: 'Breakout',
    name: 'Breakout',
    description: '直近レンジの高値または安値を抜けた方向へ入る。',
    enabled: true,
    takeProfit: 70,
    stopLoss: 34,
    params: { ...defaultParams, breakoutPeriod: 20 },
  },
];

export function createLogic(strategy: StrategyKind = 'maCross'): LogicDefinition {
  const typeByStrategy: Record<StrategyKind, LogicType> = {
    maCross: 'Trend',
    rsiReversal: 'Reversal',
    macdCross: 'Trend',
    bbReversal: 'Volatility',
    breakout: 'Breakout',
  };

  return {
    id: `logic-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    strategy,
    type: typeByStrategy[strategy],
    name: `${strategyLabels[strategy]} Custom`,
    description: 'カスタムロジック',
    enabled: true,
    takeProfit: 50,
    stopLoss: 30,
    params: { ...defaultParams },
  };
}

export function normalizeLogic(input: unknown, fallback?: LogicDefinition): LogicDefinition {
  const source = isRecord(input) ? input : {};
  const legacyKey = readString(source.key);
  const strategy = readStrategy(source.strategy) ?? readStrategy(legacyKey) ?? fallback?.strategy ?? 'maCross';

  return {
    id: readString(source.id) || legacyId(strategy),
    strategy,
    type: readLogicType(source.type) ?? fallback?.type ?? defaultType(strategy),
    name: readString(source.name) || fallback?.name || strategyLabels[strategy],
    description: readString(source.description) || fallback?.description || 'カスタムロジック',
    enabled: typeof source.enabled === 'boolean' ? source.enabled : fallback?.enabled ?? true,
    takeProfit: readNumber(source.takeProfit, fallback?.takeProfit ?? 50),
    stopLoss: readNumber(source.stopLoss, fallback?.stopLoss ?? 30),
    params: {
      ...defaultParams,
      ...(isRecord(fallback?.params) ? fallback?.params : {}),
      ...(isRecord(source.params) ? source.params : {}),
    },
  };
}

export function parseCsv(input: string): Candle[] {
  const result = parseCsvDetailed(input);
  if (result.report.status === 'error') {
    throw new Error(result.report.issues.filter((issue) => issue.severity === 'error').map((issue) => issue.message).join(' / '));
  }
  return result.candles;
}

export function parseCsvDetailed(input: string, expectedTimeframe?: Timeframe): CsvParseResult {
  const rows = input
    .trim()
    .split(/\r?\n/)
    .map((row) => row.split(',').map((cell) => cell.trim()));

  const issues: CsvValidationIssue[] = [];
  if (rows.length < 2) {
    return createCsvParseResult([], issues, 0, 0, false, expectedTimeframe, ['CSVにはヘッダーと2行以上のデータが必要です。']);
  }

  const header = rows[0].map((cell) => cell.toLowerCase());
  const required = ['time', 'open', 'high', 'low', 'close', 'volume'];
  const indexes = Object.fromEntries(required.map((name) => [name, header.indexOf(name)]));
  const missing = required.filter((name) => indexes[name] === -1);

  if (missing.length > 0) {
    return createCsvParseResult([], issues, rows.length - 1, 0, false, expectedTimeframe, [`必須カラムが不足しています: ${missing.join(', ')}`]);
  }

  const parsed: Candle[] = [];
  const seenTimes = new Set<string>();
  let duplicateTimes = 0;
  let invalidRows = 0;

  rows.slice(1).forEach((row, index) => {
    const candle: Candle = {
      time: row[indexes.time],
      open: Number(row[indexes.open]),
      high: Number(row[indexes.high]),
      low: Number(row[indexes.low]),
      close: Number(row[indexes.close]),
      volume: Number(row[indexes.volume]),
    };

    const date = parseCandleDate(candle.time);
    const numericValues = [candle.open, candle.high, candle.low, candle.close, candle.volume];
    const invalidDate = !candle.time || Number.isNaN(date.getTime());
    const invalidNumber = numericValues.some((value) => !Number.isFinite(value));
    const invalidPrice = candle.high < Math.max(candle.open, candle.close) || candle.low > Math.min(candle.open, candle.close);

    if (invalidDate || invalidNumber || invalidPrice) {
      invalidRows += 1;
      if (invalidDate) issues.push({ severity: 'error', message: `${index + 2}行目の日付形式を確認してください。` });
      if (invalidNumber) issues.push({ severity: 'error', message: `${index + 2}行目の数値列を確認してください。` });
      if (invalidPrice) issues.push({ severity: 'error', message: `${index + 2}行目の高値/安値が不正です。` });
      return;
    }

    if (seenTimes.has(candle.time)) {
      duplicateTimes += 1;
      issues.push({ severity: 'warning', message: `重複timeを検出しました: ${candle.time}` });
      return;
    }

    seenTimes.add(candle.time);
    parsed.push(candle);
  });

  if (invalidRows > 0) {
    return createCsvParseResult(parsed, issues, rows.length - 1, parsed.length, false, expectedTimeframe, []);
  }

  const sorted = [...parsed].sort((a, b) => parseCandleDate(a.time).getTime() - parseCandleDate(b.time).getTime());
  const wasSorted = parsed.every((candle, index) => candle.time === sorted[index]?.time);
  if (!wasSorted) {
    issues.push({ severity: 'warning', message: 'time順ではなかったため、昇順に並び替えました。' });
  }
  if (duplicateTimes > 0) {
    issues.push({ severity: 'warning', message: `${duplicateTimes.toLocaleString()}件の重複timeを除外しました。` });
  }

  const report = buildCsvValidationReport(sorted, issues, rows.length - 1, sorted.length, duplicateTimes, wasSorted, expectedTimeframe);
  return { candles: sorted, report };
}

function createCsvParseResult(
  candles: Candle[],
  issues: CsvValidationIssue[],
  rows: number,
  validRows: number,
  sorted: boolean,
  timeframe: Timeframe | undefined,
  errors: string[],
): CsvParseResult {
  const nextIssues = [...issues, ...errors.map((message) => ({ severity: 'error' as const, message }))];
  return {
    candles,
    report: buildCsvValidationReport(candles, nextIssues, rows, validRows, 0, sorted, timeframe),
  };
}

function buildCsvValidationReport(
  candles: Candle[],
  issues: CsvValidationIssue[],
  rows: number,
  validRows: number,
  duplicateTimes: number,
  sorted: boolean,
  timeframe?: Timeframe,
): CsvValidationReport {
  const missingCandles = timeframe ? countMissingCandles(candles, timeframe) : 0;
  if (missingCandles > 0) {
    issues.push({ severity: 'warning', message: `${timeframe}換算で${missingCandles.toLocaleString()}本の欠損ローソク足候補があります。` });
  }

  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const invalidRows = Math.max(0, rows - validRows - duplicateTimes);
  const score = Math.max(
    0,
    Math.round(
      100
      - errorCount * 18
      - warningCount * 5
      - invalidRows * 8
      - duplicateTimes * 3
      - missingCandles * 0.2
      - (sorted ? 0 : 5),
    ),
  );

  return {
    status: errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success',
    score,
    rows,
    validRows,
    duplicateTimes,
    sorted,
    missingCandles,
    issues,
  };
}

function countMissingCandles(candles: Candle[], timeframe: Timeframe): number {
  if (candles.length < 2) return 0;
  const interval = timeframeToMs(timeframe);
  let missing = 0;

  for (let index = 1; index < candles.length; index += 1) {
    const previous = parseCandleDate(candles[index - 1].time).getTime();
    const current = parseCandleDate(candles[index].time).getTime();
    if (!Number.isFinite(previous) || !Number.isFinite(current)) continue;
    const gap = current - previous;
    if (gap > interval * 1.5) {
      missing += Math.max(1, Math.round(gap / interval) - 1);
    }
  }

  return missing;
}

function timeframeToMs(timeframe: Timeframe): number {
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const table: Record<Timeframe, number> = {
    M1: minute,
    M5: 5 * minute,
    M15: 15 * minute,
    M30: 30 * minute,
    H1: hour,
    H4: 4 * hour,
    D1: day,
    W1: 7 * day,
    MN: 30 * day,
  };
  return table[timeframe];
}

export function generateSampleCsv(count = 720): string {
  const lines = ['time,open,high,low,close,volume'];
  let price = 150;

  for (let index = 0; index < count; index += 1) {
    const date = new Date(Date.UTC(2025, 0, 1, index));
    const wave = Math.sin(index / 12) * 0.32 + Math.cos(index / 31) * 0.2;
    const drift = (index % 47 === 0 ? 0.45 : 0) - (index % 71 === 0 ? 0.4 : 0);
    const open = price;
    const close = open + wave + drift + Math.sin(index * 1.7) * 0.08;
    const high = Math.max(open, close) + 0.14 + Math.abs(Math.cos(index)) * 0.08;
    const low = Math.min(open, close) - 0.14 - Math.abs(Math.sin(index)) * 0.08;
    const volume = 1200 + Math.round(Math.abs(Math.sin(index / 5)) * 900);

    lines.push(
      [
        formatDateTime(date),
        open.toFixed(3),
        high.toFixed(3),
        low.toFixed(3),
        close.toFixed(3),
        volume,
      ].join(','),
    );
    price = close;
  }

  return lines.join('\n');
}

export function runBacktests(
  candles: Candle[],
  logics: LogicDefinition[],
  settings: BacktestSettings = defaultSettings,
): BacktestResult[] {
  const filteredCandles = filterCandles(candles, settings);
  const activeLogics = logics.map((logic) => normalizeLogic(logic)).filter((logic) => logic.enabled);

  return activeLogics
    .map((logic) => runLogic(filteredCandles, logic, settings, true))
    .sort((a, b) => b.validation.score - a.validation.score || b.score - a.score);
}

export function filterCandles(candles: Candle[], settings: BacktestSettings): Candle[] {
  const start = settings.startDate ? new Date(`${settings.startDate}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const end = settings.endDate ? new Date(`${settings.endDate}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;

  return candles.filter((candle) => {
    const time = parseCandleDate(candle.time).getTime();
    return Number.isFinite(time) && time >= start && time <= end;
  });
}

function runLogic(
  candles: Candle[],
  logic: LogicDefinition,
  settings: BacktestSettings,
  includeValidation = false,
): BacktestResult {
  const signals = createSignals(candles, logic);
  const trades: Trade[] = [];
  let equity = settings.initialCapital;
  let peak = settings.initialCapital;
  let openTrade: { direction: 'Long' | 'Short'; entryIndex: number; entryPrice: number } | null = null;

  signals.forEach((signal, index) => {
    if (index < 35) return;
    const candle = candles[index];

    if (!openTrade && signal !== 'flat') {
      openTrade = {
        direction: signal === 'buy' ? 'Long' : 'Short',
        entryIndex: index,
        entryPrice: candle.close,
      };
      return;
    }

    if (!openTrade) return;

    const exit = resolveExit(openTrade.direction, openTrade.entryPrice, candle, signal, index, openTrade.entryIndex, candles.length, logic, settings);

    if (exit) {
      const result = calculateTradeProfit(openTrade.direction, openTrade.entryPrice, exit.price, settings);
      equity += result.profit;
      peak = Math.max(peak, equity);

      trades.push({
        id: `${logic.id}-${trades.length + 1}`,
        logicId: logic.id,
        logicName: logic.name,
        direction: openTrade.direction,
        entryTime: candles[openTrade.entryIndex].time,
        exitTime: candle.time,
        entryPrice: openTrade.entryPrice,
        exitPrice: exit.price,
        exitReason: exit.reason,
        pips: result.pips,
        grossProfit: result.grossProfit,
        cost: result.cost,
        profit: result.profit,
        maxFloatingLoss: calculateMaxFloatingLoss(openTrade.direction, openTrade.entryPrice, candles.slice(openTrade.entryIndex, index + 1), settings),
        equity,
        drawdown: peak - equity,
        barsHeld: index - openTrade.entryIndex,
      });
      openTrade = null;
    }
  });

  return summarize(logic, trades, settings, candles, includeValidation);
}

function resolveExit(
  direction: 'Long' | 'Short',
  entryPrice: number,
  candle: Candle,
  signal: Signal,
  currentIndex: number,
  entryIndex: number,
  candleCount: number,
  logic: LogicDefinition,
  settings: BacktestSettings,
): { price: number; reason: Trade['exitReason'] } | null {
  const pipSize = settings.pair.toUpperCase().includes('JPY') ? 0.01 : 0.0001;
  const tp = Math.max(logic.takeProfit, 0) * pipSize;
  const sl = Math.max(logic.stopLoss, 0) * pipSize;

  if (direction === 'Long') {
    if (sl > 0 && candle.low <= entryPrice - sl) return { price: entryPrice - sl, reason: 'SL' };
    if (tp > 0 && candle.high >= entryPrice + tp) return { price: entryPrice + tp, reason: 'TP' };
  } else {
    if (sl > 0 && candle.high >= entryPrice + sl) return { price: entryPrice + sl, reason: 'SL' };
    if (tp > 0 && candle.low <= entryPrice - tp) return { price: entryPrice - tp, reason: 'TP' };
  }

  const opposite = (direction === 'Long' && signal === 'sell') || (direction === 'Short' && signal === 'buy');
  if (opposite) return { price: candle.close, reason: 'Signal' };
  if (currentIndex - entryIndex >= 18) return { price: candle.close, reason: 'Time' };
  if (currentIndex === candleCount - 1) return { price: candle.close, reason: 'End' };
  return null;
}

function calculateTradeProfit(
  direction: 'Long' | 'Short',
  entryPrice: number,
  exitPrice: number,
  settings: BacktestSettings,
): { pips: number; grossProfit: number; cost: number; profit: number } {
  const pipSize = settings.pair.toUpperCase().includes('JPY') ? 0.01 : 0.0001;
  const pipValuePerLot = settings.pair.toUpperCase().includes('JPY') ? 1000 : 10;
  const rawPips = direction === 'Long' ? (exitPrice - entryPrice) / pipSize : (entryPrice - exitPrice) / pipSize;
  const grossProfit = rawPips * pipValuePerLot * settings.lotSize;
  const cost = settings.spread * pipValuePerLot * settings.lotSize + settings.commission;
  const profit = grossProfit - cost;

  return {
    pips: rawPips - settings.spread,
    grossProfit,
    cost,
    profit,
  };
}

function calculateMaxFloatingLoss(
  direction: 'Long' | 'Short',
  entryPrice: number,
  candles: Candle[],
  settings: BacktestSettings,
): number {
  const pipSize = settings.pair.toUpperCase().includes('JPY') ? 0.01 : 0.0001;
  const pipValuePerLot = settings.pair.toUpperCase().includes('JPY') ? 1000 : 10;
  let worstPips = 0;

  candles.forEach((candle) => {
    const adversePips = direction === 'Long'
      ? (candle.low - entryPrice) / pipSize
      : (entryPrice - candle.high) / pipSize;
    worstPips = Math.min(worstPips, adversePips);
  });

  return Math.abs(worstPips * pipValuePerLot * settings.lotSize);
}

function summarize(
  logic: LogicDefinition,
  trades: Trade[],
  settings: BacktestSettings,
  candles: Candle[],
  includeValidation = false,
): BacktestResult {
  const wins = trades.filter((trade) => trade.profit > 0);
  const losses = trades.filter((trade) => trade.profit < 0);
  const grossProfit = wins.reduce((sum, trade) => sum + trade.profit, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.profit, 0));
  const netProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
  const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 99 : 0) : grossProfit / grossLoss;
  const averageProfit = wins.length ? grossProfit / wins.length : 0;
  const averageLoss = losses.length ? losses.reduce((sum, trade) => sum + trade.profit, 0) / losses.length : 0;
  const maxDrawdown = trades.reduce((max, trade) => Math.max(max, trade.drawdown), 0);
  const expectancy = trades.length ? netProfit / trades.length : 0;
  const riskReward = averageLoss === 0 ? (averageProfit > 0 ? 99 : 0) : averageProfit / Math.abs(averageLoss);
  const maxConsecutiveLosses = calculateStreak(trades, false);
  const recoveryFactor = maxDrawdown === 0 ? (netProfit > 0 ? 99 : 0) : netProfit / maxDrawdown;
  const payoffRatio = riskReward;
  const averageHoldingBars = trades.length ? trades.reduce((sum, trade) => sum + trade.barsHeld, 0) / trades.length : 0;
  const maxFloatingLoss = trades.reduce((max, trade) => Math.max(max, trade.maxFloatingLoss), 0);
  const maxSingleLoss = losses.length ? Math.min(...losses.map((trade) => trade.profit)) : 0;
  const maxSingleProfit = wins.length ? Math.max(...wins.map((trade) => trade.profit)) : 0;
  const sharpeRatio = calculateSharpeRatio(trades);
  const sampleDays = calculateSampleDays(candles);
  const warnings = buildBacktestWarnings({
    tradeCount: trades.length,
    sampleDays,
    maxDrawdown,
    initialCapital: settings.initialCapital,
    profitFactor,
    winRate,
    recoveryFactor,
  });
  const reliability = calculateReliabilityLabel(warnings, trades.length, sampleDays, recoveryFactor);
  const score = calculateScore({
    profitFactor,
    maxDrawdown,
    tradeCount: trades.length,
    expectancy,
    recoveryFactor,
    maxConsecutiveLosses,
    initialCapital: settings.initialCapital,
  });

  const baseResult = {
    logicId: logic.id,
    logicName: logic.name,
    logicType: logic.type,
    strategy: logic.strategy,
    winRate,
    profitFactor,
    maxDrawdown,
    tradeCount: trades.length,
    netProfit,
    averageProfit,
    averageLoss,
    score,
    reliability,
    warnings,
    trades,
    analytics: {
      expectancy,
      riskReward,
      sharpeRatio,
      recoveryFactor,
      payoffRatio,
      averageHoldingBars,
      maxFloatingLoss,
      maxSingleLoss,
      maxSingleProfit,
      maxConsecutiveWins: calculateStreak(trades, true),
      maxConsecutiveLosses,
      monthlyProfits: groupMonthlyProfits(trades),
      weekdayWinRates: groupWinRates(trades, 'weekday'),
      hourlyWinRates: groupWinRates(trades, 'hour'),
      equityCurve: buildEquityCurve(trades, settings.initialCapital),
      drawdownCurve: trades.map((trade) => ({ label: trade.exitTime, value: trade.drawdown })),
    },
  };

  return {
    ...baseResult,
    validation: includeValidation ? analyzeReliability(candles, logic, settings, baseResult) : createEmptyReliabilityAnalysis(),
  };
}

function analyzeReliability(
  candles: Candle[],
  logic: LogicDefinition,
  settings: BacktestSettings,
  baseResult: Omit<BacktestResult, 'validation'>,
): ReliabilityAnalysis {
  const walkForward = runWalkForwardTest(candles, logic, settings);
  const outOfSample = runOutOfSampleTest(candles, logic, settings);
  const monteCarlo = runMonteCarloSimulation(baseResult.trades, settings.initialCapital, 120);
  const marketRegimes = analyzeMarketRegimes(candles, baseResult.trades, settings, logic);
  const bestRegime = marketRegimes.length > 0 ? marketRegimes.reduce((best, item) => (item.score > best.score ? item : best), marketRegimes[0]).regime : '-';
  const score = calculateReliabilityScore(baseResult, walkForward, outOfSample, monteCarlo);

  return {
    score,
    walkForward,
    outOfSample,
    monteCarlo,
    marketRegimes,
    bestRegime,
  };
}

function runWalkForwardTest(candles: Candle[], logic: LogicDefinition, settings: BacktestSettings): WalkForwardSegment[] {
  if (candles.length < 160) return [];

  const trainSize = Math.max(80, Math.floor(candles.length * 0.28));
  const testSize = Math.max(40, Math.floor(candles.length * 0.14));
  const step = testSize;
  const segments: WalkForwardSegment[] = [];

  for (let start = 0; start + trainSize + testSize <= candles.length && segments.length < 8; start += step) {
    const trainCandles = candles.slice(start, start + trainSize);
    const testCandles = candles.slice(start + trainSize, start + trainSize + testSize);
    const inSampleResult = runLogic(trainCandles, logic, settings, false);
    const outSampleResult = runLogic(testCandles, logic, settings, false);
    const inSample = summarizeTrades(inSampleResult.trades, settings.initialCapital);
    const outOfSample = summarizeTrades(outSampleResult.trades, settings.initialCapital);

    segments.push({
      label: `WF ${segments.length + 1}`,
      trainStart: trainCandles[0]?.time ?? '-',
      trainEnd: trainCandles[trainCandles.length - 1]?.time ?? '-',
      testStart: testCandles[0]?.time ?? '-',
      testEnd: testCandles[testCandles.length - 1]?.time ?? '-',
      inSample,
      outOfSample,
      score: scoreValidationSummary(outOfSample),
    });
  }

  return segments;
}

function runOutOfSampleTest(candles: Candle[], logic: LogicDefinition, settings: BacktestSettings): OutOfSampleAnalysis {
  if (candles.length < 80) {
    const empty = summarizeTrades([], settings.initialCapital);
    return { splitDate: '-', inSample: empty, outOfSample: empty, retentionRate: 0 };
  }

  const splitIndex = Math.max(40, Math.floor(candles.length * 0.7));
  const inSampleCandles = candles.slice(0, splitIndex);
  const outSampleCandles = candles.slice(splitIndex);
  const inSample = summarizeTrades(runLogic(inSampleCandles, logic, settings, false).trades, settings.initialCapital);
  const outOfSample = summarizeTrades(runLogic(outSampleCandles, logic, settings, false).trades, settings.initialCapital);
  const retentionRate = inSample.netProfit <= 0 ? (outOfSample.netProfit > 0 ? 100 : 0) : clamp((outOfSample.netProfit / inSample.netProfit) * 100, 0, 160);

  return {
    splitDate: candles[splitIndex]?.time ?? '-',
    inSample,
    outOfSample,
    retentionRate,
  };
}

function runMonteCarloSimulation(trades: Trade[], initialCapital: number, runs: number): MonteCarloAnalysis {
  if (trades.length === 0) {
    return {
      runs,
      averageProfit: 0,
      averageMaxDrawdown: 0,
      worstMaxDrawdown: 0,
      profitP10: 0,
      profitP50: 0,
      profitP90: 0,
      winRateP10: 0,
      winRateP50: 0,
      winRateP90: 0,
    };
  }

  const profits = trades.map((trade) => trade.profit);
  const outcomes = Array.from({ length: runs }, (_, runIndex) => {
    const shuffled = shuffleDeterministic(profits, runIndex + 17);
    const summary = summarizeProfitSequence(shuffled, initialCapital);
    return {
      profit: summary.netProfit,
      maxDrawdown: summary.maxDrawdown,
      winRate: summary.winRate,
    };
  });

  const sortedProfits = outcomes.map((item) => item.profit).sort((a, b) => a - b);
  const sortedDrawdowns = outcomes.map((item) => item.maxDrawdown).sort((a, b) => a - b);
  const sortedWinRates = outcomes.map((item) => item.winRate).sort((a, b) => a - b);

  return {
    runs,
    averageProfit: average(sortedProfits),
    averageMaxDrawdown: average(sortedDrawdowns),
    worstMaxDrawdown: sortedDrawdowns[sortedDrawdowns.length - 1] ?? 0,
    profitP10: percentile(sortedProfits, 10),
    profitP50: percentile(sortedProfits, 50),
    profitP90: percentile(sortedProfits, 90),
    winRateP10: percentile(sortedWinRates, 10),
    winRateP50: percentile(sortedWinRates, 50),
    winRateP90: percentile(sortedWinRates, 90),
  };
}

function analyzeMarketRegimes(
  candles: Candle[],
  trades: Trade[],
  settings: BacktestSettings,
  logic: LogicDefinition,
): MarketRegimeStat[] {
  const regimes = classifyMarketRegimes(candles);
  const buckets = new Map<MarketRegime, Trade[]>(
    (['Trend', 'Range', 'High Volatility', 'Low Volatility'] as MarketRegime[]).map((regime) => [regime, []]),
  );
  const bars = new Map<MarketRegime, number>(
    (['Trend', 'Range', 'High Volatility', 'Low Volatility'] as MarketRegime[]).map((regime) => [regime, 0]),
  );
  regimes.forEach((regime) => bars.set(regime, (bars.get(regime) ?? 0) + 1));

  trades.forEach((trade) => {
    const entryIndex = candles.findIndex((candle) => candle.time === trade.entryTime);
    const regime = regimes[Math.max(entryIndex, 0)] ?? defaultRegimeForLogic(logic);
    buckets.get(regime)?.push(trade);
  });

  return [...buckets.entries()].map(([regime, items]) => {
    const summary = summarizeTrades(items, settings.initialCapital);
    return {
      regime,
      bars: bars.get(regime) ?? 0,
      trades: summary.tradeCount,
      winRate: summary.winRate,
      netProfit: summary.netProfit,
      profitFactor: summary.profitFactor,
      score: scoreValidationSummary(summary),
    };
  });
}

function classifyMarketRegimes(candles: Candle[]): MarketRegime[] {
  if (candles.length === 0) return [];
  const lookback = Math.min(30, Math.max(10, Math.floor(candles.length / 12)));
  const profiles = candles.map((candle, index) => {
    const start = Math.max(0, index - lookback + 1);
    const window = candles.slice(start, index + 1);
    const averageRange = average(window.map((item) => Math.abs(item.high - item.low) / Math.max(item.close, 0.0001)));
    const netMove = Math.abs(candle.close - window[0].close);
    const pathMove = window.slice(1).reduce((sum, item, innerIndex) => sum + Math.abs(item.close - window[innerIndex].close), 0);
    const trendRatio = pathMove === 0 ? 0 : netMove / pathMove;
    return { volatility: averageRange, trendRatio };
  });
  const medianVolatility = percentile(profiles.map((profile) => profile.volatility).sort((a, b) => a - b), 50);

  return profiles.map((profile) => {
    if (profile.volatility >= medianVolatility * 1.18) return 'High Volatility';
    if (profile.volatility <= medianVolatility * 0.82) return 'Low Volatility';
    return profile.trendRatio >= 0.42 ? 'Trend' : 'Range';
  });
}

function calculateReliabilityScore(
  result: Omit<BacktestResult, 'validation'>,
  walkForward: WalkForwardSegment[],
  outOfSample: OutOfSampleAnalysis,
  monteCarlo: MonteCarloAnalysis,
): number {
  const pfScore = clamp((Math.min(result.profitFactor, 3) / 3) * 18, 0, 18);
  const drawdownRate = result.maxDrawdown / Math.max(result.maxDrawdown + Math.max(result.netProfit, 0), result.maxDrawdown, result.analytics.maxFloatingLoss, 1);
  const ddScore = clamp((1 - drawdownRate) * 16, 0, 16);
  const oosScore = clamp(scoreValidationSummary(outOfSample.outOfSample) * 0.18 + outOfSample.retentionRate * 0.07, 0, 22);
  const mcProfitScore = monteCarlo.profitP10 > 0 ? 14 : clamp((monteCarlo.profitP50 / Math.max(Math.abs(monteCarlo.averageMaxDrawdown), 1)) * 5 + 7, 0, 14);
  const tradeScore = clamp((result.tradeCount / 80) * 12, 0, 12);
  const wfAverage = walkForward.length ? average(walkForward.map((segment) => segment.score)) : 0;
  const wfPositiveRate = walkForward.length ? walkForward.filter((segment) => segment.outOfSample.netProfit > 0).length / walkForward.length : 0;
  const wfScore = clamp(wfAverage * 0.1 + wfPositiveRate * 8, 0, 18);

  return Math.round(clamp(pfScore + ddScore + oosScore + mcProfitScore + tradeScore + wfScore, 0, 100));
}

function createEmptyReliabilityAnalysis(): ReliabilityAnalysis {
  const empty = summarizeTrades([], defaultSettings.initialCapital);
  return {
    score: 0,
    walkForward: [],
    outOfSample: { splitDate: '-', inSample: empty, outOfSample: empty, retentionRate: 0 },
    monteCarlo: runMonteCarloSimulation([], defaultSettings.initialCapital, 120),
    marketRegimes: [],
    bestRegime: '-',
  };
}

function summarizeTrades(trades: Trade[], initialCapital: number): ValidationSummary {
  const profits = trades.map((trade) => trade.profit);
  const sequence = summarizeProfitSequence(profits, initialCapital);
  const wins = trades.filter((trade) => trade.profit > 0);
  const losses = trades.filter((trade) => trade.profit < 0);
  const grossProfit = wins.reduce((sum, trade) => sum + trade.profit, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.profit, 0));

  return {
    netProfit: sequence.netProfit,
    profitFactor: grossLoss === 0 ? (grossProfit > 0 ? 99 : 0) : grossProfit / grossLoss,
    maxDrawdown: sequence.maxDrawdown,
    winRate: sequence.winRate,
    tradeCount: trades.length,
  };
}

function summarizeProfitSequence(profits: number[], initialCapital: number): ValidationSummary {
  let equity = initialCapital;
  let peak = initialCapital;
  let maxDrawdown = 0;
  let wins = 0;

  profits.forEach((profit) => {
    equity += profit;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
    wins += profit > 0 ? 1 : 0;
  });

  return {
    netProfit: profits.reduce((sum, profit) => sum + profit, 0),
    profitFactor: 0,
    maxDrawdown,
    winRate: profits.length ? (wins / profits.length) * 100 : 0,
    tradeCount: profits.length,
  };
}

function scoreValidationSummary(summary: ValidationSummary): number {
  const pfScore = clamp((Math.min(summary.profitFactor, 3) / 3) * 34, 0, 34);
  const profitScore = clamp(Math.tanh(summary.netProfit / 150000) * 28, -18, 28);
  const ddScore = summary.maxDrawdown === 0 ? 18 : clamp(18 - Math.log10(summary.maxDrawdown + 1) * 3.4, 0, 18);
  const tradeScore = clamp((summary.tradeCount / 24) * 20, 0, 20);
  return Math.round(clamp(pfScore + profitScore + ddScore + tradeScore, 0, 100));
}

function shuffleDeterministic(values: number[], seed: number): number[] {
  const output = [...values];
  let state = seed * 48271;

  for (let index = output.length - 1; index > 0; index -= 1) {
    state = (state * 16807) % 2147483647;
    const swapIndex = state % (index + 1);
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }

  return output;
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function percentile(sortedValues: number[], percentileValue: number): number {
  if (sortedValues.length === 0) return 0;
  const index = clamp((percentileValue / 100) * (sortedValues.length - 1), 0, sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function defaultRegimeForLogic(logic: LogicDefinition): MarketRegime {
  if (logic.type === 'Trend' || logic.type === 'Breakout') return 'Trend';
  if (logic.type === 'Volatility') return 'High Volatility';
  return 'Range';
}

function calculateScore(input: {
  profitFactor: number;
  maxDrawdown: number;
  tradeCount: number;
  expectancy: number;
  recoveryFactor: number;
  maxConsecutiveLosses: number;
  initialCapital: number;
}): number {
  const pfScore = Math.min(input.profitFactor, 3) * 18;
  const expectancyScore = Math.tanh(input.expectancy / 12000) * 22;
  const recoveryScore = Math.max(0, Math.min(input.recoveryFactor, 5)) * 10;
  const activityScore = Math.min(input.tradeCount, 80) * 0.35;
  const drawdownRate = input.initialCapital > 0 ? input.maxDrawdown / input.initialCapital : 0;
  const drawdownPenalty = Math.min(drawdownRate * 100, 35) * 1.1;
  const losingStreakPenalty = Math.min(input.maxConsecutiveLosses, 12) * 2.2;

  return Math.max(0, Math.round((pfScore + expectancyScore + recoveryScore + activityScore - drawdownPenalty - losingStreakPenalty) * 10) / 10);
}

function calculateSharpeRatio(trades: Trade[]): number {
  if (trades.length < 2) return 0;
  const returns = trades.map((trade, index) => {
    const previousEquity = index === 0 ? trade.equity - trade.profit : trades[index - 1].equity;
    return previousEquity !== 0 ? trade.profit / previousEquity : 0;
  });
  const average = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - average) ** 2, 0) / (returns.length - 1);
  const stdev = Math.sqrt(variance);
  return stdev === 0 ? 0 : (average / stdev) * Math.sqrt(Math.min(252, trades.length));
}

function calculateSampleDays(candles: Candle[]): number {
  if (candles.length < 2) return 0;
  const start = parseCandleDate(candles[0].time).getTime();
  const end = parseCandleDate(candles[candles.length - 1].time).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)));
}

function buildBacktestWarnings(input: {
  tradeCount: number;
  sampleDays: number;
  maxDrawdown: number;
  initialCapital: number;
  profitFactor: number;
  winRate: number;
  recoveryFactor: number;
}): BacktestWarning[] {
  const warnings: BacktestWarning[] = [];
  const drawdownRate = input.initialCapital > 0 ? (input.maxDrawdown / input.initialCapital) * 100 : 0;

  if (input.tradeCount < 20) warnings.push({ severity: 'warning', message: '取引回数が20回未満です。統計的な信頼性が低い可能性があります。' });
  if (input.sampleDays < 30) warnings.push({ severity: 'warning', message: 'サンプル期間が30日未満です。相場局面の偏りに注意してください。' });
  if (drawdownRate >= 25) warnings.push({ severity: 'danger', message: `最大DDが初期資金の${drawdownRate.toFixed(1)}%です。資金管理リスクが大きいです。` });
  if (input.profitFactor >= 5 && input.tradeCount < 80) warnings.push({ severity: 'warning', message: 'PFが異常に高く、取引回数が十分ではありません。過剰最適化の可能性があります。' });
  if (input.winRate >= 70 && input.profitFactor < 1.2) warnings.push({ severity: 'danger', message: '勝率は高い一方でPFが低く、損大利小の危険があります。' });
  if (input.recoveryFactor > 0 && input.recoveryFactor < 1) warnings.push({ severity: 'warning', message: 'Recovery Factorが1未満です。DD回復力が弱い可能性があります。' });

  return warnings;
}

function calculateReliabilityLabel(
  warnings: BacktestWarning[],
  tradeCount: number,
  sampleDays: number,
  recoveryFactor: number,
): ReliabilityLabel {
  const dangerCount = warnings.filter((warning) => warning.severity === 'danger').length;
  if (dangerCount > 0 || tradeCount < 10 || sampleDays < 14) return 'Low';
  if (warnings.length > 0 || tradeCount < 40 || sampleDays < 60 || recoveryFactor < 1.5) return 'Medium';
  return 'High';
}

function calculateStreak(trades: Trade[], winning: boolean): number {
  let current = 0;
  let max = 0;

  trades.forEach((trade) => {
    const matched = winning ? trade.profit > 0 : trade.profit < 0;
    current = matched ? current + 1 : 0;
    max = Math.max(max, current);
  });

  return max;
}

function groupMonthlyProfits(trades: Trade[]): CurvePoint[] {
  const grouped = new Map<string, number>();

  trades.forEach((trade) => {
    const date = parseCandleDate(trade.exitTime);
    const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    grouped.set(label, (grouped.get(label) ?? 0) + trade.profit);
  });

  return [...grouped.entries()].map(([label, value]) => ({ label, value }));
}

function groupWinRates(trades: Trade[], unit: 'weekday' | 'hour'): PeriodStat[] {
  const labels =
    unit === 'weekday'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`);
  const map = new Map(labels.map((label) => [label, { label, trades: 0, wins: 0, profit: 0 }]));

  trades.forEach((trade) => {
    const date = parseCandleDate(trade.exitTime);
    const label = unit === 'weekday' ? labels[date.getDay()] : labels[date.getHours()];
    const current = map.get(label);
    if (!current) return;
    current.trades += 1;
    current.wins += trade.profit > 0 ? 1 : 0;
    current.profit += trade.profit;
  });

  return [...map.values()].map((item) => ({
    ...item,
    winRate: item.trades ? (item.wins / item.trades) * 100 : 0,
  }));
}

function buildEquityCurve(trades: Trade[], initialCapital: number): CurvePoint[] {
  return [{ label: 'Start', value: initialCapital }, ...trades.map((trade) => ({ label: trade.exitTime, value: trade.equity }))];
}

function createSignals(candles: Candle[], logic: LogicDefinition): Signal[] {
  const closes = candles.map((candle) => candle.close);
  switch (logic.strategy) {
    case 'maCross':
      return maCrossSignals(closes, logic.params.maFast, logic.params.maSlow);
    case 'rsiReversal':
      return rsiSignals(closes, logic.params.rsiPeriod);
    case 'macdCross':
      return macdSignals(closes, logic.params.macdFast, logic.params.macdSlow, logic.params.macdSignal);
    case 'bbReversal':
      return bollingerSignals(closes, logic.params.bollingerPeriod);
    case 'breakout':
      return breakoutSignals(candles, logic.params.breakoutPeriod);
  }
}

function maCrossSignals(closes: number[], fastPeriod: number, slowPeriod: number): Signal[] {
  const fast = sma(closes, Math.max(2, fastPeriod));
  const slow = sma(closes, Math.max(3, slowPeriod));
  return closes.map((_, index) => {
    if (index === 0 || !fast[index - 1] || !slow[index - 1] || !fast[index] || !slow[index]) return 'flat';
    if (fast[index - 1] <= slow[index - 1] && fast[index] > slow[index]) return 'buy';
    if (fast[index - 1] >= slow[index - 1] && fast[index] < slow[index]) return 'sell';
    return 'flat';
  });
}

function rsiSignals(closes: number[], period: number): Signal[] {
  const values = rsi(closes, Math.max(2, period));
  return closes.map((_, index) => {
    if (index === 0 || !values[index - 1] || !values[index]) return 'flat';
    if (values[index - 1] < 32 && values[index] >= 32) return 'buy';
    if (values[index - 1] > 68 && values[index] <= 68) return 'sell';
    return 'flat';
  });
}

function macdSignals(closes: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number): Signal[] {
  const fast = ema(closes, Math.max(2, fastPeriod));
  const slow = ema(closes, Math.max(3, slowPeriod));
  const macd = fast.map((value, index) => value - slow[index]);
  const signal = ema(macd, Math.max(2, signalPeriod));

  return closes.map((_, index) => {
    if (index === 0) return 'flat';
    if (macd[index - 1] <= signal[index - 1] && macd[index] > signal[index]) return 'buy';
    if (macd[index - 1] >= signal[index - 1] && macd[index] < signal[index]) return 'sell';
    return 'flat';
  });
}

function bollingerSignals(closes: number[], period: number): Signal[] {
  const safePeriod = Math.max(3, period);
  const mid = sma(closes, safePeriod);
  const dev = rollingStd(closes, safePeriod);
  return closes.map((close, index) => {
    if (!mid[index] || !dev[index]) return 'flat';
    const upper = mid[index] + dev[index] * 2;
    const lower = mid[index] - dev[index] * 2;
    if (close < lower) return 'buy';
    if (close > upper) return 'sell';
    return 'flat';
  });
}

function breakoutSignals(candles: Candle[], period: number): Signal[] {
  const safePeriod = Math.max(2, period);
  return candles.map((candle, index) => {
    if (index < safePeriod) return 'flat';
    const window = candles.slice(index - safePeriod, index);
    const high = Math.max(...window.map((item) => item.high));
    const low = Math.min(...window.map((item) => item.low));
    if (candle.close > high) return 'buy';
    if (candle.close < low) return 'sell';
    return 'flat';
  });
}

function sma(values: number[], period: number): number[] {
  return values.map((_, index) => {
    if (index + 1 < period) return 0;
    const window = values.slice(index + 1 - period, index + 1);
    return window.reduce((sum, value) => sum + value, 0) / period;
  });
}

function ema(values: number[], period: number): number[] {
  const multiplier = 2 / (period + 1);
  return values.reduce<number[]>((series, value, index) => {
    if (index === 0) return [value];
    series.push(value * multiplier + series[index - 1] * (1 - multiplier));
    return series;
  }, []);
}

function rsi(values: number[], period: number): number[] {
  const output = Array(values.length).fill(0);
  for (let index = period; index < values.length; index += 1) {
    const window = values.slice(index - period + 1, index + 1);
    let gains = 0;
    let losses = 0;
    for (let inner = 1; inner < window.length; inner += 1) {
      const change = window[inner] - window[inner - 1];
      if (change >= 0) gains += change;
      else losses += Math.abs(change);
    }
    const rs = losses === 0 ? 100 : gains / losses;
    output[index] = 100 - 100 / (1 + rs);
  }
  return output;
}

function rollingStd(values: number[], period: number): number[] {
  return values.map((_, index) => {
    if (index + 1 < period) return 0;
    const window = values.slice(index + 1 - period, index + 1);
    const average = window.reduce((sum, value) => sum + value, 0) / period;
    const variance = window.reduce((sum, value) => sum + (value - average) ** 2, 0) / period;
    return Math.sqrt(variance);
  });
}

function parseCandleDate(value: string): Date {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  return new Date(normalized);
}

function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

function legacyId(strategy: StrategyKind): string {
  return `logic-${strategy}`;
}

function defaultType(strategy: StrategyKind): LogicType {
  if (strategy === 'rsiReversal') return 'Reversal';
  if (strategy === 'breakout') return 'Breakout';
  if (strategy === 'bbReversal') return 'Volatility';
  return 'Trend';
}

function readStrategy(value: unknown): StrategyKind | undefined {
  return value === 'maCross' ||
    value === 'rsiReversal' ||
    value === 'macdCross' ||
    value === 'bbReversal' ||
    value === 'breakout'
    ? value
    : undefined;
}

function readLogicType(value: unknown): LogicType | undefined {
  return value === 'Trend' || value === 'Reversal' || value === 'Breakout' || value === 'Volatility' ? value : undefined;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
