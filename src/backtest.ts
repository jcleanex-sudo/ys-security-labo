export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type StrategyKind = 'maCross' | 'rsiReversal' | 'macdCross' | 'bbReversal' | 'breakout' | 'zeroLogic';
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
  newsGuardEnabled: boolean;
  newsGuardMinutes: number;
  newsEvents: string;
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
  atrPeriod: number;
  adxPeriod: number;
  zeroMinConfirmations: number;
  vwapPeriod: number;
  fibonacciLookback: number;
  zeroMinRiskReward: number;
  zeroAtrStopMultiplier: number;
  zeroAtrTargetMultiplier: number;
  zeroWeightedThreshold: number;
  volumePeriod: number;
  volumeMultiplier: number;
  zeroDisabledConditions: ZeroConditionKey[];
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
  entryScore?: number;
  entryGrade?: string;
  entryConfirmations?: number;
  entrySRank?: string[];
  entryARank?: string[];
  entryBlocks?: string[];
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

export type ZeroConditionStat = {
  label: string;
  rank: 'S' | 'A';
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netProfit: number;
  profitFactor: number;
  expectancy: number;
  averageScore: number;
  averagePips: number;
};

export type ZeroConditionKey = 'mtf' | 'dow' | 'horizontal' | 'volume' | 'atr' | 'ema' | 'adx' | 'rsi' | 'candle' | 'riskReward';

export type ZeroOptimizationStat = {
  conditionKey: ZeroConditionKey;
  condition: string;
  rank: 'S' | 'A';
  baselineTrades: number;
  testTrades: number;
  baselineWinRate: number;
  testWinRate: number;
  baselineProfitFactor: number;
  testProfitFactor: number;
  baselineNetProfit: number;
  testNetProfit: number;
  deltaNetProfit: number;
  baselineScore: number;
  testScore: number;
  deltaScore: number;
  recommendation: 'Keep' | 'Review' | 'Disable Candidate';
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
  zeroConditionStats: ZeroConditionStat[];
  zeroOptimizationStats: ZeroOptimizationStat[];
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

export type LiveSignal = {
  time: string;
  pair: string;
  timeframe: Timeframe;
  logicId: string;
  logicName: string;
  side: 'Buy' | 'Sell' | 'Flat';
  regime: MarketRegime | '-';
  price: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  takeProfitPips: number;
  stopLossPips: number;
  confidence: number;
  note: string;
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

type TradePlan = {
  takeProfitPrice: number;
  stopLossPrice: number;
  takeProfitPips: number;
  stopLossPips: number;
};

type SignalDetail = {
  signal: Signal;
  score: number;
  grade: string;
  confirmations: number;
  sRank: string[];
  aRank: string[];
  blocks: string[];
};

export const strategyLabels: Record<StrategyKind, string> = {
  maCross: 'MA Cross',
  rsiReversal: 'RSI Reversal',
  macdCross: 'MACD Cross',
  bbReversal: 'Bollinger Band Reversal',
  breakout: 'Breakout',
  zeroLogic: 'ZERO Logic',
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
  atrPeriod: 14,
  adxPeriod: 14,
  zeroMinConfirmations: 7,
  vwapPeriod: 80,
  fibonacciLookback: 120,
  zeroMinRiskReward: 2,
  zeroAtrStopMultiplier: 1.2,
  zeroAtrTargetMultiplier: 1.8,
  zeroWeightedThreshold: 76,
  volumePeriod: 30,
  volumeMultiplier: 1.2,
  zeroDisabledConditions: [],
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
  newsGuardEnabled: false,
  newsGuardMinutes: 30,
  newsEvents: '',
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
  {
    id: 'logic-zero',
    strategy: 'zeroLogic',
    type: 'Trend',
    name: 'ZERO Logic',
    description: 'EMA20/75、MA200、RSI、MACD、BB、水平線、ダウ、ATR、ADX/DMI、ローソク足を複合判定する順張りロジック。',
    enabled: true,
    takeProfit: 90,
    stopLoss: 35,
    params: {
      ...defaultParams,
      maFast: 20,
      maSlow: 75,
      rsiPeriod: 14,
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      bollingerPeriod: 20,
      breakoutPeriod: 20,
      atrPeriod: 14,
      adxPeriod: 14,
      zeroMinConfirmations: 7,
      vwapPeriod: 80,
      fibonacciLookback: 120,
      zeroMinRiskReward: 2,
      zeroAtrStopMultiplier: 1.2,
      zeroAtrTargetMultiplier: 1.8,
    },
  },
];

export function createLogic(strategy: StrategyKind = 'maCross'): LogicDefinition {
  const typeByStrategy: Record<StrategyKind, LogicType> = {
    maCross: 'Trend',
    rsiReversal: 'Reversal',
    macdCross: 'Trend',
    bbReversal: 'Volatility',
    breakout: 'Breakout',
    zeroLogic: 'Trend',
  };
  const strategyParams = strategy === 'zeroLogic'
    ? {
        ...defaultParams,
        maFast: 20,
        maSlow: 75,
        rsiPeriod: 14,
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
        bollingerPeriod: 20,
        breakoutPeriod: 20,
        atrPeriod: 14,
        adxPeriod: 14,
        zeroMinConfirmations: 7,
      }
    : { ...defaultParams };

  return {
    id: `logic-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    strategy,
    type: typeByStrategy[strategy],
    name: `${strategyLabels[strategy]} Custom`,
    description: 'カスタムロジック',
    enabled: true,
    takeProfit: strategy === 'zeroLogic' ? 90 : 50,
    stopLoss: strategy === 'zeroLogic' ? 35 : 30,
    params: strategyParams,
  };
}

export function normalizeLogic(input: unknown, fallback?: LogicDefinition): LogicDefinition {
  const source = isRecord(input) ? input : {};
  const legacyKey = readString(source.key);
  const strategy = readStrategy(source.strategy) ?? readStrategy(legacyKey) ?? fallback?.strategy ?? 'maCross';
  const rawParams = {
    ...defaultParams,
    ...(isRecord(fallback?.params) ? fallback?.params : {}),
    ...(isRecord(source.params) ? source.params : {}),
  };

  return {
    id: readString(source.id) || legacyId(strategy),
    strategy,
    type: readLogicType(source.type) ?? fallback?.type ?? defaultType(strategy),
    name: readString(source.name) || fallback?.name || strategyLabels[strategy],
    description: readString(source.description) || fallback?.description || 'カスタムロジック',
    enabled: typeof source.enabled === 'boolean' ? source.enabled : fallback?.enabled ?? true,
    takeProfit: readNumber(source.takeProfit, fallback?.takeProfit ?? 50),
    stopLoss: readNumber(source.stopLoss, fallback?.stopLoss ?? 30),
    params: normalizeLogicParams(rawParams),
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

export function generateLiveSignal(
  candles: Candle[],
  inputLogic: LogicDefinition,
  settings: BacktestSettings = defaultSettings,
): LiveSignal {
  const logic = normalizeLogic(inputLogic);
  const latest = candles[candles.length - 1];
  const emptyPrice = latest?.close ?? 0;

  if (!latest || candles.length < 36) {
    return {
      time: latest?.time ?? '-',
      pair: settings.pair,
      timeframe: settings.timeframe,
      logicId: logic.id,
      logicName: logic.name,
      side: 'Flat',
      regime: '-',
      price: emptyPrice,
      takeProfitPrice: emptyPrice,
      stopLossPrice: emptyPrice,
      takeProfitPips: logic.takeProfit,
      stopLossPips: logic.stopLoss,
      confidence: 0,
      note: 'Waiting for enough candles. No order execution.',
    };
  }

  const signals = createSignals(candles, logic, settings);
  const signal = signals[signals.length - 1] ?? 'flat';
  const side = signal === 'buy' ? 'Buy' : signal === 'sell' ? 'Sell' : 'Flat';
  const plan = side === 'Flat'
    ? fixedTradePlan(latest.close, 'Long', logic, settings)
    : buildTradePlan(candles, candles.length - 1, side === 'Buy' ? 'Long' : 'Short', logic, settings);
  const regimes = classifyMarketRegimes(candles);
  const regime = regimes[regimes.length - 1] ?? defaultRegimeForLogic(logic);
  const regimeMatch =
    (logic.type === 'Trend' && regime === 'Trend') ||
    (logic.type === 'Breakout' && regime === 'Trend') ||
    (logic.type === 'Volatility' && regime === 'High Volatility') ||
    (logic.type === 'Reversal' && regime === 'Range');
  const confidence = side === 'Flat' ? 0 : Math.round(Math.min(95, 56 + (regimeMatch ? 18 : 4) + Math.min(candles.length / 60, 12)));

  return {
    time: latest.time,
    pair: settings.pair,
    timeframe: settings.timeframe,
    logicId: logic.id,
    logicName: logic.name,
    side,
    regime,
    price: latest.close,
    takeProfitPrice: side === 'Flat' ? latest.close : plan.takeProfitPrice,
    stopLossPrice: side === 'Flat' ? latest.close : plan.stopLossPrice,
    takeProfitPips: side === 'Flat' ? 0 : plan.takeProfitPips,
    stopLossPips: side === 'Flat' ? 0 : plan.stopLossPips,
    confidence,
    note: side === 'Flat' ? 'No signal. Monitoring only.' : 'Signal alert only. No auto trade executed.',
  };
}

function runLogic(
  candles: Candle[],
  logic: LogicDefinition,
  settings: BacktestSettings,
  includeValidation = false,
  disabledZeroCondition?: ZeroConditionKey,
): BacktestResult {
  const signalDetails = createSignalDetails(candles, logic, settings, disabledZeroCondition);
  const signals = signalDetails.map((detail) => detail.signal);
  const trades: Trade[] = [];
  let equity = settings.initialCapital;
  let peak = settings.initialCapital;
  let openTrade: { direction: 'Long' | 'Short'; entryIndex: number; entryPrice: number; plan: TradePlan; detail: SignalDetail } | null = null;

  signals.forEach((signal, index) => {
    if (index < 35) return;
    const candle = candles[index];

    if (!openTrade && signal !== 'flat') {
      openTrade = {
        direction: signal === 'buy' ? 'Long' : 'Short',
        entryIndex: index,
        entryPrice: candle.close,
        plan: buildTradePlan(candles, index, signal === 'buy' ? 'Long' : 'Short', logic, settings),
        detail: signalDetails[index],
      };
      return;
    }

    if (!openTrade) return;

    const exit = resolveExit(openTrade.direction, openTrade.entryPrice, openTrade.plan, candle, signal, index, openTrade.entryIndex, candles.length);

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
        entryScore: openTrade.detail.score,
        entryGrade: openTrade.detail.grade,
        entryConfirmations: openTrade.detail.confirmations,
        entrySRank: openTrade.detail.sRank,
        entryARank: openTrade.detail.aRank,
        entryBlocks: openTrade.detail.blocks,
      });
      openTrade = null;
    }
  });

  return summarize(logic, trades, settings, candles, includeValidation);
}

function resolveExit(
  direction: 'Long' | 'Short',
  entryPrice: number,
  plan: TradePlan,
  candle: Candle,
  signal: Signal,
  currentIndex: number,
  entryIndex: number,
  candleCount: number,
): { price: number; reason: Trade['exitReason'] } | null {
  if (direction === 'Long') {
    if (plan.stopLossPrice < entryPrice && candle.low <= plan.stopLossPrice) return { price: plan.stopLossPrice, reason: 'SL' };
    if (plan.takeProfitPrice > entryPrice && candle.high >= plan.takeProfitPrice) return { price: plan.takeProfitPrice, reason: 'TP' };
  } else {
    if (plan.stopLossPrice > entryPrice && candle.high >= plan.stopLossPrice) return { price: plan.stopLossPrice, reason: 'SL' };
    if (plan.takeProfitPrice < entryPrice && candle.low <= plan.takeProfitPrice) return { price: plan.takeProfitPrice, reason: 'TP' };
  }

  const opposite = (direction === 'Long' && signal === 'sell') || (direction === 'Short' && signal === 'buy');
  if (opposite) return { price: candle.close, reason: 'Signal' };
  if (currentIndex - entryIndex >= 18) return { price: candle.close, reason: 'Time' };
  if (currentIndex === candleCount - 1) return { price: candle.close, reason: 'End' };
  return null;
}

function buildTradePlan(
  candles: Candle[],
  entryIndex: number,
  direction: 'Long' | 'Short',
  logic: LogicDefinition,
  settings: BacktestSettings,
): TradePlan {
  const entryPrice = candles[entryIndex]?.close ?? 0;
  if (logic.strategy !== 'zeroLogic') return fixedTradePlan(entryPrice, direction, logic, settings);

  const pipSize = pipSizeFor(settings);
  const currentAtr = atr(candles.slice(0, entryIndex + 1), Math.max(2, logic.params.atrPeriod))[entryIndex] ?? 0;
  const atrDistance = Math.max(currentAtr * Math.max(0.2, logic.params.zeroAtrStopMultiplier), pipSize);
  const fixedStopDistance = Math.max(logic.stopLoss, 0) * pipSize;
  const fixedTargetDistance = Math.max(logic.takeProfit, 0) * pipSize;
  const riskReward = Math.max(1, logic.params.zeroMinRiskReward);
  const lookback = Math.max(5, logic.params.breakoutPeriod);
  const recent = candles.slice(Math.max(0, entryIndex - lookback), entryIndex + 1);
  const recentLow = Math.min(...recent.map((candle) => candle.low));
  const recentHigh = Math.max(...recent.map((candle) => candle.high));
  const horizontal = candles.slice(Math.max(0, entryIndex - Math.max(lookback * 2, logic.params.fibonacciLookback)), entryIndex);

  if (direction === 'Long') {
    const swingStop = Number.isFinite(recentLow) ? recentLow - pipSize : entryPrice - atrDistance;
    const stopPrice = Math.min(entryPrice - Math.max(atrDistance, fixedStopDistance), swingStop);
    const stopDistance = Math.max(entryPrice - stopPrice, pipSize);
    const nextResistance = horizontal
      .map((candle) => candle.high)
      .filter((price) => price > entryPrice + stopDistance * riskReward)
      .sort((a, b) => a - b)[0];
    const baseTargetDistance = Math.max(
      stopDistance * riskReward,
      currentAtr * Math.max(1, logic.params.zeroAtrTargetMultiplier),
      fixedTargetDistance,
    );
    const targetDistance = nextResistance ? Math.min(baseTargetDistance, nextResistance - entryPrice) : baseTargetDistance;

    return pricePlan(entryPrice, entryPrice + targetDistance, stopPrice, pipSize);
  }

  const swingStop = Number.isFinite(recentHigh) ? recentHigh + pipSize : entryPrice + atrDistance;
  const stopPrice = Math.max(entryPrice + Math.max(atrDistance, fixedStopDistance), swingStop);
  const stopDistance = Math.max(stopPrice - entryPrice, pipSize);
  const nextSupport = horizontal
    .map((candle) => candle.low)
    .filter((price) => price < entryPrice - stopDistance * riskReward)
    .sort((a, b) => b - a)[0];
  const baseTargetDistance = Math.max(
    stopDistance * riskReward,
    currentAtr * Math.max(1, logic.params.zeroAtrTargetMultiplier),
    fixedTargetDistance,
  );
  const targetDistance = nextSupport ? Math.min(baseTargetDistance, entryPrice - nextSupport) : baseTargetDistance;

  return pricePlan(entryPrice, entryPrice - targetDistance, stopPrice, pipSize);
}

function fixedTradePlan(
  entryPrice: number,
  direction: 'Long' | 'Short',
  logic: LogicDefinition,
  settings: BacktestSettings,
): TradePlan {
  const pipSize = pipSizeFor(settings);
  const targetDistance = Math.max(logic.takeProfit, 0) * pipSize;
  const stopDistance = Math.max(logic.stopLoss, 0) * pipSize;
  const takeProfitPrice = direction === 'Long' ? entryPrice + targetDistance : entryPrice - targetDistance;
  const stopLossPrice = direction === 'Long' ? entryPrice - stopDistance : entryPrice + stopDistance;
  return pricePlan(entryPrice, takeProfitPrice, stopLossPrice, pipSize);
}

function pricePlan(entryPrice: number, takeProfitPrice: number, stopLossPrice: number, pipSize: number): TradePlan {
  const roundPips = (value: number) => Math.round(Math.abs(value / pipSize) * 10) / 10;
  return {
    takeProfitPrice,
    stopLossPrice,
    takeProfitPips: roundPips(takeProfitPrice - entryPrice),
    stopLossPips: roundPips(stopLossPrice - entryPrice),
  };
}

function calculateTradeProfit(
  direction: 'Long' | 'Short',
  entryPrice: number,
  exitPrice: number,
  settings: BacktestSettings,
): { pips: number; grossProfit: number; cost: number; profit: number } {
  const pipSize = pipSizeFor(settings);
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
  const pipSize = pipSizeFor(settings);
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

function pipSizeFor(settings: BacktestSettings): number {
  return settings.pair.toUpperCase().includes('JPY') ? 0.01 : 0.0001;
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

  const analytics: BacktestAnalytics = {
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
    zeroConditionStats: groupZeroConditionStats(trades),
    zeroOptimizationStats: [],
    equityCurve: buildEquityCurve(trades, settings.initialCapital),
    drawdownCurve: trades.map((trade) => ({ label: trade.exitTime, value: trade.drawdown })),
  };

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
    analytics,
  };

  if (includeValidation && logic.strategy === 'zeroLogic') {
    baseResult.analytics.zeroOptimizationStats = analyzeZeroConditionOptimization(candles, logic, settings, baseResult);
  }

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

function groupZeroConditionStats(trades: Trade[]): ZeroConditionStat[] {
  const buckets = new Map<string, { label: string; rank: 'S' | 'A'; trades: Trade[] }>();

  trades.forEach((trade) => {
    (trade.entrySRank ?? []).forEach((label) => {
      const key = `S:${label}`;
      const current = buckets.get(key) ?? { label, rank: 'S' as const, trades: [] };
      current.trades.push(trade);
      buckets.set(key, current);
    });

    (trade.entryARank ?? []).forEach((label) => {
      const key = `A:${label}`;
      const current = buckets.get(key) ?? { label, rank: 'A' as const, trades: [] };
      current.trades.push(trade);
      buckets.set(key, current);
    });
  });

  return [...buckets.values()]
    .map(({ label, rank, trades: items }) => {
      const wins = items.filter((trade) => trade.profit > 0);
      const losses = items.filter((trade) => trade.profit < 0);
      const grossProfit = wins.reduce((sum, trade) => sum + trade.profit, 0);
      const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.profit, 0));
      const netProfit = items.reduce((sum, trade) => sum + trade.profit, 0);

      return {
        label,
        rank,
        trades: items.length,
        wins: wins.length,
        losses: losses.length,
        winRate: items.length ? (wins.length / items.length) * 100 : 0,
        netProfit,
        profitFactor: grossLoss === 0 ? (grossProfit > 0 ? 99 : 0) : grossProfit / grossLoss,
        expectancy: items.length ? netProfit / items.length : 0,
        averageScore: items.length ? items.reduce((sum, trade) => sum + (trade.entryScore ?? 0), 0) / items.length : 0,
        averagePips: items.length ? items.reduce((sum, trade) => sum + trade.pips, 0) / items.length : 0,
      };
    })
    .sort((a, b) => (a.rank === b.rank ? b.netProfit - a.netProfit : a.rank === 'S' ? -1 : 1));
}

function analyzeZeroConditionOptimization(
  candles: Candle[],
  logic: LogicDefinition,
  settings: BacktestSettings,
  baseline: Omit<BacktestResult, 'validation'>,
): ZeroOptimizationStat[] {
  if (logic.strategy !== 'zeroLogic' || candles.length < 260 || baseline.tradeCount === 0) return [];
  const alreadyDisabled = new Set(logic.params.zeroDisabledConditions ?? []);

  return zeroOptimizationConditions().filter((condition) => !alreadyDisabled.has(condition.key)).map((condition) => {
    const variant = runLogic(candles, {
      ...logic,
      id: `${logic.id}-without-${condition.key}`,
      name: `${logic.name} without ${condition.label}`,
    }, settings, false, condition.key);
    const deltaNetProfit = variant.netProfit - baseline.netProfit;
    const deltaScore = variant.score - baseline.score;
    const tradeRatio = variant.tradeCount / Math.max(baseline.tradeCount, 1);
    const pfImproved = variant.profitFactor >= baseline.profitFactor;
    const profitImproved = deltaNetProfit > Math.max(Math.abs(baseline.netProfit) * 0.08, 1);
    const scoreImproved = deltaScore >= 4;
    const harmfulWhenRemoved = deltaNetProfit < -Math.max(Math.abs(baseline.netProfit) * 0.08, 1) || deltaScore <= -4;
    const recommendation: ZeroOptimizationStat['recommendation'] =
      profitImproved && pfImproved && tradeRatio >= 0.45
        ? 'Disable Candidate'
        : harmfulWhenRemoved || (condition.rank === 'S' && !scoreImproved)
          ? 'Keep'
          : 'Review';

    return {
      conditionKey: condition.key,
      condition: condition.label,
      rank: condition.rank,
      baselineTrades: baseline.tradeCount,
      testTrades: variant.tradeCount,
      baselineWinRate: baseline.winRate,
      testWinRate: variant.winRate,
      baselineProfitFactor: baseline.profitFactor,
      testProfitFactor: variant.profitFactor,
      baselineNetProfit: baseline.netProfit,
      testNetProfit: variant.netProfit,
      deltaNetProfit,
      baselineScore: baseline.score,
      testScore: variant.score,
      deltaScore,
      recommendation,
    };
  }).sort((a, b) => {
    const rankOrder = a.rank === b.rank ? 0 : a.rank === 'S' ? -1 : 1;
    return rankOrder || b.deltaNetProfit - a.deltaNetProfit;
  });
}

function buildEquityCurve(trades: Trade[], initialCapital: number): CurvePoint[] {
  return [{ label: 'Start', value: initialCapital }, ...trades.map((trade) => ({ label: trade.exitTime, value: trade.equity }))];
}

function createSignals(candles: Candle[], logic: LogicDefinition, settings: BacktestSettings = defaultSettings, disabledZeroCondition?: ZeroConditionKey): Signal[] {
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
    case 'zeroLogic':
      return zeroLogicSignalDetails(candles, logic.params, settings, disabledZeroCondition).map((detail) => detail.signal);
  }
}

function createSignalDetails(candles: Candle[], logic: LogicDefinition, settings: BacktestSettings = defaultSettings, disabledZeroCondition?: ZeroConditionKey): SignalDetail[] {
  if (logic.strategy === 'zeroLogic') return zeroLogicSignalDetails(candles, logic.params, settings, disabledZeroCondition);
  return createSignals(candles, logic, settings, disabledZeroCondition).map((signal) => ({
    signal,
    score: signal === 'flat' ? 0 : 50,
    grade: signal === 'flat' ? '-' : 'Basic',
    confirmations: signal === 'flat' ? 0 : 1,
    sRank: [],
    aRank: [],
    blocks: [],
  }));
}

function zeroLogicSignalDetails(candles: Candle[], params: LogicParams, settings: BacktestSettings, disabledZeroCondition?: ZeroConditionKey): SignalDetail[] {
  const disabledConditions = uniqueZeroConditions([...(params.zeroDisabledConditions ?? []), ...(disabledZeroCondition ? [disabledZeroCondition] : [])]);
  const closes = candles.map((candle) => candle.close);
  const emaFast = ema(closes, Math.max(2, params.maFast));
  const emaSlow = ema(closes, Math.max(3, params.maSlow));
  const trendMa = sma(closes, 200);
  const rsiValues = rsi(closes, Math.max(2, params.rsiPeriod));
  const macdSet = macdSeries(closes, params.macdFast, params.macdSlow, params.macdSignal);
  const bb = bollingerSeries(closes, Math.max(3, params.bollingerPeriod));
  const atrValues = atr(candles, Math.max(2, params.atrPeriod));
  const atrAverage = sma(atrValues, Math.max(5, params.atrPeriod));
  const dmiValues = dmi(candles, Math.max(2, params.adxPeriod));
  const vwapValues = rollingVwap(candles, Math.max(5, params.vwapPeriod));
  const averageVolume = sma(candles.map((candle) => candle.volume), Math.max(5, params.volumePeriod));
  const higherTimeframeBias = multiTimeframeBias(candles, settings.timeframe);
  const newsWindows = buildNewsGuardWindows(settings);
  const minConfirmations = Math.max(1, Math.min(13, Math.round(params.zeroMinConfirmations)));
  const weightedThreshold = zeroAdjustedThreshold(Math.max(40, Math.min(100, params.zeroWeightedThreshold)), disabledConditions);
  const breakoutPeriod = Math.max(5, params.breakoutPeriod);

  return candles.map((candle, index) => {
    if (index < Math.max(200, breakoutPeriod * 2, params.adxPeriod * 2, params.atrPeriod * 2, params.fibonacciLookback)) {
      return emptySignalDetail('Waiting for ZERO lookback');
    }
    if (isNewsGuarded(candle.time, newsWindows)) return emptySignalDetail('News Guard');

    const previousRsi = rsiValues[index - 1] ?? 0;
    const currentRsi = rsiValues[index] ?? 0;
    const overExtended = currentRsi >= 70 || currentRsi <= 30;
    if (overExtended) return emptySignalDetail('RSI overextended');

    const previousWindow = candles.slice(index - breakoutPeriod * 2, index - breakoutPeriod);
    const currentWindow = candles.slice(index - breakoutPeriod, index);
    const breakoutWindow = candles.slice(index - breakoutPeriod, index);
    const previousHigh = Math.max(...previousWindow.map((item) => item.high));
    const previousLow = Math.min(...previousWindow.map((item) => item.low));
    const currentHigh = Math.max(...currentWindow.map((item) => item.high));
    const currentLow = Math.min(...currentWindow.map((item) => item.low));
    const breakoutHigh = Math.max(...breakoutWindow.map((item) => item.high));
    const breakoutLow = Math.min(...breakoutWindow.map((item) => item.low));
    const macdLine = macdSet.macd[index] ?? 0;
    const macdSignal = macdSet.signal[index] ?? 0;
    const previousMacdLine = macdSet.macd[index - 1] ?? 0;
    const previousMacdSignal = macdSet.signal[index - 1] ?? 0;
    const currentAtr = atrValues[index] ?? 0;
    const averageAtr = atrAverage[index] ?? 0;
    const currentAverageVolume = averageVolume[index] ?? 0;
    const currentDmi = dmiValues[index];
    const candlePattern = candlePatternSignal(candles, index);
    const bbSignal = bollingerBreakoutSignal(candle.close, bb, index);
    const fibSignal = fibonacciPullbackSignal(candles, index, Math.max(20, params.fibonacciLookback));
    const higherBias = higherTimeframeBias[index] ?? 'flat';
    const previousVwap = vwapValues[index - 1] ?? 0;
    const currentVwap = vwapValues[index] ?? 0;

    const atrOk = currentAtr > 0 && averageAtr > 0 && currentAtr >= averageAtr * 0.75;
    const adxOk = currentDmi.adx >= 25;
    const volumeOk = currentAverageVolume > 0 && candle.volume >= currentAverageVolume * Math.max(0.1, params.volumeMultiplier);
    const horizontal = horizontalReactionSignal(candles, index, Math.max(breakoutPeriod * 3, 60), Math.max(currentAtr * 0.28, candle.close * 0.0008));
    const vwapBuy = currentVwap > 0 && candle.close > currentVwap && currentVwap >= previousVwap;
    const vwapSell = currentVwap > 0 && candle.close < currentVwap && currentVwap <= previousVwap;
    const mtfBuy = higherBias === 'buy';
    const mtfSell = higherBias === 'sell';
    const dowBuy = currentHigh > previousHigh && currentLow > previousLow;
    const dowSell = currentHigh < previousHigh && currentLow < previousLow;
    const mtfBuyPass = zeroConditionPass('mtf', mtfBuy, disabledConditions);
    const mtfSellPass = zeroConditionPass('mtf', mtfSell, disabledConditions);
    const dowBuyPass = zeroConditionPass('dow', dowBuy, disabledConditions);
    const dowSellPass = zeroConditionPass('dow', dowSell, disabledConditions);
    const horizontalBuyPass = zeroConditionPass('horizontal', horizontal.buy, disabledConditions);
    const horizontalSellPass = zeroConditionPass('horizontal', horizontal.sell, disabledConditions);
    const volumePass = zeroConditionPass('volume', volumeOk, disabledConditions);
    const atrPass = zeroConditionPass('atr', atrOk, disabledConditions);
    const macdBuy = macdLine > macdSignal || (previousMacdLine <= previousMacdSignal && macdLine > macdSignal);
    const macdSell = macdLine < macdSignal || (previousMacdLine >= previousMacdSignal && macdLine < macdSignal);
    const rsiBuy = currentRsi >= 40 && currentRsi <= 60 && currentRsi > previousRsi;
    const rsiSell = currentRsi >= 40 && currentRsi <= 60 && currentRsi < previousRsi;
    const rrOk = params.zeroMinRiskReward >= 2;
    const emaBuy = emaFast[index] > emaSlow[index];
    const emaSell = emaFast[index] < emaSlow[index];
    const adxBuy = adxOk && currentDmi.plusDi > currentDmi.minusDi;
    const adxSell = adxOk && currentDmi.minusDi > currentDmi.plusDi;
    const candleBuy = candlePattern === 'buy';
    const candleSell = candlePattern === 'sell';
    const rsiBuyPass = zeroConditionPass('rsi', rsiBuy, disabledConditions);
    const rsiSellPass = zeroConditionPass('rsi', rsiSell, disabledConditions);
    const emaBuyPass = zeroConditionPass('ema', emaBuy, disabledConditions);
    const emaSellPass = zeroConditionPass('ema', emaSell, disabledConditions);
    const adxBuyPass = zeroConditionPass('adx', adxBuy, disabledConditions);
    const adxSellPass = zeroConditionPass('adx', adxSell, disabledConditions);
    const candleBuyPass = zeroConditionPass('candle', candleBuy, disabledConditions);
    const candleSellPass = zeroConditionPass('candle', candleSell, disabledConditions);
    const rrPass = zeroConditionPass('riskReward', rrOk, disabledConditions);
    const upperTrendBuy = candle.close > trendMa[index] && mtfBuyPass;
    const upperTrendSell = candle.close < trendMa[index] && mtfSellPass;

    const buyChecks = [
      upperTrendBuy,
      emaBuyPass,
      dowBuyPass,
      rsiBuyPass,
      macdBuy,
      adxBuyPass,
      candle.close > breakoutHigh && horizontalBuyPass && volumePass,
      candleBuyPass,
      bbSignal === 'buy',
      atrPass,
      vwapBuy,
      fibSignal === 'buy',
      mtfBuyPass,
    ];

    const sellChecks = [
      upperTrendSell,
      emaSellPass,
      dowSellPass,
      rsiSellPass,
      macdSell,
      adxSellPass,
      candle.close < breakoutLow && horizontalSellPass && volumePass,
      candleSellPass,
      bbSignal === 'sell',
      atrPass,
      vwapSell,
      fibSignal === 'sell',
      mtfSellPass,
    ];

    const buyScore = buyChecks.filter(Boolean).length;
    const sellScore = sellChecks.filter(Boolean).length;
    const buyWeightedScore = zeroWeightedScore({
      mtf: mtfBuy,
      dow: dowBuy,
      horizontal: horizontal.buy,
      volume: volumeOk,
      atr: atrOk,
      ema: emaBuy,
      adx: adxBuy,
      rsi: rsiBuy,
      candle: candleBuy,
      riskReward: rrOk,
    }, disabledConditions);
    const sellWeightedScore = zeroWeightedScore({
      mtf: mtfSell,
      dow: dowSell,
      horizontal: horizontal.sell,
      volume: volumeOk,
      atr: atrOk,
      ema: emaSell,
      adx: adxSell,
      rsi: rsiSell,
      candle: candleSell,
      riskReward: rrOk,
    }, disabledConditions);
    const baseBuyOk = mtfBuyPass && dowBuyPass && horizontalBuyPass && volumePass && atrPass && adxBuyPass && emaBuyPass && rrPass;
    const baseSellOk = mtfSellPass && dowSellPass && horizontalSellPass && volumePass && atrPass && adxSellPass && emaSellPass && rrPass;

    const buySRank = conditionNames([
      ['MTF aligned', mtfBuy],
      ['Dow structure', dowBuy],
      ['Horizontal break', horizontal.buy],
      ['Volume confirmed', volumeOk],
      ['ATR active', atrOk],
    ]);
    const sellSRank = conditionNames([
      ['MTF aligned', mtfSell],
      ['Dow structure', dowSell],
      ['Horizontal break', horizontal.sell],
      ['Volume confirmed', volumeOk],
      ['ATR active', atrOk],
    ]);
    const buyARank = conditionNames([
      ['EMA20/75', emaFast[index] > emaSlow[index]],
      ['ADX/DMI', adxOk && currentDmi.plusDi > currentDmi.minusDi],
      ['RSI 40-60', rsiBuy],
      ['Candle pattern', candlePattern === 'buy'],
      ['Risk reward', rrOk],
      ['VWAP', vwapBuy],
      ['Fibonacci', fibSignal === 'buy'],
      ['MACD', macdBuy],
      ['BB squeeze break', bbSignal === 'buy'],
    ]);
    const sellARank = conditionNames([
      ['EMA20/75', emaFast[index] < emaSlow[index]],
      ['ADX/DMI', adxOk && currentDmi.minusDi > currentDmi.plusDi],
      ['RSI 40-60', rsiSell],
      ['Candle pattern', candlePattern === 'sell'],
      ['Risk reward', rrOk],
      ['VWAP', vwapSell],
      ['Fibonacci', fibSignal === 'sell'],
      ['MACD', macdSell],
      ['BB squeeze break', bbSignal === 'sell'],
    ]);

    if (baseBuyOk && buyScore >= minConfirmations && buyWeightedScore >= weightedThreshold && buyWeightedScore >= sellWeightedScore + 12) {
      return zeroSignalDetail('buy', buyWeightedScore, buyScore, buySRank, buyARank);
    }
    if (baseSellOk && sellScore >= minConfirmations && sellWeightedScore >= weightedThreshold && sellWeightedScore >= buyWeightedScore + 12) {
      return zeroSignalDetail('sell', sellWeightedScore, sellScore, sellSRank, sellARank);
    }

    const buyBlocks = zeroBlocks({
      mtf: mtfBuy,
      dow: dowBuy,
      horizontal: horizontal.buy,
      volume: volumeOk,
      atr: atrOk,
      adx: adxOk,
      ema: emaFast[index] > emaSlow[index],
      score: buyWeightedScore,
      threshold: weightedThreshold,
    }, disabledConditions);
    const sellBlocks = zeroBlocks({
      mtf: mtfSell,
      dow: dowSell,
      horizontal: horizontal.sell,
      volume: volumeOk,
      atr: atrOk,
      adx: adxOk,
      ema: emaFast[index] < emaSlow[index],
      score: sellWeightedScore,
      threshold: weightedThreshold,
    }, disabledConditions);
    const bestBuy = buyWeightedScore >= sellWeightedScore;
    return {
      signal: 'flat',
      score: Math.max(buyWeightedScore, sellWeightedScore),
      grade: '-',
      confirmations: Math.max(buyScore, sellScore),
      sRank: bestBuy ? buySRank : sellSRank,
      aRank: bestBuy ? buyARank : sellARank,
      blocks: bestBuy ? buyBlocks : sellBlocks,
    };
  });
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
  const { macd, signal } = macdSeries(closes, fastPeriod, slowPeriod, signalPeriod);

  return closes.map((_, index) => {
    if (index === 0) return 'flat';
    if (macd[index - 1] <= signal[index - 1] && macd[index] > signal[index]) return 'buy';
    if (macd[index - 1] >= signal[index - 1] && macd[index] < signal[index]) return 'sell';
    return 'flat';
  });
}

function macdSeries(closes: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number): { macd: number[]; signal: number[] } {
  const fast = ema(closes, Math.max(2, fastPeriod));
  const slow = ema(closes, Math.max(3, slowPeriod));
  const macd = fast.map((value, index) => value - slow[index]);
  const signal = ema(macd, Math.max(2, signalPeriod));
  return { macd, signal };
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

function bollingerSeries(closes: number[], period: number): { mid: number[]; upper: number[]; lower: number[]; width: number[] } {
  const mid = sma(closes, period);
  const dev = rollingStd(closes, period);
  return {
    mid,
    upper: mid.map((value, index) => value + dev[index] * 2),
    lower: mid.map((value, index) => value - dev[index] * 2),
    width: mid.map((value, index) => (value === 0 ? 0 : (dev[index] * 4) / value)),
  };
}

function bollingerBreakoutSignal(close: number, bb: { upper: number[]; lower: number[]; width: number[] }, index: number): Signal {
  const widthWindow = bb.width.slice(Math.max(0, index - 40), index).filter((value) => value > 0);
  if (widthWindow.length < 10 || !bb.upper[index] || !bb.lower[index]) return 'flat';
  const averageWidth = widthWindow.reduce((sum, value) => sum + value, 0) / widthWindow.length;
  const squeezed = bb.width[index - 1] > 0 && bb.width[index - 1] <= averageWidth * 0.85;
  if (squeezed && close > bb.upper[index]) return 'buy';
  if (squeezed && close < bb.lower[index]) return 'sell';
  return 'flat';
}

function atr(candles: Candle[], period: number): number[] {
  const trueRanges = candles.map((candle, index) => {
    if (index === 0) return candle.high - candle.low;
    const previousClose = candles[index - 1].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose),
    );
  });
  return sma(trueRanges, period);
}

function dmi(candles: Candle[], period: number): Array<{ plusDi: number; minusDi: number; adx: number }> {
  const plusDm = Array(candles.length).fill(0);
  const minusDm = Array(candles.length).fill(0);
  const trueRanges = Array(candles.length).fill(0);

  for (let index = 1; index < candles.length; index += 1) {
    const upMove = candles[index].high - candles[index - 1].high;
    const downMove = candles[index - 1].low - candles[index].low;
    plusDm[index] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDm[index] = downMove > upMove && downMove > 0 ? downMove : 0;
    trueRanges[index] = Math.max(
      candles[index].high - candles[index].low,
      Math.abs(candles[index].high - candles[index - 1].close),
      Math.abs(candles[index].low - candles[index - 1].close),
    );
  }

  const tr = sma(trueRanges, period);
  const plus = sma(plusDm, period);
  const minus = sma(minusDm, period);
  const dx = candles.map((_, index) => {
    if (!tr[index]) return 0;
    const plusDi = (plus[index] / tr[index]) * 100;
    const minusDi = (minus[index] / tr[index]) * 100;
    const total = plusDi + minusDi;
    return total === 0 ? 0 : (Math.abs(plusDi - minusDi) / total) * 100;
  });
  const adx = sma(dx, period);

  return candles.map((_, index) => {
    if (!tr[index]) return { plusDi: 0, minusDi: 0, adx: 0 };
    return {
      plusDi: (plus[index] / tr[index]) * 100,
      minusDi: (minus[index] / tr[index]) * 100,
      adx: adx[index] ?? 0,
    };
  });
}

function candlePatternSignal(candles: Candle[], index: number): Signal {
  if (index < 1) return 'flat';
  const current = candles[index];
  const previous = candles[index - 1];
  const currentBody = Math.abs(current.close - current.open);
  const previousBody = Math.abs(previous.close - previous.open);
  const currentRange = Math.max(current.high - current.low, 0.000001);
  const upperWick = current.high - Math.max(current.open, current.close);
  const lowerWick = Math.min(current.open, current.close) - current.low;
  const bullish = current.close > current.open;
  const bearish = current.close < current.open;
  const previousBullish = previous.close > previous.open;
  const previousBearish = previous.close < previous.open;

  const bullishEngulfing = bullish && previousBearish && current.open <= previous.close && current.close >= previous.open && currentBody > previousBody;
  const bearishEngulfing = bearish && previousBullish && current.open >= previous.close && current.close <= previous.open && currentBody > previousBody;
  const bullishPin = bullish && lowerWick >= currentBody * 2 && upperWick <= currentRange * 0.28;
  const bearishPin = bearish && upperWick >= currentBody * 2 && lowerWick <= currentRange * 0.28;
  const insideBar = current.high < previous.high && current.low > previous.low;

  if (bullishEngulfing || bullishPin || (insideBar && current.close > previous.close)) return 'buy';
  if (bearishEngulfing || bearishPin || (insideBar && current.close < previous.close)) return 'sell';
  return 'flat';
}

function horizontalReactionSignal(
  candles: Candle[],
  index: number,
  lookback: number,
  tolerance: number,
): { buy: boolean; sell: boolean; resistance: number; support: number; resistanceTouches: number; supportTouches: number } {
  if (index < 2) return { buy: false, sell: false, resistance: 0, support: 0, resistanceTouches: 0, supportTouches: 0 };
  const window = candles.slice(Math.max(0, index - lookback), index);
  if (window.length < Math.min(20, lookback)) return { buy: false, sell: false, resistance: 0, support: 0, resistanceTouches: 0, supportTouches: 0 };

  const resistance = Math.max(...window.map((candle) => candle.high));
  const support = Math.min(...window.map((candle) => candle.low));
  const resistanceTouches = window.filter((candle) => Math.abs(candle.high - resistance) <= tolerance || Math.abs(candle.close - resistance) <= tolerance).length;
  const supportTouches = window.filter((candle) => Math.abs(candle.low - support) <= tolerance || Math.abs(candle.close - support) <= tolerance).length;
  const close = candles[index].close;

  return {
    buy: resistanceTouches >= 2 && close > resistance,
    sell: supportTouches >= 2 && close < support,
    resistance,
    support,
    resistanceTouches,
    supportTouches,
  };
}

function zeroWeightedScore(items: {
  mtf: boolean;
  dow: boolean;
  horizontal: boolean;
  volume: boolean;
  atr: boolean;
  ema: boolean;
  adx: boolean;
  rsi: boolean;
  candle: boolean;
  riskReward: boolean;
}, disabledConditions: ZeroConditionKey[] = []): number {
  const weights = zeroConditionWeights();

  return Object.entries(weights).reduce((score, [key, weight]) => {
    if (disabledConditions.includes(key as ZeroConditionKey)) return score;
    return score + (items[key as keyof typeof items] ? weight : 0);
  }, 0);
}

function zeroOptimizationConditions(): Array<{ key: ZeroConditionKey; label: string; rank: 'S' | 'A' }> {
  return [
    { key: 'mtf', label: 'MTF aligned', rank: 'S' },
    { key: 'dow', label: 'Dow structure', rank: 'S' },
    { key: 'horizontal', label: 'Horizontal break', rank: 'S' },
    { key: 'volume', label: 'Volume confirmed', rank: 'S' },
    { key: 'atr', label: 'ATR active', rank: 'S' },
    { key: 'ema', label: 'EMA20/75', rank: 'A' },
    { key: 'adx', label: 'ADX/DMI', rank: 'A' },
    { key: 'rsi', label: 'RSI 40-60', rank: 'A' },
    { key: 'candle', label: 'Candle pattern', rank: 'A' },
    { key: 'riskReward', label: 'Risk reward', rank: 'A' },
  ];
}

function zeroConditionWeights(): Record<ZeroConditionKey, number> {
  return {
    mtf: 20,
    dow: 16,
    horizontal: 14,
    volume: 10,
    atr: 10,
    ema: 8,
    adx: 7,
    rsi: 6,
    candle: 5,
    riskReward: 4,
  };
}

function zeroConditionPass(key: ZeroConditionKey, value: boolean, disabledConditions: ZeroConditionKey[] = []): boolean {
  return disabledConditions.includes(key) || value;
}

function zeroAdjustedThreshold(threshold: number, disabledConditions: ZeroConditionKey[] = []): number {
  if (disabledConditions.length === 0) return threshold;
  const removedWeight = disabledConditions.reduce((sum, key) => sum + zeroConditionWeights()[key], 0);
  return Math.max(35, threshold - removedWeight * 0.75);
}

function zeroSignalDetail(signal: Signal, score: number, confirmations: number, sRank: string[], aRank: string[]): SignalDetail {
  return {
    signal,
    score,
    grade: zeroGrade(score, sRank.length),
    confirmations,
    sRank,
    aRank,
    blocks: [],
  };
}

function emptySignalDetail(block?: string): SignalDetail {
  return {
    signal: 'flat',
    score: 0,
    grade: '-',
    confirmations: 0,
    sRank: [],
    aRank: [],
    blocks: block ? [block] : [],
  };
}

function zeroGrade(score: number, sRankCount: number): string {
  if (score >= 90 && sRankCount >= 5) return 'S';
  if (score >= 76 && sRankCount >= 4) return 'A';
  if (score >= 60) return 'B';
  return 'C';
}

function conditionNames(items: Array<[string, boolean]>): string[] {
  return items.filter(([, matched]) => matched).map(([name]) => name);
}

function zeroBlocks(items: {
  mtf: boolean;
  dow: boolean;
  horizontal: boolean;
  volume: boolean;
  atr: boolean;
  adx: boolean;
  ema: boolean;
  score: number;
  threshold: number;
}, disabledConditions: ZeroConditionKey[] = []): string[] {
  const blocks = conditionNames([
    ['MTF not aligned', !items.mtf && !disabledConditions.includes('mtf')],
    ['Dow structure missing', !items.dow && !disabledConditions.includes('dow')],
    ['Horizontal break missing', !items.horizontal && !disabledConditions.includes('horizontal')],
    ['Volume too low', !items.volume && !disabledConditions.includes('volume')],
    ['ATR too low', !items.atr && !disabledConditions.includes('atr')],
    ['ADX below 25', !items.adx && !disabledConditions.includes('adx')],
    ['EMA20/75 mismatch', !items.ema && !disabledConditions.includes('ema')],
    ['ZERO score below threshold', items.score < items.threshold],
  ]);
  return blocks.length > 0 ? blocks : ['Direction edge not enough'];
}

function rollingVwap(candles: Candle[], period: number): number[] {
  return candles.map((_, index) => {
    const window = candles.slice(Math.max(0, index - period + 1), index + 1);
    let weightedPrice = 0;
    let totalVolume = 0;

    window.forEach((candle) => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      const volume = Math.max(candle.volume, 0);
      weightedPrice += typicalPrice * volume;
      totalVolume += volume;
    });

    if (totalVolume > 0) return weightedPrice / totalVolume;
    return window.reduce((sum, candle) => sum + (candle.high + candle.low + candle.close) / 3, 0) / Math.max(window.length, 1);
  });
}

function fibonacciPullbackSignal(candles: Candle[], index: number, lookback: number): Signal {
  if (index < lookback) return 'flat';
  const window = candles.slice(index - lookback, index);
  const high = Math.max(...window.map((candle) => candle.high));
  const low = Math.min(...window.map((candle) => candle.low));
  const range = high - low;
  if (!Number.isFinite(range) || range <= 0) return 'flat';

  const close = candles[index].close;
  const previousClose = candles[index - 1]?.close ?? close;
  const retrace382FromHigh = high - range * 0.382;
  const retrace618FromHigh = high - range * 0.618;
  const retrace382FromLow = low + range * 0.382;
  const retrace618FromLow = low + range * 0.618;
  const inBuyZone = close >= retrace618FromHigh && close <= retrace382FromHigh;
  const inSellZone = close >= retrace382FromLow && close <= retrace618FromLow;

  if (inBuyZone && close > previousClose) return 'buy';
  if (inSellZone && close < previousClose) return 'sell';
  return 'flat';
}

function multiTimeframeBias(candles: Candle[], sourceTimeframe: Timeframe): Signal[] {
  const sourceMinutes = timeframeMinutes(sourceTimeframe);
  if (!sourceMinutes) return candles.map(() => 'flat');

  const strictTargets = [15, 60, 240];
  const targets = strictTargets.filter((target) => target >= sourceMinutes);
  if (targets.length === 0) return candles.map(() => 'flat');

  const targetBiases = targets.map((target) => aggregatedTimeframeBias(candles, sourceMinutes, target));
  return candles.map((_, index) => {
    const votes = targetBiases.map((biases) => biases[index]);
    if (votes.length !== targets.length || votes.some((bias) => bias === 'flat')) return 'flat';
    if (votes.every((bias) => bias === 'buy')) return 'buy';
    if (votes.every((bias) => bias === 'sell')) return 'sell';
    return 'flat';
  });
}

function aggregatedTimeframeBias(candles: Candle[], sourceMinutes: number, targetMinutes: number): Signal[] {
  const groupSize = Math.max(1, Math.round(targetMinutes / sourceMinutes));
  const aggregatedCloses: number[] = [];
  candles.forEach((candle, index) => {
    if ((index + 1) % groupSize === 0 || index === candles.length - 1) aggregatedCloses.push(candle.close);
  });

  const fast = ema(aggregatedCloses, 20);
  const slow = ema(aggregatedCloses, 75);
  const longMa = sma(aggregatedCloses, 200);
  const aggregatedBias = aggregatedCloses.map((close, index) => {
    const trendBase = longMa[index] || slow[index] || close;
    if (close > trendBase && fast[index] > slow[index]) return 'buy';
    if (close < trendBase && fast[index] < slow[index]) return 'sell';
    return 'flat';
  });

  return candles.map((_, index) => aggregatedBias[Math.min(Math.floor(index / groupSize), aggregatedBias.length - 1)] ?? 'flat');
}

function timeframeMinutes(timeframe: Timeframe): number {
  const table: Record<Timeframe, number> = {
    M1: 1,
    M5: 5,
    M15: 15,
    M30: 30,
    H1: 60,
    H4: 240,
    D1: 1440,
    W1: 10080,
    MN: 43200,
  };
  return table[timeframe];
}

function buildNewsGuardWindows(settings: BacktestSettings): Array<{ start: number; end: number }> {
  if (!settings.newsGuardEnabled || !settings.newsEvents.trim()) return [];
  const guardMs = Math.max(0, settings.newsGuardMinutes) * 60 * 1000;
  return settings.newsEvents
    .split(/\r?\n/)
    .map((line) => parseNewsEventTime(line))
    .filter((time): time is number => Number.isFinite(time))
    .map((time) => ({ start: time - guardMs, end: time + guardMs }));
}

function parseNewsEventTime(line: string): number {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return Number.NaN;
  const match = trimmed.match(/^(\d{4}[-/]\d{1,2}[-/]\d{1,2})(?:[ T,]+)(\d{1,2}:\d{2})/);
  if (!match) return Number.NaN;
  const normalized = `${match[1].replace(/\//g, '-')}T${match[2]}`;
  const time = new Date(normalized).getTime();
  return Number.isFinite(time) ? time : Number.NaN;
}

function isNewsGuarded(value: string, windows: Array<{ start: number; end: number }>): boolean {
  if (windows.length === 0) return false;
  const time = parseCandleDate(value).getTime();
  if (!Number.isFinite(time)) return false;
  return windows.some((window) => time >= window.start && time <= window.end);
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
  if (strategy === 'zeroLogic') return 'Trend';
  return 'Trend';
}

function readStrategy(value: unknown): StrategyKind | undefined {
  return value === 'maCross' ||
    value === 'rsiReversal' ||
    value === 'macdCross' ||
    value === 'bbReversal' ||
    value === 'breakout' ||
    value === 'zeroLogic'
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

function normalizeLogicParams(params: Record<string, unknown>): LogicParams {
  return {
    ...defaultParams,
    ...params,
    zeroDisabledConditions: uniqueZeroConditions(Array.isArray(params.zeroDisabledConditions) ? params.zeroDisabledConditions : []),
  } as LogicParams;
}

function uniqueZeroConditions(values: unknown[]): ZeroConditionKey[] {
  return Array.from(new Set(values.filter(isZeroConditionKey)));
}

function isZeroConditionKey(value: unknown): value is ZeroConditionKey {
  return typeof value === 'string' && zeroOptimizationConditions().some((condition) => condition.key === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
