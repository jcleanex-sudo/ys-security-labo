import { ChangeEvent, Dispatch, ReactNode, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import {
  BacktestResult,
  BacktestSettings,
  Candle,
  CsvValidationReport,
  CurvePoint,
  LiveSignal,
  LogicDefinition,
  LogicType,
  PeriodStat,
  StrategyKind,
  Timeframe,
  Trade,
  ZeroConditionKey,
  ZeroConditionStat,
  ZeroOptimizationStat,
  createLogic,
  defaultLogics,
  defaultSettings,
  filterCandles,
  generateSampleCsv,
  generateLiveSignal,
  normalizeLogic,
  parseCsvDetailed,
  runBacktests,
  strategyLabels,
} from './backtest';

type View = 'Dashboard' | 'Operation' | 'AI Selector' | 'Backtest' | 'Logic Center' | 'Ranking' | 'Trade History';
type RankingSort = 'reliabilityScore' | 'score' | 'winRate' | 'profitFactor' | 'expectancy' | 'maxDrawdown' | 'netProfit';
type DataSource = 'CSV' | 'MT4' | 'MT5';
type AiAdoptionStatus = 'Adopt' | 'Watch' | 'Reject';

type SavedBacktest = {
  savedAt: string;
  fileName: string;
  settings: BacktestSettings;
  results: BacktestResult[];
  trades: Trade[];
};

type AiLogicDecision = {
  result: BacktestResult;
  status: AiAdoptionStatus;
  aiScore: number;
  reasons: string[];
  rejectionReasons: string[];
  comment: string;
  bestRegime: string;
};

type LiveSampleLog = LiveSignal & {
  id: string;
  receivedAt: string;
};

type LiveCsvFileHandle = {
  name: string;
  getFile: () => Promise<File>;
};

type ZeroVariantComparisonRow = {
  result: BacktestResult;
  logic: LogicDefinition;
  disabledLabel: string;
  decision: 'Base' | 'Adopt' | 'Watch' | 'Reject';
  deltaNetProfit: number;
  deltaWinRate: number;
  deltaProfitFactor: number;
  deltaMaxDrawdown: number;
  deltaScore: number;
};

type ZeroPresetMode = 'ZERO PRO Candidate' | 'ZERO Conservative' | 'ZERO Aggressive' | 'Pair Specific';

type ZeroPreset = {
  id: string;
  name: string;
  mode: ZeroPresetMode;
  pair: string;
  timeframe: Timeframe;
  logicIds: string[];
  notes: string;
  createdAt: string;
};

type ZeroPresetDecision = 'Current' | 'Adopt' | 'Watch' | 'Reject';

type ZeroPresetPerformanceRow = {
  preset: ZeroPreset;
  logicNames: string[];
  missingLogicIds: string[];
  trades: number;
  winRate: number;
  profitFactor: number;
  netProfit: number;
  maxDrawdown: number;
  score: number;
  reliabilityScore: number;
  expectancy: number;
  recoveryFactor: number;
  decision: ZeroPresetDecision;
  deltaNetProfit: number;
  deltaScore: number;
  deltaMaxDrawdown: number;
};

type ZeroPresetReplaySummary = {
  trades: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  recoveryFactor: number;
  reliabilityScore: number;
  netProfit: number;
  maxDrawdown: number;
  score: number;
};

type ZeroPresetReplayRankingRow = ZeroPresetReplaySummary & {
  preset: ZeroPreset;
  rank: number;
  decision: ZeroPresetDecision;
  topLogicName: string;
  missingLogicIds: string[];
  resultCount: number;
};

type FilePickerWindow = Window & {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<LiveCsvFileHandle[]>;
};

const storageKeys = {
  candles: 'ai-fx-lab:candles',
  logics: 'ai-fx-lab:logics',
  fileName: 'ai-fx-lab:file-name',
  settings: 'ai-fx-lab:settings',
  results: 'ai-fx-lab:last-results',
  dataSource: 'ai-fx-lab:data-source',
  symbols: 'ai-fx-lab:symbols',
  dataUpdatedAt: 'ai-fx-lab:data-updated-at',
  csvReport: 'ai-fx-lab:csv-report',
  zeroPresets: 'ai-fx-lab:zero-presets',
};

const views: View[] = ['Dashboard', 'Operation', 'AI Selector', 'Backtest', 'Logic Center', 'Ranking', 'Trade History'];
const timeframes: Timeframe[] = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'];
const defaultSymbols = ['USDJPY', 'EURUSD', 'GBPUSD', 'GBPJPY', 'AUDJPY', 'EURJPY', 'XAUUSD'];
const logicTypes: Array<LogicType | 'All'> = ['All', 'Trend', 'Reversal', 'Breakout', 'Volatility'];
const strategies = Object.keys(strategyLabels) as StrategyKind[];
const zeroConditionOptions: Array<{ key: ZeroConditionKey; label: string; rank: 'S' | 'A' }> = [
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

function App() {
  const [activeView, setActiveView] = useState<View>('Dashboard');
  const [candles, setCandles] = useState<Candle[]>(() => readCandles());
  const [fileName, setFileName] = useState(() => localStorage.getItem(storageKeys.fileName) ?? 'sample-usdjpy.csv');
  const [logics, setLogics] = useState<LogicDefinition[]>(() => readLogics());
  const [settings, setSettings] = useState<BacktestSettings>(() => readMergedStorage(storageKeys.settings, defaultSettings));
  const [dataSource, setDataSource] = useState<DataSource>(() => readStorage<DataSource>(storageKeys.dataSource, 'CSV'));
  const [symbols, setSymbols] = useState<string[]>(() => readSymbols());
  const [zeroPresets, setZeroPresets] = useState<ZeroPreset[]>(() => readZeroPresets());
  const [dataUpdatedAt, setDataUpdatedAt] = useState(() => localStorage.getItem(storageKeys.dataUpdatedAt) ?? '');
  const [csvReport, setCsvReport] = useState<CsvValidationReport | null>(() => readStorage<CsvValidationReport | null>(storageKeys.csvReport, null));
  const savedBacktest = useMemo(() => readStorage<SavedBacktest | null>(storageKeys.results, null), []);
  const [lastRunAt, setLastRunAt] = useState(savedBacktest?.savedAt ?? '');
  const [message, setMessage] = useState('CSVを読み込むか、MT4/MT5ブリッジからデータソースを確認してください。');

  useEffect(() => localStorage.setItem(storageKeys.candles, JSON.stringify(candles)), [candles]);
  useEffect(() => localStorage.setItem(storageKeys.logics, JSON.stringify(logics)), [logics]);
  useEffect(() => localStorage.setItem(storageKeys.settings, JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem(storageKeys.fileName, fileName), [fileName]);
  useEffect(() => localStorage.setItem(storageKeys.dataSource, dataSource), [dataSource]);
  useEffect(() => localStorage.setItem(storageKeys.symbols, JSON.stringify(symbols)), [symbols]);
  useEffect(() => localStorage.setItem(storageKeys.zeroPresets, JSON.stringify(zeroPresets)), [zeroPresets]);
  useEffect(() => localStorage.setItem(storageKeys.dataUpdatedAt, dataUpdatedAt), [dataUpdatedAt]);
  useEffect(() => localStorage.setItem(storageKeys.csvReport, JSON.stringify(csvReport)), [csvReport]);

  const filteredCandles = useMemo(() => filterCandles(candles, settings), [candles, settings]);
  const computedResults = useMemo(() => runBacktests(candles, logics, settings), [candles, logics, settings]);
  const computedTrades = useMemo(() => computedResults.flatMap((result) => result.trades), [computedResults]);
  const results = computedResults.length > 0 ? computedResults : savedBacktest?.results ?? [];
  const trades = computedTrades.length > 0 ? computedTrades : savedBacktest?.trades ?? [];
  const aiDecisions = useMemo(() => createAiLogicDecisions(results), [results]);
  const leader = results[0];

  useEffect(() => {
    if (computedResults.length === 0) return;
    const savedAt = new Date().toISOString();
    const payload: SavedBacktest = {
      savedAt,
      fileName,
      settings,
      results: computedResults,
      trades: computedTrades,
    };
    localStorage.setItem(storageKeys.results, JSON.stringify(payload));
    setLastRunAt(savedAt);
  }, [computedResults, computedTrades, fileName, settings]);

  function loadSample() {
    const parsed = parseCsvDetailed(generateSampleCsv(), 'H1');
    setCandles(parsed.candles);
    setCsvReport(parsed.report);
    setFileName('sample-usdjpy.csv');
    setSettings((current) => ({ ...current, pair: 'USDJPY', timeframe: 'H1' }));
    setDataSource('CSV');
    setDataUpdatedAt(new Date().toISOString());
    setMessage('サンプルCSVを読み込みました。');
  }

  const importCsvSnapshot = useCallback(async (name: string, text: string, source: DataSource = dataSource): Promise<number> => {
    const parsed = parseCsvDetailed(text, settings.timeframe);
    if (parsed.report.status === 'error') {
      setCsvReport(parsed.report);
      setMessage(`CSVエラー: ${parsed.report.issues.filter((issue) => issue.severity === 'error')[0]?.message ?? '形式を確認してください。'}`);
      return 0;
    }

    setCandles(parsed.candles);
    setCsvReport(parsed.report);
    setFileName(name);
    setDataSource(source);
    setDataUpdatedAt(new Date().toISOString());
    setMessage(`${source} Live CSVを更新しました。${parsed.candles.length.toLocaleString()}本 / 品質 ${parsed.report.score}/100`);
    return parsed.candles.length;
  }, [dataSource, settings.timeframe]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = parseCsvDetailed(await file.text(), settings.timeframe);
      if (parsed.report.status === 'error') {
        setCsvReport(parsed.report);
        setMessage(`CSVエラー: ${parsed.report.issues.filter((issue) => issue.severity === 'error')[0]?.message ?? '形式を確認してください。'}`);
        event.target.value = '';
        return;
      }

      setCandles(parsed.candles);
      setCsvReport(parsed.report);
      setFileName(file.name);
      setDataSource('CSV');
      setDataUpdatedAt(new Date().toISOString());
      setMessage(
        parsed.report.status === 'warning'
          ? `${file.name} を読み込みました。警告があります。品質スコア ${parsed.report.score}/100`
          : `${file.name} を読み込みました。${parsed.candles.length.toLocaleString()}本の足で検証済みです。品質スコア ${parsed.report.score}/100`,
      );
      event.target.value = '';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'CSVの読み込みに失敗しました。');
      event.target.value = '';
    }
  }

  function updateSetting<Key extends keyof BacktestSettings>(key: Key, value: BacktestSettings[Key]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function selectSymbol(symbol: string) {
    updateSetting('pair', symbol);
  }

  function addSymbol(symbol: string) {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized || symbols.includes(normalized)) return;
    setSymbols((current) => [...current, normalized]);
    setSettings((current) => ({ ...current, pair: normalized }));
  }

  function deleteSymbol(symbol: string) {
    setSymbols((current) => current.filter((item) => item !== symbol));
    if (settings.pair === symbol) {
      const nextSymbol = symbols.find((item) => item !== symbol) ?? defaultSettings.pair;
      setSettings((current) => ({ ...current, pair: nextSymbol }));
    }
  }

  function createZeroVariant(result: BacktestResult, stat: ZeroOptimizationStat) {
    const source = logics.find((logic) => logic.id === result.logicId);
    if (!source || source.strategy !== 'zeroLogic') {
      setMessage('ZERO variant can only be created from a ZERO Logic report.');
      return;
    }

    const disabledConditions = Array.from(new Set([...(source.params.zeroDisabledConditions ?? []), stat.conditionKey]));
    const variant = normalizeLogic({
      ...source,
      id: `logic-zero-variant-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: `${source.name} / OFF ${stat.condition}`,
      description: `${source.description}\nOptimizer variant: ${stat.condition} disabled from ${new Date().toISOString().slice(0, 10)}.`,
      enabled: true,
      params: {
        ...source.params,
        zeroDisabledConditions: disabledConditions,
      },
    }, source);

    setLogics((current) => [...current, variant]);
    setActiveView('Logic Center');
    setMessage(`Created ZERO variant: ${variant.name}`);
  }

  function saveZeroPreset(input: Omit<ZeroPreset, 'id' | 'createdAt'>) {
    const preset: ZeroPreset = {
      ...input,
      id: `zero-preset-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    setZeroPresets((current) => [preset, ...current]);
    setMessage(`Saved ZERO preset: ${preset.name}`);
  }

  function applyZeroPreset(preset: ZeroPreset) {
    const selected = new Set(preset.logicIds);
    setLogics((current) => current.map((logic) => (
      logic.strategy === 'zeroLogic' ? normalizeLogic({ ...logic, enabled: selected.has(logic.id) }, logic) : logic
    )));
    setMessage(`Applied ZERO preset: ${preset.name}`);
  }

  function deleteZeroPreset(id: string) {
    setZeroPresets((current) => current.filter((preset) => preset.id !== id));
    setMessage('Deleted ZERO preset.');
  }

  function importZeroPresets(presets: ZeroPreset[]) {
    setZeroPresets((current) => {
      const existing = new Set(current.map((preset) => preset.id));
      return [...presets.filter((preset) => !existing.has(preset.id)), ...current];
    });
    setMessage(`Imported ${presets.length} ZERO presets.`);
  }

  function prepareMt5Connection() {
    setDataSource('MT5');
    setMessage('MT5はCSVブリッジ対応です。mt5/ExportRatesToCsv.mq5で出力したCSVを読み込んでください。');
  }

  function prepareMt4Connection() {
    setDataSource('MT4');
    setMessage('MT4はCSVブリッジ対応です。mt4/ExportRatesToCsv.mq4で出力したCSVを読み込んでください。');
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#080d16]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="logo-mark">AFX</div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-2xl font-black tracking-tight">AI FX LAB</p>
                <span className="version-pill">Ver5.4 ZERO Preset Report</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-400">AIが検証し、AIが学習し、AIが選ぶ。</p>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto">
            {views.map((view) => (
              <button
                key={view}
                className={`nav-button ${activeView === view ? 'nav-button-active' : ''}`}
                onClick={() => setActiveView(view)}
              >
                {view}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        <section className="mb-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="panel hero-panel flex flex-col justify-between gap-5 p-5">
            <div>
              <p className="text-sm font-bold text-cyan-300">Data Source: {dataSource} / {candles.length > 0 ? fileName : '未読込'}</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">危ない高勝率ロジックを信頼性で見抜く。</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                PF、DD、取引回数、Recovery Factor、連敗数まで含めてバックテストを評価します。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="command-button cursor-pointer">
                <span className="text-lg leading-none">+</span>
                CSV読み込み
                <input className="hidden" type="file" accept=".csv,text/csv" onChange={handleFile} />
              </label>
              <button className="secondary-button" onClick={loadSample}>
                Sample CSV
              </button>
              <span className="text-sm text-slate-400">{message}</span>
            </div>
          </div>

          <div className="panel grid grid-cols-2 gap-3 p-5">
            <Metric label="データソース" value={dataSource} />
            <Metric label="選択Symbol" value={settings.pair} />
            <Metric label="おすすめロジック" value={leader?.logicName ?? '-'} />
            <Metric label="最新検証" value={formatDateTimeLabel(lastRunAt)} />
          </div>
        </section>

        <DataBridgePanel
          candles={candles}
          dataSource={dataSource}
          dataUpdatedAt={dataUpdatedAt}
          fileName={fileName}
          csvReport={csvReport}
          logics={logics}
          onAddSymbol={addSymbol}
          onConnectMt4={prepareMt4Connection}
          onConnectMt5={prepareMt5Connection}
          onDeleteSymbol={deleteSymbol}
          onSelectDataSource={setDataSource}
          onSelectSymbol={selectSymbol}
          onUpdateSetting={updateSetting}
          settings={settings}
          symbols={symbols}
        />

        <SettingsPanel settings={settings} onUpdate={updateSetting} />

        {activeView === 'Dashboard' && (
          <Dashboard
            results={results}
            candles={filteredCandles}
            trades={trades}
            settings={settings}
            logics={logics}
            lastRunAt={lastRunAt}
            dataSource={dataSource}
            dataUpdatedAt={dataUpdatedAt}
            aiDecisions={aiDecisions}
          />
        )}
        {activeView === 'Operation' && (
          <OperationMode
            aiDecisions={aiDecisions}
            candles={filteredCandles}
            logics={logics}
            onImportCsvSnapshot={importCsvSnapshot}
            onLoadSample={loadSample}
            settings={settings}
          />
        )}
        {activeView === 'AI Selector' && <AiSelector results={results} decisions={aiDecisions} />}
        {activeView === 'Backtest' && (
          <Backtest
            results={results}
            trades={trades}
            candles={candles}
            logics={logics}
            settings={settings}
            fileName={fileName}
            zeroPresets={zeroPresets}
            onApplyZeroPreset={applyZeroPreset}
            onCreateZeroVariant={createZeroVariant}
            onDeleteZeroPreset={deleteZeroPreset}
            onImportZeroPresets={importZeroPresets}
            onSaveZeroPreset={saveZeroPreset}
          />
        )}
        {activeView === 'Logic Center' && <LogicCenter logics={logics} setLogics={setLogics} />}
        {activeView === 'Ranking' && <Ranking results={results} />}
        {activeView === 'Trade History' && <TradeHistory trades={trades} />}
      </main>
    </div>
  );
}

function DataBridgePanel({
  candles,
  csvReport,
  dataSource,
  dataUpdatedAt,
  fileName,
  logics,
  onAddSymbol,
  onConnectMt4,
  onConnectMt5,
  onDeleteSymbol,
  onSelectDataSource,
  onSelectSymbol,
  onUpdateSetting,
  settings,
  symbols,
}: {
  candles: Candle[];
  csvReport: CsvValidationReport | null;
  dataSource: DataSource;
  dataUpdatedAt: string;
  fileName: string;
  logics: LogicDefinition[];
  onAddSymbol: (symbol: string) => void;
  onConnectMt4: () => void;
  onConnectMt5: () => void;
  onDeleteSymbol: (symbol: string) => void;
  onSelectDataSource: (source: DataSource) => void;
  onSelectSymbol: (symbol: string) => void;
  onUpdateSetting: <Key extends keyof BacktestSettings>(key: Key, value: BacktestSettings[Key]) => void;
  settings: BacktestSettings;
  symbols: string[];
}) {
  const [newSymbol, setNewSymbol] = useState('');
  const dataProfile = useMemo(() => createDataProfile(candles, settings.timeframe, dataUpdatedAt), [candles, dataUpdatedAt, settings.timeframe]);
  const activeLogicCount = logics.filter((logic) => logic.enabled).length;

  function submitSymbol() {
    onAddSymbol(newSymbol);
    setNewSymbol('');
  }

  return (
    <section className="panel mb-6 p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="section-heading">MT4 / MT5 Data Bridge</h2>
          <p className="text-sm text-slate-500">リアルタイム接続の前に、まずCSVブリッジで実データを安全に取り込みます。</p>
        </div>
        <div className="source-switch">
          {(['CSV', 'MT4', 'MT5'] as DataSource[]).map((source) => (
            <button
              key={source}
              className={`source-button ${dataSource === source ? 'source-button-active' : ''}`}
              onClick={() => onSelectDataSource(source)}
            >
              {source}{source === 'MT4' || source === 'MT5' ? '（CSV）' : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 bridge-guide">
        <div>
          <p className="bridge-title">MT4 / MT5 CSV Export Guide</p>
          <p className="bridge-copy">
            Manual export: <code>mt4/ExportRatesToCsv.mq4</code> / <code>mt5/ExportRatesToCsv.mq5</code>.
            Live sample feed: <code>mt4/AIFXLAB_LiveCsvBridge.mq4</code> / <code>mt5/AIFXLAB_LiveCsvBridge.mq5</code>.
            Select the generated <code>AIFXLAB_LIVE_SYMBOL_TIMEFRAME.csv</code> from Operation mode.
            ZERO MTF pack: export M5 / M15 / H1 / H4 with the same symbol and date range for the next strict MTF upgrade.
          </p>
        </div>
        <div className="guide-steps">
          <span>MT4</span>
          <span>MT5</span>
          <span>Export / Live EA</span>
          <span>CSV</span>
          <span>AI FX LAB</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="data-bridge-grid">
          <div className="bridge-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="bridge-title">Symbol管理</p>
                <p className="bridge-copy">通貨ペアを追加・削除し、検証対象を切り替えます。</p>
              </div>
              <span className="status-pill">{symbols.length} symbols</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {symbols.map((symbol) => (
                <div
                  key={symbol}
                  className={`symbol-chip ${settings.pair === symbol ? 'symbol-chip-active' : ''}`}
                >
                  <button className="symbol-select" onClick={() => onSelectSymbol(symbol)}>
                    {symbol}
                  </button>
                  <button
                    aria-label={`${symbol}を削除`}
                    className="symbol-remove"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteSymbol(symbol);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                className="form-input"
                placeholder="例: NZDJPY"
                value={newSymbol}
                onChange={(event) => setNewSymbol(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submitSymbol();
                }}
              />
              <button className="secondary-button shrink-0" onClick={submitSymbol}>
                Symbol追加
              </button>
            </div>
          </div>

          <div className="bridge-card">
            <p className="bridge-title">Timeframe</p>
            <p className="bridge-copy">MT5の標準時間足を想定した検証単位です。</p>
            <div className="timeframe-grid mt-4">
              {timeframes.map((timeframe) => (
                <button
                  key={timeframe}
                  className={`timeframe-button ${settings.timeframe === timeframe ? 'timeframe-button-active' : ''}`}
                  onClick={() => onUpdateSetting('timeframe', timeframe)}
                >
                  {timeframe}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="bridge-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="bridge-title">Data Manager</p>
                <p className="bridge-copy">{fileName} / {settings.pair} {settings.timeframe}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="secondary-button" onClick={onConnectMt4}>
                  MT4 CSV
                </button>
                <button className="command-button" onClick={onConnectMt5}>
                  MT5 CSV
                </button>
              </div>
            </div>
            <div className="data-manager-grid mt-4">
              <Metric label="データ数" value={dataProfile.count.toLocaleString()} />
              <Metric label="開始日" value={dataProfile.start} />
              <Metric label="終了日" value={dataProfile.end} />
              <Metric label="最終更新" value={formatDateTimeLabel(dataUpdatedAt)} />
              <Metric label="欠損データ" value={dataProfile.missingLabel} />
              <Metric label="品質スコア" value={csvReport ? `${csvReport.score}/100` : '-'} />
              <Metric label="Bridge状態" value={dataSource === 'MT4' ? 'MT4 CSVモード' : dataSource === 'MT5' ? 'MT5 CSVモード' : 'CSVモード'} />
            </div>
            <CsvQualityPanel report={csvReport} />
          </div>

          <div className="bridge-card">
            <p className="bridge-title">Project構造</p>
            <div className="project-flow mt-4">
              <ProjectNode label="Projects" value="AI FX LAB" />
              <ProjectNode label="Symbols" value={settings.pair} />
              <ProjectNode label="Strategies" value={`${activeLogicCount}/${logics.length} active`} />
              <ProjectNode label="Backtests" value={`${candles.length.toLocaleString()} bars`} />
              <ProjectNode label="Reports" value="Ranking / History" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SettingsPanel({
  settings,
  onUpdate,
}: {
  settings: BacktestSettings;
  onUpdate: <Key extends keyof BacktestSettings>(key: Key, value: BacktestSettings[Key]) => void;
}) {
  return (
    <section className="panel mb-6 p-5">
      <div className="mb-4">
        <h2 className="section-heading">Backtest Conditions</h2>
        <p className="text-sm text-slate-500">Date range, capital, and cost settings are saved automatically.</p>
      </div>
      <div className="settings-grid">
        <Field label="Start Date">
          <input className="form-input" type="date" value={settings.startDate} onChange={(event) => onUpdate('startDate', event.target.value)} />
        </Field>
        <Field label="End Date">
          <input className="form-input" type="date" value={settings.endDate} onChange={(event) => onUpdate('endDate', event.target.value)} />
        </Field>
        <Field label="Initial Capital">
          <input className="form-input" min="0" type="number" value={settings.initialCapital} onChange={(event) => onUpdate('initialCapital', Number(event.target.value))} />
        </Field>
        <Field label="Lot">
          <input className="form-input" min="0.01" step="0.01" type="number" value={settings.lotSize} onChange={(event) => onUpdate('lotSize', Number(event.target.value))} />
        </Field>
        <Field label="Spread(pips)">
          <input className="form-input" min="0" step="0.1" type="number" value={settings.spread} onChange={(event) => onUpdate('spread', Number(event.target.value))} />
        </Field>
        <Field label="Commission">
          <input className="form-input" min="0" step="100" type="number" value={settings.commission} onChange={(event) => onUpdate('commission', Number(event.target.value))} />
        </Field>
      </div>
      <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="font-black">ZERO News Guard</h3>
            <p className="mt-1 text-sm text-slate-500">Stops new ZERO Logic entries around major events. Existing trades still manage TP/SL normally.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-300">
            <input type="checkbox" checked={settings.newsGuardEnabled} onChange={(event) => onUpdate('newsGuardEnabled', event.target.checked)} />
            Enabled
          </label>
        </div>
        <div className="settings-grid mt-4">
          <Field label="Guard Minutes">
            <input className="form-input" min="0" step="5" type="number" value={settings.newsGuardMinutes} onChange={(event) => onUpdate('newsGuardMinutes', Number(event.target.value))} />
          </Field>
          <Field label="Event Format">
            <input className="form-input" value="YYYY-MM-DD HH:mm  Event name" readOnly />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Economic Events">
            <textarea
              className="form-input form-textarea"
              placeholder={'2026-08-07 21:30 NFP\n2026-08-12 21:30 CPI\n2026-09-17 03:00 FOMC'}
              value={settings.newsEvents}
              onChange={(event) => onUpdate('newsEvents', event.target.value)}
            />
          </Field>
        </div>
      </div>
    </section>
  );
}

function Dashboard({
  results,
  candles,
  trades,
  settings,
  logics,
  lastRunAt,
  dataSource,
  dataUpdatedAt,
  aiDecisions,
}: {
  results: BacktestResult[];
  candles: Candle[];
  trades: Trade[];
  settings: BacktestSettings;
  logics: LogicDefinition[];
  lastRunAt: string;
  dataSource: DataSource;
  dataUpdatedAt: string;
  aiDecisions: AiLogicDecision[];
}) {
  const leader = results[0];
  const leaderValidation = leader?.validation;
  const aiLeader = aiDecisions[0];
  const bestWinRate = Math.max(0, ...results.map((result) => result.winRate));
  const bestPf = Math.max(0, ...results.map((result) => result.profitFactor === 99 ? 0 : result.profitFactor));
  const bestScore = Math.max(0, ...results.map((result) => result.score));
  const bestReliabilityScore = Math.max(0, ...results.map((result) => result.validation?.score ?? 0));
  const highReliabilityCount = results.filter((result) => result.reliability === 'High').length;
  const adoptCount = aiDecisions.filter((decision) => decision.status === 'Adopt').length;
  const watchCount = aiDecisions.filter((decision) => decision.status === 'Watch').length;
  const rejectCount = aiDecisions.filter((decision) => decision.status === 'Reject').length;
  const recentCandles = candles.slice(-56);
  const max = Math.max(...recentCandles.map((candle) => candle.high), 1);
  const min = Math.min(...recentCandles.map((candle) => candle.low), 0);
  const range = Math.max(max - min, 0.001);

  return (
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="panel p-5 lg:col-span-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-heading">Dashboard</h2>
            <p className="text-sm text-slate-400">検証状況とおすすめロジックを一目で確認できます。</p>
          </div>
          <span className="status-pill">{candles.length > 0 ? `${candles.length.toLocaleString()} bars loaded` : 'CSV未読込'}</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="総ロジック数" value={logics.length} />
          <Metric label="有効ロジック数" value={logics.filter((logic) => logic.enabled).length} />
          <Metric label="データソース" value={dataSource} />
          <Metric label="対象Symbol" value={settings.pair} />
          <Metric label="News Guard" value={settings.newsGuardEnabled ? `ON +/-${settings.newsGuardMinutes}m` : 'OFF'} />
          <Metric label="最高勝率" value={results.length ? `${bestWinRate.toFixed(1)}%` : '-'} />
          <Metric label="最高PF" value={results.length ? bestPf.toFixed(2) : '-'} />
          <Metric label="最高スコア" value={results.length ? bestScore.toFixed(1) : '-'} />
          <Metric label="Reliability Score" value={results.length ? `${bestReliabilityScore}/100` : '-'} />
          <Metric label="高信頼ロジック" value={results.length ? highReliabilityCount : '-'} />
          <Metric label="最新バックテスト" value={formatDateTimeLabel(lastRunAt)} />
          <Metric label="データ最終更新" value={formatDateTimeLabel(dataUpdatedAt)} />
          <Metric label="おすすめロジック" value={leader?.logicName ?? '-'} />
          <Metric label="総取引数" value={trades.length.toLocaleString()} />
          <Metric label="AI Recommended" value={adoptCount + watchCount} />
          <Metric label="Adopt" value={adoptCount} />
          <Metric label="Watch" value={watchCount} />
          <Metric label="Reject" value={rejectCount} />
          <Metric label="AI Top Logic" value={aiLeader?.result.logicName ?? '-'} />
        </div>
        {!leader && (
          <EmptyState
            title="まだ検証結果がありません"
            body="CSVを読み込むか、Sample CSVを使ってバックテストを開始してください。結果が出るとランキングと履歴がここに表示されます。"
          />
        )}
      </section>

      <section className="panel p-5">
        <h2 className="section-heading">Recommended Logic</h2>
        <div className="mt-5 rounded-md border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-bold text-slate-400">AI FX LAB selected</p>
          <p className="mt-1 text-2xl font-black">{leader?.logicName ?? 'No result'}</p>
          <p className="mt-2 text-sm leading-7 text-slate-400">
            初期資金 {settings.initialCapital.toLocaleString()} / {trades.length.toLocaleString()} trades.
            TP/SL、スプレッド、手数料を損益へ反映しています。
          </p>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="section-heading">Ver3.4 Reliability</h2>
        {leaderValidation ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Metric label="Reliability Score" value={`${leaderValidation.score}/100`} />
            <Metric label="Best Regime" value={leaderValidation.bestRegime} />
            <Metric label="OOS Retention" value={`${leaderValidation.outOfSample.retentionRate.toFixed(0)}%`} />
            <Metric label="MC Runs" value={leaderValidation.monteCarlo.runs} />
            <Metric label="MC Avg Profit" value={formatMoney(leaderValidation.monteCarlo.averageProfit)} />
            <Metric label="MC Worst DD" value={formatMoney(leaderValidation.monteCarlo.worstMaxDrawdown)} />
          </div>
        ) : (
          <EmptyState title="Reliability data is not ready" body="Run a backtest to calculate walk forward, out-of-sample, Monte Carlo, and regime analysis." />
        )}
      </section>

      <section className="panel p-5">
        <h2 className="section-heading">Price Snapshot</h2>
        {recentCandles.length > 0 ? (
          <div className="mt-5 flex h-72 items-end gap-1 border-b border-white/10">
            {recentCandles.map((candle) => {
              const height = ((candle.close - min) / range) * 88 + 6;
              const up = candle.close >= candle.open;
              return (
                <div
                  key={candle.time}
                  className={`w-full rounded-t-sm ${up ? 'bg-mint' : 'bg-coral'}`}
                  style={{ height: `${height}%` }}
                  title={`${candle.time} ${candle.close}`}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState title="CSV未読込" body="チャートCSVを読み込むと、直近価格のスナップショットが表示されます。" />
        )}
      </section>

      <section className="panel p-5 lg:col-span-2">
        <h2 className="section-heading">Equity Curve</h2>
        <LineChart points={leader?.analytics.equityCurve ?? []} tone="mint" />
      </section>
      <section className="panel p-5">
        <h2 className="section-heading">Drawdown</h2>
        <LineChart points={leader?.analytics.drawdownCurve ?? []} tone="coral" />
      </section>
      <section className="panel p-5">
        <h2 className="section-heading">Monthly Profit</h2>
        <BarChart points={leader?.analytics.monthlyProfits ?? []} />
      </section>
      <section className="panel p-5 lg:col-span-2">
        <h2 className="section-heading">Walk Forward Results</h2>
        <WalkForwardTable segments={leaderValidation?.walkForward ?? []} />
      </section>
      <section className="panel p-5">
        <h2 className="section-heading">Out-of-Sample Test</h2>
        <OutOfSamplePanel result={leaderValidation?.outOfSample} />
      </section>
      <section className="panel p-5">
        <h2 className="section-heading">Monte Carlo Evaluation</h2>
        <MonteCarloPanel result={leaderValidation?.monteCarlo} />
      </section>
      <section className="panel p-5 lg:col-span-2">
        <h2 className="section-heading">Market Regime Logic Fit</h2>
        <MarketRegimeTable results={results} />
      </section>
    </div>
  );
}

function WalkForwardTable({ segments }: { segments: NonNullable<BacktestResult['validation']>['walkForward'] }) {
  if (segments.length === 0) {
    return <EmptyState title="Walk forward data is not ready" body="At least 160 bars are needed to split repeated train and validation windows." />;
  }

  return (
    <div className="table-wrap mt-5">
      <table>
        <thead>
          <tr>
            <th>Window</th>
            <th>Train</th>
            <th>Validation</th>
            <th>IS Profit</th>
            <th>OOS Profit</th>
            <th>OOS PF</th>
            <th>OOS DD</th>
            <th>Trades</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((segment) => (
            <tr key={segment.label}>
              <td className="font-bold">{segment.label}</td>
              <td>{shortDate(segment.trainStart)} - {shortDate(segment.trainEnd)}</td>
              <td>{shortDate(segment.testStart)} - {shortDate(segment.testEnd)}</td>
              <td className={segment.inSample.netProfit >= 0 ? 'profit' : 'loss'}>{formatMoney(segment.inSample.netProfit)}</td>
              <td className={segment.outOfSample.netProfit >= 0 ? 'profit' : 'loss'}>{formatMoney(segment.outOfSample.netProfit)}</td>
              <td>{segment.outOfSample.profitFactor.toFixed(2)}</td>
              <td>{formatMoney(segment.outOfSample.maxDrawdown)}</td>
              <td>{segment.outOfSample.tradeCount}</td>
              <td className="font-black">{segment.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OutOfSamplePanel({ result }: { result?: NonNullable<BacktestResult['validation']>['outOfSample'] }) {
  if (!result) return <EmptyState title="OOS data is not ready" body="Run a backtest to split in-sample and unseen data." />;

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <Metric label="Split Date" value={shortDate(result.splitDate)} />
      <Metric label="Retention" value={`${result.retentionRate.toFixed(0)}%`} />
      <Metric label="IS Net Profit" value={formatMoney(result.inSample.netProfit)} />
      <Metric label="OOS Net Profit" value={formatMoney(result.outOfSample.netProfit)} />
      <Metric label="OOS PF" value={result.outOfSample.profitFactor.toFixed(2)} />
      <Metric label="OOS Max DD" value={formatMoney(result.outOfSample.maxDrawdown)} />
    </div>
  );
}

function MonteCarloPanel({ result }: { result?: NonNullable<BacktestResult['validation']>['monteCarlo'] }) {
  if (!result) return <EmptyState title="Monte Carlo data is not ready" body="Run a backtest to randomize trade order and estimate robustness." />;

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <Metric label="Runs" value={result.runs} />
      <Metric label="Avg Profit" value={formatMoney(result.averageProfit)} />
      <Metric label="Avg DD" value={formatMoney(result.averageMaxDrawdown)} />
      <Metric label="Worst DD" value={formatMoney(result.worstMaxDrawdown)} />
      <Metric label="Profit P10/P50/P90" value={`${formatMoney(result.profitP10)} / ${formatMoney(result.profitP50)} / ${formatMoney(result.profitP90)}`} />
      <Metric label="Win P10/P50/P90" value={`${result.winRateP10.toFixed(0)}% / ${result.winRateP50.toFixed(0)}% / ${result.winRateP90.toFixed(0)}%`} />
    </div>
  );
}

function MarketRegimeTable({ results }: { results: BacktestResult[] }) {
  const rows = results.flatMap((result) =>
    (result.validation?.marketRegimes ?? []).map((regime) => ({
      logicName: result.logicName,
      reliabilityScore: result.validation?.score ?? 0,
      ...regime,
    })),
  ).sort((a, b) => b.score - a.score || b.netProfit - a.netProfit);

  if (rows.length === 0) {
    return <EmptyState title="Regime data is not ready" body="Run a backtest to classify Trend, Range, High Volatility, and Low Volatility periods." />;
  }

  return (
    <div className="table-wrap mt-5">
      <table>
        <thead>
          <tr>
            <th>Regime</th>
            <th>Recommended Logic</th>
            <th>Reliability</th>
            <th>Regime Score</th>
            <th>Bars</th>
            <th>Trades</th>
            <th>Win Rate</th>
            <th>PF</th>
            <th>Net Profit</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 16).map((row) => (
            <tr key={`${row.logicName}-${row.regime}`}>
              <td className="font-bold">{row.regime}</td>
              <td>{row.logicName}</td>
              <td>{row.reliabilityScore}/100</td>
              <td>{row.score}</td>
              <td>{row.bars}</td>
              <td>{row.trades}</td>
              <td>{row.winRate.toFixed(1)}%</td>
              <td>{row.profitFactor.toFixed(2)}</td>
              <td className={row.netProfit >= 0 ? 'profit' : 'loss'}>{formatMoney(row.netProfit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OperationMode({
  aiDecisions,
  candles,
  logics,
  onImportCsvSnapshot,
  onLoadSample,
  settings,
}: {
  aiDecisions: AiLogicDecision[];
  candles: Candle[];
  logics: LogicDefinition[];
  onImportCsvSnapshot: (name: string, text: string, source?: DataSource) => Promise<number>;
  onLoadSample: () => void;
  settings: BacktestSettings;
}) {
  const preferredLogicId = aiDecisions.find((decision) => decision.status === 'Adopt')?.result.logicId ?? aiDecisions[0]?.result.logicId ?? logics[0]?.id ?? '';
  const [selectedLogicId, setSelectedLogicId] = useState(preferredLogicId);
  const [cursor, setCursor] = useState(60);
  const [running, setRunning] = useState(false);
  const [liveFeedRunning, setLiveFeedRunning] = useState(false);
  const [liveFeedStatus, setLiveFeedStatus] = useState('');
  const [liveFileHandle, setLiveFileHandle] = useState<LiveCsvFileHandle | null>(null);
  const [chartImageUrl, setChartImageUrl] = useState('');
  const [chartImageName, setChartImageName] = useState('');
  const [logs, setLogs] = useState<LiveSampleLog[]>([]);
  const selectedLogic = logics.find((logic) => logic.id === selectedLogicId) ?? logics.find((logic) => logic.id === preferredLogicId) ?? logics[0];
  const safeCursor = Math.min(Math.max(cursor, 0), Math.max(candles.length - 1, 0));
  const liveCandles = candles.slice(0, safeCursor + 1);
  const liveSignal = useMemo(
    () => (selectedLogic ? generateLiveSignal(liveCandles, selectedLogic, settings) : null),
    [liveCandles, selectedLogic, settings],
  );
  const progress = candles.length > 1 ? (safeCursor / (candles.length - 1)) * 100 : 0;

  useEffect(() => {
    if (selectedLogicId || !preferredLogicId) return;
    setSelectedLogicId(preferredLogicId);
  }, [preferredLogicId, selectedLogicId]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setCursor((current) => {
        if (current >= candles.length - 1) {
          setRunning(false);
          return current;
        }
        return current + 1;
      });
    }, 850);
    return () => window.clearInterval(timer);
  }, [candles.length, running]);

  useEffect(() => {
    if (!liveFeedRunning || !liveFileHandle) return;
    let cancelled = false;
    const handle = liveFileHandle;

    async function refreshLiveFile() {
      try {
        const file = await handle.getFile();
        const count = await onImportCsvSnapshot(file.name, await file.text(), 'MT4');
        if (cancelled) return;
        if (count > 0) {
          setCursor(count - 1);
          setLiveFeedStatus(`Live CSV更新: ${file.name} / ${count.toLocaleString()} bars`);
        }
      } catch (error) {
        if (!cancelled) {
          setLiveFeedRunning(false);
          setLiveFeedStatus(error instanceof Error ? `Live CSV停止: ${error.message}` : 'Live CSV停止: ファイルを再選択してください。');
        }
      }
    }

    refreshLiveFile();
    const timer = window.setInterval(refreshLiveFile, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [liveFeedRunning, liveFileHandle, onImportCsvSnapshot]);

  useEffect(() => {
    if (!running || !liveSignal || liveSignal.time === '-') return;
    setLogs((current) => {
      const previous = current[current.length - 1];
      if (previous?.time === liveSignal.time && previous.logicId === liveSignal.logicId) return current;
      return [
        ...current,
        {
          ...liveSignal,
          id: `${liveSignal.logicId}-${liveSignal.time}-${current.length}`,
          receivedAt: new Date().toISOString(),
        },
      ].slice(-240);
    });
  }, [liveSignal, running]);

  function startSampleRun() {
    if (candles.length === 0) {
      onLoadSample();
      setCursor(60);
    }
    setRunning(true);
  }

  function resetSampleRun() {
    setRunning(false);
    setLiveFeedRunning(false);
    setCursor(60);
    setLogs([]);
  }

  function loadChartImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (chartImageUrl) URL.revokeObjectURL(chartImageUrl);
    setChartImageUrl(URL.createObjectURL(file));
    setChartImageName(file.name);
    event.target.value = '';
  }

  function clearChartImage() {
    if (chartImageUrl) URL.revokeObjectURL(chartImageUrl);
    setChartImageUrl('');
    setChartImageName('');
  }

  async function selectLiveCsvFile() {
    const picker = window as FilePickerWindow;
    if (!picker.showOpenFilePicker) {
      setLiveFeedStatus('このブラウザでは自動再読込が使えません。下のImport CSV Snapshotを使ってください。');
      return;
    }

    try {
      const [handle] = await picker.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }],
      });
      if (!handle) return;
      setLiveFileHandle(handle);
      setLiveFeedRunning(true);
      setRunning(false);
      setLiveFeedStatus(`Live CSV選択: ${handle.name}`);
    } catch (error) {
      setLiveFeedStatus(error instanceof Error ? `Live CSV選択中止: ${error.message}` : 'Live CSV選択を中止しました。');
    }
  }

  async function importSnapshotFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const count = await onImportCsvSnapshot(file.name, await file.text(), 'MT4');
    if (count > 0) {
      setCursor(count - 1);
      setLiveFeedStatus(`CSV Snapshot取込: ${file.name} / ${count.toLocaleString()} bars`);
    }
    event.target.value = '';
  }

  return (
    <div className="grid gap-5">
      <section className="panel p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="section-heading">Operation Mode</h2>
            <p className="text-sm text-slate-500">Sample candles are replayed like realtime market data. Signals are logged only; no orders are sent.</p>
          </div>
          <span className={`status-pill ${running ? 'reliability-high' : ''}`}>{running ? 'Running Sample' : 'Paused'}</span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bridge-card">
            <div className="settings-grid">
              <Field label="Operation Logic">
                <select className="form-input" value={selectedLogic?.id ?? ''} onChange={(event) => setSelectedLogicId(event.target.value)}>
                  {logics.filter((logic) => logic.enabled).map((logic) => (
                    <option key={logic.id} value={logic.id}>{logic.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Replay Bar">
                <input className="form-input" max={Math.max(candles.length - 1, 0)} min="0" type="number" value={safeCursor} onChange={(event) => setCursor(Number(event.target.value))} />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="command-button" onClick={startSampleRun}>{running ? 'Running...' : 'Start Sample Run'}</button>
              <button className="secondary-button" onClick={() => setRunning(false)}>Pause</button>
              <button className="secondary-button" onClick={selectLiveCsvFile}>{liveFeedRunning ? 'Live CSV Running' : 'Select Live CSV'}</button>
              <label className="secondary-button cursor-pointer">
                Import CSV Snapshot
                <input className="hidden" type="file" accept=".csv,text/csv" onChange={importSnapshotFile} />
              </label>
              <button className="secondary-button" onClick={resetSampleRun}>Reset</button>
              <button className="secondary-button" onClick={onLoadSample}>Load Sample CSV</button>
              <button className="secondary-button" onClick={() => downloadText('operation-sample-signals.csv', toCsv(liveSignalRows(logs)))}>
                Export Signal CSV
              </button>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-mint" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>
            <p className="bridge-copy mt-3">{safeCursor + 1} / {candles.length.toLocaleString()} bars replayed</p>
            {liveFeedStatus && <p className="mt-3 text-sm font-bold text-cyan-200">{liveFeedStatus}</p>}
            <p className="bridge-copy mt-3">
              Select the CSV updated by MT4/MT5 Live CSV Bridge EA. AI FX LAB reloads it about every 3 seconds and updates the chart and signals. No orders are sent.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Current Time" value={liveSignal?.time ?? '-'} />
            <Metric label="Pair / TF" value={`${settings.pair} ${settings.timeframe}`} />
            <Metric label="Signal" value={liveSignal?.side ?? '-'} />
            <Metric label="Confidence" value={liveSignal ? `${liveSignal.confidence}%` : '-'} />
            <Metric label="Price" value={formatPrice(liveSignal?.price)} />
            <Metric label="Regime" value={liveSignal?.regime ?? '-'} />
            <Metric label="TP Price" value={formatPrice(liveSignal?.takeProfitPrice)} />
            <Metric label="TP Pips" value={`${liveSignal?.takeProfitPips ?? 0} pips`} />
            <Metric label="SL Price" value={formatPrice(liveSignal?.stopLossPrice)} />
            <Metric label="SL Pips" value={`${liveSignal?.stopLossPips ?? 0} pips`} />
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-heading">Live Candle Chart / Real FX Image</h2>
            <p className="text-sm text-slate-500">Compare AI FX LAB signal levels with an actual FX chart screenshot.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="secondary-button cursor-pointer">
              Load FX Image
              <input className="hidden" type="file" accept="image/*" onChange={loadChartImage} />
            </label>
            {chartImageUrl && <button className="secondary-button" onClick={clearChartImage}>Clear Image</button>}
            <span className="status-pill">{liveCandles.length > 0 ? liveCandles[liveCandles.length - 1].time : 'No candles'}</span>
          </div>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.95fr]">
          <CandleChart candles={liveCandles.slice(-90)} signal={liveSignal} />
          <RealFxImagePanel imageName={chartImageName} imageUrl={chartImageUrl} signal={liveSignal} />
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-heading">Realtime Sample Log</h2>
            <p className="text-sm text-slate-500">This is the sample you can collect before live MT5 connection. It is signal-only monitoring.</p>
          </div>
          <span className="status-pill">{logs.length} rows</span>
        </div>
        {logs.length > 0 ? (
          <div className="table-wrap mt-5">
            <table>
              <thead>
                <tr>
                  <th>Received</th>
                  <th>Market Time</th>
                  <th>Logic</th>
                  <th>Signal</th>
                  <th>Price</th>
                  <th>TP Price</th>
                  <th>TP Pips</th>
                  <th>SL Price</th>
                  <th>SL Pips</th>
                  <th>Regime</th>
                  <th>Confidence</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(-120).reverse().map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTimeLabel(log.receivedAt)}</td>
                    <td>{log.time}</td>
                    <td className="font-bold">{log.logicName}</td>
                    <td><SignalBadge side={log.side} /></td>
                    <td>{formatPrice(log.price)}</td>
                    <td>{formatPrice(log.takeProfitPrice)}</td>
                    <td>{log.takeProfitPips} pips</td>
                    <td>{formatPrice(log.stopLossPrice)}</td>
                    <td>{log.stopLossPips} pips</td>
                    <td>{log.regime}</td>
                    <td>{log.confidence}%</td>
                    <td>{log.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No sample signals yet" body="Press Start Sample Run to replay sample candles and collect realtime-style signal rows." />
        )}
      </section>
    </div>
  );
}

function CandleChart({ candles, signal }: { candles: Candle[]; signal: LiveSignal | null }) {
  if (candles.length < 2) return <div className="chart-empty">No candle chart data yet.</div>;

  const width = 960;
  const height = 360;
  const padding = { top: 20, right: 84, bottom: 34, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const levels = [
    ...candles.flatMap((candle) => [candle.high, candle.low]),
    signal?.price ?? 0,
    signal?.takeProfitPrice ?? 0,
    signal?.stopLossPrice ?? 0,
  ].filter((value) => Number.isFinite(value) && value > 0);
  const minPrice = Math.min(...levels);
  const maxPrice = Math.max(...levels);
  const range = Math.max(maxPrice - minPrice, 0.001);
  const yFor = (price: number) => padding.top + ((maxPrice - price) / range) * chartHeight;
  const candleStep = chartWidth / candles.length;
  const bodyWidth = Math.max(4, Math.min(12, candleStep * 0.56));
  const gridPrices = Array.from({ length: 5 }, (_, index) => minPrice + (range / 4) * index);

  function levelLine(price: number | undefined, label: string, color: string) {
    if (!Number.isFinite(price)) return null;
    const y = yFor(Number(price));
    return (
      <g key={label}>
        <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke={color} strokeDasharray="7 7" strokeWidth="1.4" />
        <text x={width - padding.right + 8} y={y + 4} fill={color} fontSize="12" fontWeight="800">{label}</text>
      </g>
    );
  }

  return (
    <div className="candle-chart-shell">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="live candle chart">
        <rect x="0" y="0" width={width} height={height} fill="transparent" />
        {gridPrices.map((price) => {
          const y = yFor(price);
          return (
            <g key={price}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgb(148 163 184 / 0.16)" />
              <text x="8" y={y + 4} fill="#94a3b8" fontSize="11" fontWeight="800">{formatPrice(price)}</text>
            </g>
          );
        })}
        {candles.map((candle, index) => {
          const x = padding.left + index * candleStep + candleStep / 2;
          const openY = yFor(candle.open);
          const closeY = yFor(candle.close);
          const highY = yFor(candle.high);
          const lowY = yFor(candle.low);
          const up = candle.close >= candle.open;
          const color = up ? '#2dd4bf' : '#fb7185';
          const bodyTop = Math.min(openY, closeY);
          const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
          return (
            <g key={`${candle.time}-${index}`}>
              <line x1={x} x2={x} y1={highY} y2={lowY} stroke={color} strokeWidth="1.5" />
              <rect x={x - bodyWidth / 2} y={bodyTop} width={bodyWidth} height={bodyHeight} rx="2" fill={color} opacity={up ? 0.92 : 0.82} />
            </g>
          );
        })}
        {signal && levelLine(signal.takeProfitPrice, 'TP', '#2dd4bf')}
        {signal && levelLine(signal.price, 'Now', '#67e8f9')}
        {signal && levelLine(signal.stopLossPrice, 'SL', '#fb7185')}
        <text x={padding.left} y={height - 10} fill="#94a3b8" fontSize="12" fontWeight="800">{candles[0]?.time}</text>
        <text x={width - padding.right - 122} y={height - 10} fill="#94a3b8" fontSize="12" fontWeight="800">{candles[candles.length - 1]?.time}</text>
      </svg>
      <div className="chart-axis">
        <span>{signal ? `${signal.side} / ${signal.confidence}%` : 'Monitoring'}</span>
        <span>{signal ? `${formatPrice(signal.price)} / TP ${signal.takeProfitPips} pips / SL ${signal.stopLossPips} pips` : '-'}</span>
      </div>
    </div>
  );
}

function RealFxImagePanel({ imageName, imageUrl, signal }: { imageName: string; imageUrl: string; signal: LiveSignal | null }) {
  if (!imageUrl) {
    return (
      <div className="real-chart-empty">
        <p className="text-lg font-black">Real FX chart image</p>
        <p className="mt-2 max-w-md text-sm leading-7 text-slate-400">
          Load a screenshot from MT4, MT5, TradingView, or your broker chart. AI FX LAB will show the current signal, TP, SL, and pips beside the real chart image.
        </p>
      </div>
    );
  }

  return (
    <div className="real-chart-shell">
      <img src={imageUrl} alt={imageName || 'Real FX chart'} />
      <div className="real-chart-overlay">
        <span>{imageName || 'FX chart'}</span>
        <strong>{signal ? `${signal.side} / ${signal.confidence}%` : 'Monitoring'}</strong>
        <span>{signal ? `${formatPrice(signal.price)} | TP ${signal.takeProfitPips} pips | SL ${signal.stopLossPips} pips` : 'No signal yet'}</span>
      </div>
    </div>
  );
}

function SignalBadge({ side }: { side: LiveSignal['side'] }) {
  const className = side === 'Buy' ? 'reliability-badge reliability-high' : side === 'Sell' ? 'reliability-badge reliability-low' : 'reliability-badge reliability-medium';
  return <span className={className}>{side}</span>;
}

function AiSelector({ results, decisions }: { results: BacktestResult[]; decisions: AiLogicDecision[] }) {
  const recommended = decisions.filter((decision) => decision.status === 'Adopt');
  const watch = decisions.filter((decision) => decision.status === 'Watch');
  const rejected = decisions.filter((decision) => decision.status === 'Reject');
  const topDecision = decisions[0];

  return (
    <div className="grid gap-5">
      <section className="panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-heading">AI Logic Selector</h2>
            <p className="text-sm text-slate-500">Rule-based AI reads Ver3.4 validation results and selects logics for adoption.</p>
          </div>
          <span className="status-pill">Ver4.0 Rule AI</span>
        </div>

        {topDecision ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-bold text-slate-400">Recommended Logic</p>
              <p className="mt-1 text-3xl font-black">{topDecision.result.logicName}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <AiStatusBadge status={topDecision.status} />
                <span className="status-pill">AI Score {topDecision.aiScore}/100</span>
                <span className="status-pill">Reliability {topDecision.result.validation?.score ?? 0}/100</span>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-400">{topDecision.comment}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Adopt" value={recommended.length} />
              <Metric label="Watch" value={watch.length} />
              <Metric label="Reject" value={rejected.length} />
              <Metric label="Top PF" value={topDecision.result.profitFactor.toFixed(2)} />
              <Metric label="Top Max DD" value={formatMoney(topDecision.result.maxDrawdown)} />
              <Metric label="Top Regime" value={topDecision.bestRegime} />
            </div>
          </div>
        ) : (
          <EmptyState title="AI selection is not ready" body="Load CSV data and run backtests to let the selector evaluate validation results." />
        )}
      </section>

      <section className="panel p-5">
        <h2 className="section-heading">Adoption Decisions</h2>
        {decisions.length > 0 ? (
          <div className="table-wrap mt-5">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Logic</th>
                  <th>AI Score</th>
                  <th>Reliability</th>
                  <th>PF</th>
                  <th>Total Pips</th>
                  <th>Avg Pips</th>
                  <th>Max DD</th>
                  <th>OOS Profit</th>
                  <th>OOS Retention</th>
                  <th>MC P10 Profit</th>
                  <th>MC Worst DD</th>
                  <th>Best Regime</th>
                  <th>Trades</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((decision) => (
                  <tr key={decision.result.logicId}>
                    <td><AiStatusBadge status={decision.status} /></td>
                    <td className="font-bold">{decision.result.logicName}</td>
                    <td className="font-black">{decision.aiScore}/100</td>
                    <td>{decision.result.validation?.score ?? 0}/100</td>
                    <td>{decision.result.profitFactor.toFixed(2)}</td>
                    <td className={sumPips(decision.result.trades) >= 0 ? 'profit' : 'loss'}>{sumPips(decision.result.trades).toFixed(1)} pips</td>
                    <td>{averagePips(decision.result.trades).toFixed(1)} pips</td>
                    <td>{formatMoney(decision.result.maxDrawdown)}</td>
                    <td className={decision.result.validation.outOfSample.outOfSample.netProfit >= 0 ? 'profit' : 'loss'}>
                      {formatMoney(decision.result.validation.outOfSample.outOfSample.netProfit)}
                    </td>
                    <td>{decision.result.validation.outOfSample.retentionRate.toFixed(0)}%</td>
                    <td className={decision.result.validation.monteCarlo.profitP10 >= 0 ? 'profit' : 'loss'}>
                      {formatMoney(decision.result.validation.monteCarlo.profitP10)}
                    </td>
                    <td>{formatMoney(decision.result.validation.monteCarlo.worstMaxDrawdown)}</td>
                    <td>{decision.bestRegime}</td>
                    <td>{decision.result.tradeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No logic decisions yet" body="AI Selector needs backtest results with Ver3.4 validation metrics." />
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="section-heading">Adoption Reasons</h2>
          <div className="mt-5 grid gap-3">
            {decisions.map((decision) => (
              <article key={`${decision.result.logicId}-reason`} className="bridge-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="bridge-title">{decision.result.logicName}</p>
                  <AiStatusBadge status={decision.status} />
                </div>
                <p className="bridge-copy">{decision.comment}</p>
                <ul className="quality-list">
                  {decision.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="section-heading">Rejected / Watch Reasons</h2>
          <div className="mt-5 grid gap-3">
            {[...watch, ...rejected].map((decision) => (
              <article key={`${decision.result.logicId}-reject`} className="bridge-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="bridge-title">{decision.result.logicName}</p>
                  <AiStatusBadge status={decision.status} />
                </div>
                <ul className="quality-list">
                  {decision.rejectionReasons.map((reason) => (
                    <li key={reason} className={decision.status === 'Reject' ? 'quality-error-text' : 'quality-warning-text'}>{reason}</li>
                  ))}
                </ul>
              </article>
            ))}
            {watch.length + rejected.length === 0 && (
              <EmptyState title="No excluded logics" body="All evaluated logics are currently adoption candidates." />
            )}
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="section-heading">Market Regime Suitability</h2>
        {results.length > 0 ? <MarketRegimeTable results={results} /> : <EmptyState title="No regime data" body="Run backtests to classify regime fit." />}
      </section>
    </div>
  );
}

function AiStatusBadge({ status }: { status: AiAdoptionStatus }) {
  const className =
    status === 'Adopt'
      ? 'reliability-badge reliability-high'
      : status === 'Watch'
        ? 'reliability-badge reliability-medium'
        : 'reliability-badge reliability-low';
  return <span className={className}>{status}</span>;
}

function Backtest({
  results,
  trades,
  candles,
  logics,
  settings,
  fileName,
  zeroPresets,
  onApplyZeroPreset,
  onCreateZeroVariant,
  onDeleteZeroPreset,
  onImportZeroPresets,
  onSaveZeroPreset,
}: {
  results: BacktestResult[];
  trades: Trade[];
  candles: Candle[];
  logics: LogicDefinition[];
  settings: BacktestSettings;
  fileName: string;
  zeroPresets: ZeroPreset[];
  onApplyZeroPreset: (preset: ZeroPreset) => void;
  onCreateZeroVariant: (result: BacktestResult, stat: ZeroOptimizationStat) => void;
  onDeleteZeroPreset: (id: string) => void;
  onImportZeroPresets: (presets: ZeroPreset[]) => void;
  onSaveZeroPreset: (preset: Omit<ZeroPreset, 'id' | 'createdAt'>) => void;
}) {
  const [reportLogicId, setReportLogicId] = useState(results[0]?.logicId ?? '');
  const selectedReport = results.find((result) => result.logicId === reportLogicId) ?? results[0];

  useEffect(() => {
    if (!reportLogicId && results[0]) setReportLogicId(results[0].logicId);
  }, [reportLogicId, results]);

  return (
    <div className="grid gap-5">
      <section className="panel p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-heading">Backtest</h2>
            <p className="text-sm text-slate-500">{settings.pair} {settings.timeframe} / Export and report ready</p>
          </div>
        </div>
        {results.length > 0 ? (
          <>
            <ExportPanel results={results} trades={trades} logics={logics} settings={settings} fileName={fileName} zeroPresets={zeroPresets} />
            <ResultTable results={results} />
            <ZeroVariantComparison results={results} logics={logics} />
            <ZeroPresetBuilder
              results={results}
              logics={logics}
              presets={zeroPresets}
              settings={settings}
              onApplyPreset={onApplyZeroPreset}
              onDeletePreset={onDeleteZeroPreset}
              onImportPresets={onImportZeroPresets}
              onSavePreset={onSaveZeroPreset}
            />
            <ZeroPresetPerformance
              results={results}
              logics={logics}
              presets={zeroPresets}
              onApplyPreset={onApplyZeroPreset}
            />
            <ZeroPresetReplay
              candles={candles}
              logics={logics}
              presets={zeroPresets}
              settings={settings}
            />
            <ZeroPresetReplayRanking
              candles={candles}
              logics={logics}
              presets={zeroPresets}
              settings={settings}
              onApplyPreset={onApplyZeroPreset}
            />
            <ZeroPresetReport
              candles={candles}
              logics={logics}
              presets={zeroPresets}
              settings={settings}
              onApplyPreset={onApplyZeroPreset}
            />
          </>
        ) : (
          <EmptyState
            title="バックテスト結果がありません"
            body="CSVを読み込み、有効なロジックをONにすると検証結果がここに表示されます。"
          />
        )}
      </section>

      <section className="panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-heading">Validation Report</h2>
            <p className="text-sm text-slate-500">Show a client-ready report for one selected logic.</p>
          </div>
          <Field label="Report Logic">
            <select className="form-input min-w-56" value={selectedReport?.logicId ?? ''} onChange={(event) => setReportLogicId(event.target.value)}>
              {results.map((result) => (
                <option key={result.logicId} value={result.logicId}>
                  {result.logicName}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {selectedReport ? (
          <ValidationReport result={selectedReport} onCreateZeroVariant={onCreateZeroVariant} />
        ) : (
          <EmptyState title="レポート対象がありません" body="ランキングに表示されるロジックが生成されると、検証レポートを表示できます。" />
        )}
      </section>

      <section className="panel p-5">
        <h2 className="section-heading">Top 5 Comparison</h2>
        {results.length > 0 ? (
          <ComparisonReport results={results.slice(0, 5)} />
        ) : (
          <EmptyState title="比較データがありません" body="複数ロジックを有効化してバックテストすると、上位5件の比較表が表示されます。" />
        )}
      </section>
    </div>
  );
}

function ExportPanel({
  results,
  trades,
  logics,
  settings,
  fileName,
  zeroPresets,
}: {
  results: BacktestResult[];
  trades: Trade[];
  logics: LogicDefinition[];
  settings: BacktestSettings;
  fileName: string;
  zeroPresets: ZeroPreset[];
}) {
  const exportPayload = { exportedAt: new Date().toISOString(), fileName, settings, results };

  return (
    <div className="mt-5 rounded-md border border-line bg-slate-50 p-4">
      <h3 className="font-black">Export</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="secondary-button" onClick={() => downloadText('backtest-results.csv', toCsv(resultRows(results)))}>
          Results CSV
        </button>
        <button className="secondary-button" onClick={() => downloadJson('backtest-results.json', exportPayload)}>
          Results JSON
        </button>
        <button className="secondary-button" onClick={() => downloadText('trade-history.csv', toCsv(tradeRows(trades)))}>
          Trade History CSV
        </button>
        <button className="secondary-button" onClick={() => downloadText('zero-condition-analysis.csv', toCsv(conditionRows(results)))}>
          ZERO Condition CSV
        </button>
        <button className="secondary-button" onClick={() => downloadText('zero-condition-optimizer.csv', toCsv(optimizationRows(results)))}>
          ZERO Optimizer CSV
        </button>
        <button className="secondary-button" onClick={() => downloadText('zero-variant-comparison.csv', toCsv(variantRows(results, logics)))}>
          ZERO Variant CSV
        </button>
        <button className="secondary-button" onClick={() => downloadText('zero-preset-performance.csv', toCsv(presetPerformanceRows(zeroPresets, results, logics)))}>
          ZERO Preset CSV
        </button>
        <button className="secondary-button" onClick={() => downloadJson('logic-settings.json', { exportedAt: new Date().toISOString(), logics })}>
          Logic JSON
        </button>
      </div>
    </div>
  );
}

function ValidationReport({ result, onCreateZeroVariant }: { result: BacktestResult; onCreateZeroVariant: (result: BacktestResult, stat: ZeroOptimizationStat) => void }) {
  return (
    <div className="mt-5 grid gap-5">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Reliability" value={result.reliability ?? 'Medium'} />
        <Metric label="Reliability Score" value={`${result.validation?.score ?? 0}/100`} />
        <Metric label="Win Rate" value={`${result.winRate.toFixed(1)}%`} />
        <Metric label="PF" value={result.profitFactor.toFixed(2)} />
        <Metric label="Max DD" value={formatMoney(result.maxDrawdown)} />
        <Metric label="Expectancy" value={formatMoney(result.analytics.expectancy)} />
        <Metric label="Sharpe" value={formatRatio(result.analytics.sharpeRatio)} />
        <Metric label="Recovery" value={formatRatio(result.analytics.recoveryFactor)} />
        <Metric label="Payoff" value={formatRatio(result.analytics.payoffRatio)} />
        <Metric label="Net Profit" value={formatMoney(result.netProfit)} />
        <Metric label="Trades" value={result.tradeCount} />
        <Metric label="Avg Hold" value={formatRatio(result.analytics.averageHoldingBars)} />
        <Metric label="Max Floating Loss" value={formatMoney(result.analytics.maxFloatingLoss)} />
        <Metric label="Max Single Loss" value={formatMoney(result.analytics.maxSingleLoss)} />
        <Metric label="Max Single Profit" value={formatMoney(result.analytics.maxSingleProfit)} />
        <Metric label="Max Wins" value={result.analytics.maxConsecutiveWins} />
        <Metric label="Max Losses" value={result.analytics.maxConsecutiveLosses} />
      </div>
      <ReliabilityWarnings warnings={result.warnings ?? []} />
      <ZeroConditionAnalysis stats={result.analytics.zeroConditionStats ?? []} />
      <ZeroOptimizationAnalysis stats={result.analytics.zeroOptimizationStats ?? []} onCreateVariant={(stat) => onCreateZeroVariant(result, stat)} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="font-black">Monthly Profit</h3>
          <BarChart points={result.analytics.monthlyProfits} />
        </div>
        <AnalysisPanel title="Weekday Win Rate" stats={result.analytics.weekdayWinRates} />
        <div className="lg:col-span-2">
          <AnalysisPanel title="Hourly Win Rate" stats={result.analytics.hourlyWinRates} compact />
        </div>
      </div>
    </div>
  );
}

function ComparisonReport({ results }: { results: BacktestResult[] }) {
  return (
    <div className="table-wrap mt-5">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Logic</th>
            <th>Reliability</th>
            <th>Reliability Score</th>
            <th>Win Rate</th>
            <th>PF</th>
            <th>Recovery</th>
            <th>Expectancy</th>
            <th>Max DD</th>
            <th>Net Profit</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <tr key={result.logicId}>
              <td>{index + 1}</td>
              <td className="font-bold">{result.logicName}</td>
              <td><ReliabilityBadge label={result.reliability} /></td>
              <td>{result.validation?.score ?? 0}/100</td>
              <td>{result.winRate.toFixed(1)}%</td>
              <td>{result.profitFactor.toFixed(2)}</td>
              <td>{formatRatio(result.analytics.recoveryFactor)}</td>
              <td>{formatMoney(result.analytics.expectancy)}</td>
              <td>{formatMoney(result.maxDrawdown)}</td>
              <td className={result.netProfit >= 0 ? 'profit' : 'loss'}>{formatMoney(result.netProfit)}</td>
              <td className="font-black">{result.score.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ZeroVariantComparison({ results, logics }: { results: BacktestResult[]; logics: LogicDefinition[] }) {
  const rows = createZeroVariantComparisonRows(results, logics);
  if (rows.length === 0) return null;

  return (
    <div className="mt-5 rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-black">ZERO Variant Comparison</h3>
          <p className="text-sm text-slate-500">Compare original ZERO and saved variants using the same CSV and settings.</p>
        </div>
        <span className="status-pill">{rows.length} ZERO logics</span>
      </div>
      <div className="table-wrap mt-4">
        <table>
          <thead>
            <tr>
              <th>Decision</th>
              <th>Logic</th>
              <th>OFF Conditions</th>
              <th>Trades</th>
              <th>Win Rate</th>
              <th>PF</th>
              <th>Net Profit</th>
              <th>Delta Profit</th>
              <th>Max DD</th>
              <th>Delta DD</th>
              <th>Score</th>
              <th>Delta Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.result.logicId}>
                <td><VariantDecisionBadge decision={row.decision} /></td>
                <td className="font-bold">{row.result.logicName}</td>
                <td>{row.disabledLabel}</td>
                <td>{row.result.tradeCount}</td>
                <td>{row.result.winRate.toFixed(1)}% ({formatSignedRatio(row.deltaWinRate)})</td>
                <td>{formatRatio(row.result.profitFactor)} ({formatSignedRatio(row.deltaProfitFactor)})</td>
                <td className={row.result.netProfit >= 0 ? 'profit' : 'loss'}>{formatMoney(row.result.netProfit)}</td>
                <td className={row.deltaNetProfit >= 0 ? 'profit' : 'loss'}>{formatSignedMoney(row.deltaNetProfit)}</td>
                <td>{formatMoney(row.result.maxDrawdown)}</td>
                <td className={row.deltaMaxDrawdown <= 0 ? 'profit' : 'loss'}>{formatSignedMoney(row.deltaMaxDrawdown)}</td>
                <td>{row.result.score.toFixed(1)}</td>
                <td className={row.deltaScore >= 0 ? 'profit' : 'loss'}>{formatSignedRatio(row.deltaScore)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VariantDecisionBadge({ decision }: { decision: ZeroVariantComparisonRow['decision'] }) {
  const className =
    decision === 'Adopt' || decision === 'Base'
      ? 'reliability-badge reliability-high'
      : decision === 'Watch'
        ? 'reliability-badge reliability-medium'
        : 'reliability-badge reliability-low';
  return <span className={className}>{decision}</span>;
}

function ZeroPresetBuilder({
  results,
  logics,
  presets,
  settings,
  onApplyPreset,
  onDeletePreset,
  onImportPresets,
  onSavePreset,
}: {
  results: BacktestResult[];
  logics: LogicDefinition[];
  presets: ZeroPreset[];
  settings: BacktestSettings;
  onApplyPreset: (preset: ZeroPreset) => void;
  onDeletePreset: (id: string) => void;
  onImportPresets: (presets: ZeroPreset[]) => void;
  onSavePreset: (preset: Omit<ZeroPreset, 'id' | 'createdAt'>) => void;
}) {
  const rows = createZeroVariantComparisonRows(results, logics);
  const candidateRows = rows.filter((row) => row.decision !== 'Reject' && row.result.tradeCount > 0);
  const defaultSelected = candidateRows.filter((row) => row.decision === 'Adopt').map((row) => row.result.logicId);
  const fallbackSelected = defaultSelected.length > 0 ? defaultSelected : candidateRows.filter((row) => row.decision === 'Base').map((row) => row.result.logicId);
  const [selectedLogicIds, setSelectedLogicIds] = useState<string[]>(fallbackSelected);
  const [mode, setMode] = useState<ZeroPresetMode>('ZERO PRO Candidate');
  const [name, setName] = useState('ZERO PRO Candidate');
  const [notes, setNotes] = useState('Adopt variants selected from ZERO Variant Comparison.');

  useEffect(() => {
    if (selectedLogicIds.length === 0 && fallbackSelected.length > 0) setSelectedLogicIds(fallbackSelected);
  }, [fallbackSelected.join('|'), selectedLogicIds.length]);

  if (rows.length === 0) return null;

  function toggleLogic(id: string) {
    setSelectedLogicIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function savePreset() {
    if (selectedLogicIds.length === 0) {
      window.alert('Select at least one ZERO logic.');
      return;
    }
    onSavePreset({
      name: name.trim() || mode,
      mode,
      pair: settings.pair,
      timeframe: settings.timeframe,
      logicIds: selectedLogicIds,
      notes,
    });
  }

  async function importPresetJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const imported = normalizeZeroPresets(Array.isArray(parsed) ? parsed : parsed.presets);
      if (imported.length === 0) throw new Error('No presets found.');
      onImportPresets(imported);
    } catch {
      window.alert('ZERO preset JSON import failed.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <div className="mt-5 rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-black">ZERO Preset Builder</h3>
          <p className="text-sm text-slate-500">Bundle Adopt/Watch variants into a reusable ZERO preset and apply it to enabled ZERO logics.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="secondary-button" onClick={() => setSelectedLogicIds(defaultSelected)}>Select Adopt</button>
          <button className="secondary-button" onClick={() => setSelectedLogicIds(candidateRows.map((row) => row.result.logicId))}>Select Candidates</button>
          <button className="secondary-button" onClick={() => downloadJson('zero-presets.json', { exportedAt: new Date().toISOString(), presets })}>Export Presets</button>
          <label className="secondary-button cursor-pointer">
            Import Presets
            <input className="hidden" type="file" accept=".json,application/json" onChange={importPresetJson} />
          </label>
        </div>
      </div>

      <div className="settings-grid mt-4">
        <Field label="Preset Name">
          <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Preset Mode">
          <select className="form-input" value={mode} onChange={(event) => setMode(event.target.value as ZeroPresetMode)}>
            <option value="ZERO PRO Candidate">ZERO PRO Candidate</option>
            <option value="ZERO Conservative">ZERO Conservative</option>
            <option value="ZERO Aggressive">ZERO Aggressive</option>
            <option value="Pair Specific">Pair Specific</option>
          </select>
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Notes">
          <textarea className="form-input form-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
      </div>

      <div className="table-wrap mt-4">
        <table>
          <thead>
            <tr>
              <th>Use</th>
              <th>Decision</th>
              <th>Logic</th>
              <th>OFF Conditions</th>
              <th>PF</th>
              <th>Net Profit</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {candidateRows.length > 0 ? (
              candidateRows.map((row) => (
                <tr key={row.result.logicId}>
                  <td><input type="checkbox" checked={selectedLogicIds.includes(row.result.logicId)} onChange={() => toggleLogic(row.result.logicId)} /></td>
                  <td><VariantDecisionBadge decision={row.decision} /></td>
                  <td className="font-bold">{row.result.logicName}</td>
                  <td>{row.disabledLabel}</td>
                  <td>{formatRatio(row.result.profitFactor)}</td>
                  <td className={row.result.netProfit >= 0 ? 'profit' : 'loss'}>{formatMoney(row.result.netProfit)}</td>
                  <td>{row.result.score.toFixed(1)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>No tradable ZERO candidates. Run more data or tune ZERO conditions before saving a preset.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="command-button" onClick={savePreset}>Save Preset</button>
        <span className="status-pill">{selectedLogicIds.length} selected</span>
      </div>

      <div className="mt-5">
        <h4 className="font-black">Saved Presets</h4>
        {presets.length > 0 ? (
          <div className="table-wrap mt-3">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mode</th>
                  <th>Pair / TF</th>
                  <th>Logics</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {presets.map((preset) => (
                  <tr key={preset.id}>
                    <td className="font-bold">{preset.name}</td>
                    <td>{preset.mode}</td>
                    <td>{preset.pair} {preset.timeframe}</td>
                    <td>{preset.logicIds.length}</td>
                    <td>{formatDateTimeLabel(preset.createdAt)}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button className="mini-button" onClick={() => onApplyPreset(preset)}>Apply</button>
                        <button className="mini-button danger" onClick={() => onDeletePreset(preset.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No ZERO presets yet" body="Select candidate ZERO variants and save a preset." />
        )}
      </div>
    </div>
  );
}

function ZeroPresetPerformance({
  results,
  logics,
  presets,
  onApplyPreset,
}: {
  results: BacktestResult[];
  logics: LogicDefinition[];
  presets: ZeroPreset[];
  onApplyPreset: (preset: ZeroPreset) => void;
}) {
  const rows = createZeroPresetPerformanceRows(presets, results, logics);

  return (
    <div className="mt-5 rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-black">ZERO Preset Performance</h3>
          <p className="text-sm text-slate-500">Compare saved ZERO presets by combined trades, score, drawdown, and current enabled ZERO setup.</p>
        </div>
        <span className="status-pill">{rows.length} presets tested</span>
      </div>

      {presets.length === 0 ? (
        <EmptyState title="No ZERO presets yet" body="Save a preset from ZERO Preset Builder, then compare it here." />
      ) : rows.length === 0 ? (
        <EmptyState title="Preset performance is not ready" body="Run a backtest with ZERO logics that exist in the saved presets." />
      ) : (
        <div className="table-wrap mt-4">
          <table>
            <thead>
              <tr>
                <th>Decision</th>
                <th>Preset</th>
                <th>Mode</th>
                <th>Pair / TF</th>
                <th>Logics</th>
                <th>Missing</th>
                <th>Trades</th>
                <th>Win Rate</th>
                <th>PF</th>
                <th>Expectancy</th>
                <th>Recovery</th>
                <th>Net Profit</th>
                <th>Delta Profit</th>
                <th>Max DD</th>
                <th>Delta DD</th>
                <th>Score</th>
                <th>Delta Score</th>
                <th>Reliability</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.preset.id}>
                  <td><PresetDecisionBadge decision={row.decision} /></td>
                  <td className="font-bold">{row.preset.name}</td>
                  <td>{row.preset.mode}</td>
                  <td>{row.preset.pair} {row.preset.timeframe}</td>
                  <td title={row.logicNames.join(' / ')}>{formatLogicNameList(row.logicNames)}</td>
                  <td className={row.missingLogicIds.length > 0 ? 'loss' : ''}>{row.missingLogicIds.length > 0 ? row.missingLogicIds.length : '-'}</td>
                  <td>{row.trades}</td>
                  <td>{row.winRate.toFixed(1)}%</td>
                  <td>{formatRatio(row.profitFactor)}</td>
                  <td>{formatMoney(row.expectancy)}</td>
                  <td>{formatRatio(row.recoveryFactor)}</td>
                  <td className={row.netProfit >= 0 ? 'profit' : 'loss'}>{formatMoney(row.netProfit)}</td>
                  <td className={row.deltaNetProfit >= 0 ? 'profit' : 'loss'}>{formatSignedMoney(row.deltaNetProfit)}</td>
                  <td>{formatMoney(row.maxDrawdown)}</td>
                  <td className={row.deltaMaxDrawdown <= 0 ? 'profit' : 'loss'}>{formatSignedMoney(row.deltaMaxDrawdown)}</td>
                  <td>{row.score.toFixed(1)}</td>
                  <td className={row.deltaScore >= 0 ? 'profit' : 'loss'}>{formatSignedRatio(row.deltaScore)}</td>
                  <td>{row.reliabilityScore.toFixed(0)}/100</td>
                  <td>
                    <button className="mini-button" disabled={row.decision === 'Current'} onClick={() => onApplyPreset(row.preset)}>
                      Apply
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PresetDecisionBadge({ decision }: { decision: ZeroPresetDecision }) {
  const className =
    decision === 'Adopt' || decision === 'Current'
      ? 'reliability-badge reliability-high'
      : decision === 'Watch'
        ? 'reliability-badge reliability-medium'
        : 'reliability-badge reliability-low';
  return <span className={className}>{decision}</span>;
}

function ZeroPresetReplay({
  candles,
  logics,
  presets,
  settings,
}: {
  candles: Candle[];
  logics: LogicDefinition[];
  presets: ZeroPreset[];
  settings: BacktestSettings;
}) {
  const [selectedPresetId, setSelectedPresetId] = useState(presets[0]?.id ?? '');
  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId) ?? presets[0];
  const replayResults = useMemo(() => (
    selectedPreset ? runBacktests(candles, createPresetReplayLogics(selectedPreset, logics), settings) : []
  ), [candles, logics, selectedPreset, settings]);
  const replayTrades = useMemo(() => replayResults.flatMap((result) => result.trades), [replayResults]);
  const replaySummary = useMemo(() => summarizeReplayResults(replayResults), [replayResults]);

  useEffect(() => {
    if (!selectedPresetId && presets[0]) setSelectedPresetId(presets[0].id);
    if (selectedPresetId && presets.length > 0 && !presets.some((preset) => preset.id === selectedPresetId)) setSelectedPresetId(presets[0].id);
  }, [presets, selectedPresetId]);

  return (
    <div className="mt-5 rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-black">ZERO Preset Backtest Replay</h3>
          <p className="text-sm text-slate-500">Run a temporary backtest using only the selected preset. It does not change enabled logics.</p>
        </div>
        {replayResults.length > 0 && (
          <button className="secondary-button" onClick={() => downloadText('zero-preset-replay.csv', toCsv(resultRows(replayResults)))}>
            Replay CSV
          </button>
        )}
      </div>

      {presets.length === 0 ? (
        <EmptyState title="No preset to replay" body="Save a ZERO preset first, then replay it against the current CSV and settings." />
      ) : candles.length === 0 ? (
        <EmptyState title="No candle data" body="Load CSV data before running a preset replay." />
      ) : (
        <>
          <div className="settings-grid mt-4">
            <Field label="Replay Preset">
              <select className="form-input" value={selectedPreset?.id ?? ''} onChange={(event) => setSelectedPresetId(event.target.value)}>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </Field>
            <Metric label="Preset Mode" value={selectedPreset?.mode ?? '-'} />
            <Metric label="Pair / TF" value={selectedPreset ? `${selectedPreset.pair} ${selectedPreset.timeframe}` : '-'} />
            <Metric label="Logic Count" value={selectedPreset?.logicIds.length ?? 0} />
          </div>

          {replayResults.length > 0 ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <Metric label="Replay Trades" value={replaySummary.trades} />
                <Metric label="Replay Win Rate" value={`${replaySummary.winRate.toFixed(1)}%`} />
                <Metric label="Replay PF" value={formatRatio(replaySummary.profitFactor)} />
                <Metric label="Replay Net Profit" value={formatMoney(replaySummary.netProfit)} />
                <Metric label="Replay Max DD" value={formatMoney(replaySummary.maxDrawdown)} />
                <Metric label="Replay Score" value={replaySummary.score.toFixed(1)} />
              </div>
              <ResultTable results={replayResults} />
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="secondary-button" onClick={() => downloadText('zero-preset-replay-trades.csv', toCsv(tradeRows(replayTrades)))}>
                  Replay Trades CSV
                </button>
                <span className="status-pill">{replayTrades.length} replay trades</span>
              </div>
            </>
          ) : (
            <EmptyState title="Replay result is empty" body="The selected preset has no matching ZERO logic, or the current CSV period produced no trades." />
          )}
        </>
      )}
    </div>
  );
}

function ZeroPresetReplayRanking({
  candles,
  logics,
  presets,
  settings,
  onApplyPreset,
}: {
  candles: Candle[];
  logics: LogicDefinition[];
  presets: ZeroPreset[];
  settings: BacktestSettings;
  onApplyPreset: (preset: ZeroPreset) => void;
}) {
  const [sortBy, setSortBy] = useState<'score' | 'netProfit' | 'profitFactor' | 'winRate' | 'maxDrawdown' | 'trades'>('score');
  const rows = useMemo(() => createZeroPresetReplayRankingRows(presets, candles, logics, settings, sortBy), [candles, logics, presets, settings, sortBy]);

  return (
    <div className="mt-5 rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="font-black">ZERO Replay Ranking</h3>
          <p className="text-sm text-slate-500">Replay every saved ZERO preset against the current CSV and rank the preset itself.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="form-input w-auto min-w-44" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
            <option value="score">Sort: Score</option>
            <option value="netProfit">Sort: Net Profit</option>
            <option value="profitFactor">Sort: PF</option>
            <option value="winRate">Sort: Win Rate</option>
            <option value="maxDrawdown">Sort: Max DD</option>
            <option value="trades">Sort: Trades</option>
          </select>
          <button className="secondary-button" disabled={rows.length === 0} onClick={() => downloadText('zero-replay-ranking.csv', toCsv(replayRankingRows(rows)))}>
            Ranking CSV
          </button>
        </div>
      </div>

      {presets.length === 0 ? (
        <EmptyState title="No presets to rank" body="Save multiple ZERO presets, then compare them here." />
      ) : candles.length === 0 ? (
        <EmptyState title="No candle data" body="Load CSV data before replay-ranking presets." />
      ) : rows.length === 0 ? (
        <EmptyState title="No replay rows" body="Saved presets did not produce replayable ZERO logic results." />
      ) : (
        <div className="table-wrap mt-4">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Decision</th>
                <th>Preset</th>
                <th>Mode</th>
                <th>Pair / TF</th>
                <th>Top Logic</th>
                <th>Results</th>
                <th>Missing</th>
                <th>Trades</th>
                <th>Win Rate</th>
                <th>PF</th>
                <th>Expectancy</th>
                <th>Recovery</th>
                <th>Net Profit</th>
                <th>Max DD</th>
                <th>Score</th>
                <th>Reliability</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.preset.id}>
                  <td><span className="rank-badge">{row.rank}</span></td>
                  <td><PresetDecisionBadge decision={row.decision} /></td>
                  <td className="font-bold">{row.preset.name}</td>
                  <td>{row.preset.mode}</td>
                  <td>{row.preset.pair} {row.preset.timeframe}</td>
                  <td>{row.topLogicName}</td>
                  <td>{row.resultCount}</td>
                  <td className={row.missingLogicIds.length > 0 ? 'loss' : ''}>{row.missingLogicIds.length > 0 ? row.missingLogicIds.length : '-'}</td>
                  <td>{row.trades}</td>
                  <td>{row.winRate.toFixed(1)}%</td>
                  <td>{formatRatio(row.profitFactor)}</td>
                  <td>{formatMoney(row.expectancy)}</td>
                  <td>{formatRatio(row.recoveryFactor)}</td>
                  <td className={row.netProfit >= 0 ? 'profit' : 'loss'}>{formatMoney(row.netProfit)}</td>
                  <td>{formatMoney(row.maxDrawdown)}</td>
                  <td className="font-black">{row.score.toFixed(1)}</td>
                  <td>{row.reliabilityScore.toFixed(0)}/100</td>
                  <td>
                    <button className="mini-button" disabled={row.decision === 'Current'} onClick={() => onApplyPreset(row.preset)}>
                      Apply
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ZeroPresetReport({
  candles,
  logics,
  presets,
  settings,
  onApplyPreset,
}: {
  candles: Candle[];
  logics: LogicDefinition[];
  presets: ZeroPreset[];
  settings: BacktestSettings;
  onApplyPreset: (preset: ZeroPreset) => void;
}) {
  const rankingRows = useMemo(() => createZeroPresetReplayRankingRows(presets, candles, logics, settings, 'score'), [candles, logics, presets, settings]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const selectedRow = rankingRows.find((row) => row.preset.id === selectedPresetId) ?? rankingRows.find((row) => row.decision === 'Adopt') ?? rankingRows[0];
  const selectedPreset = selectedRow?.preset;
  const reportResults = useMemo(() => (
    selectedPreset ? runBacktests(candles, createPresetReplayLogics(selectedPreset, logics), settings) : []
  ), [candles, logics, selectedPreset, settings]);
  const reportTrades = useMemo(() => reportResults.flatMap((result) => result.trades), [reportResults]);
  const reportSummary = useMemo(() => summarizeReplayResults(reportResults), [reportResults]);
  const monthlyProfit = useMemo(() => aggregateTradeProfitByMonth(reportTrades), [reportTrades]);
  const reportNotes = useMemo(() => createPresetReportNotes(reportSummary, reportResults, selectedRow), [reportResults, reportSummary, selectedRow]);

  useEffect(() => {
    if (!selectedPresetId && rankingRows[0]) setSelectedPresetId((rankingRows.find((row) => row.decision === 'Adopt') ?? rankingRows[0]).preset.id);
    if (selectedPresetId && rankingRows.length > 0 && !rankingRows.some((row) => row.preset.id === selectedPresetId)) setSelectedPresetId(rankingRows[0].preset.id);
  }, [rankingRows, selectedPresetId]);

  return (
    <div className="mt-5 rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="font-black">ZERO Preset Report</h3>
          <p className="text-sm text-slate-500">Create a client-ready report from the selected preset replay.</p>
        </div>
        {selectedPreset && (
          <div className="flex flex-wrap gap-2">
            <button className="secondary-button" onClick={() => downloadJson('zero-preset-report.json', createPresetReportPayload(selectedPreset, settings, reportSummary, reportResults, reportTrades, selectedRow))}>
              Report JSON
            </button>
            <button className="secondary-button" onClick={() => downloadText('zero-preset-report-trades.csv', toCsv(tradeRows(reportTrades)))}>
              Report Trades CSV
            </button>
            <button className="command-button" onClick={() => onApplyPreset(selectedPreset)}>
              Apply Preset
            </button>
          </div>
        )}
      </div>

      {presets.length === 0 ? (
        <EmptyState title="No preset report yet" body="Save a ZERO preset, then generate a report here." />
      ) : candles.length === 0 ? (
        <EmptyState title="No candle data" body="Load CSV data before generating a preset report." />
      ) : !selectedPreset ? (
        <EmptyState title="Report target missing" body="The selected preset no longer exists." />
      ) : (
        <>
          <div className="settings-grid mt-4">
            <Field label="Report Preset">
              <select className="form-input" value={selectedPreset.id} onChange={(event) => setSelectedPresetId(event.target.value)}>
                {rankingRows.map((row) => (
                  <option key={row.preset.id} value={row.preset.id}>
                    #{row.rank} {row.preset.name}
                  </option>
                ))}
              </select>
            </Field>
            <Metric label="Decision" value={selectedRow?.decision ?? '-'} />
            <Metric label="Mode" value={selectedPreset.mode} />
            <Metric label="Pair / TF" value={`${settings.pair} ${settings.timeframe}`} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Metric label="Trades" value={reportSummary.trades} />
            <Metric label="Win Rate" value={`${reportSummary.winRate.toFixed(1)}%`} />
            <Metric label="PF" value={formatRatio(reportSummary.profitFactor)} />
            <Metric label="Expectancy" value={formatMoney(reportSummary.expectancy)} />
            <Metric label="Recovery" value={formatRatio(reportSummary.recoveryFactor)} />
            <Metric label="Net Profit" value={formatMoney(reportSummary.netProfit)} />
            <Metric label="Max DD" value={formatMoney(reportSummary.maxDrawdown)} />
            <Metric label="Score" value={reportSummary.score.toFixed(1)} />
            <Metric label="Reliability" value={`${reportSummary.reliabilityScore.toFixed(0)}/100`} />
            <Metric label="Top Logic" value={selectedRow?.topLogicName ?? '-'} />
            <Metric label="Preset Logics" value={selectedPreset.logicIds.length} />
            <Metric label="Missing" value={selectedRow?.missingLogicIds.length ?? 0} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-md border border-line bg-slate-50 p-4">
              <h4 className="font-black">Report Notes</h4>
              <div className="mt-3 grid gap-2">
                {reportNotes.map((note) => (
                  <p key={note} className="text-sm font-semibold text-slate-400">{note}</p>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-black">Monthly Profit</h4>
              {monthlyProfit.length > 0 ? <BarChart points={monthlyProfit} /> : <EmptyState title="No monthly profit" body="No replay trades were generated for this preset." />}
            </div>
          </div>

          <div className="table-wrap mt-5">
            <table>
              <thead>
                <tr>
                  <th>Logic</th>
                  <th>Reliability</th>
                  <th>Trades</th>
                  <th>Win Rate</th>
                  <th>PF</th>
                  <th>Recovery</th>
                  <th>Net Profit</th>
                  <th>Max DD</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {reportResults.map((result) => (
                  <tr key={result.logicId}>
                    <td className="font-bold">{result.logicName}</td>
                    <td><ReliabilityBadge label={result.reliability} /></td>
                    <td>{result.tradeCount}</td>
                    <td>{result.winRate.toFixed(1)}%</td>
                    <td>{formatRatio(result.profitFactor)}</td>
                    <td>{formatRatio(result.analytics.recoveryFactor)}</td>
                    <td className={result.netProfit >= 0 ? 'profit' : 'loss'}>{formatMoney(result.netProfit)}</td>
                    <td>{formatMoney(result.maxDrawdown)}</td>
                    <td className="font-black">{result.score.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ZeroConditionAnalysis({ stats }: { stats: ZeroConditionStat[] }) {
  if (stats.length === 0) {
    return (
      <div className="rounded-md border border-line bg-white p-4">
        <h3 className="font-black">ZERO Condition Performance</h3>
        <EmptyState title="No ZERO condition stats yet" body="Run ZERO Logic trades to compare S/A condition win rate, PF, expectancy, and average score." />
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-black">ZERO Condition Performance</h3>
          <p className="text-sm text-slate-500">Compare which S/A conditions actually contributed to the tested trades.</p>
        </div>
        <span className="status-pill">{stats.length} conditions</span>
      </div>
      <div className="table-wrap mt-4">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Condition</th>
              <th>Trades</th>
              <th>Win Rate</th>
              <th>PF</th>
              <th>Expectancy</th>
              <th>Net Profit</th>
              <th>Avg Score</th>
              <th>Avg Pips</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr key={`${stat.rank}-${stat.label}`}>
                <td className="font-black">{stat.rank}</td>
                <td className="font-bold">{stat.label}</td>
                <td>{stat.trades}</td>
                <td>{stat.winRate.toFixed(1)}%</td>
                <td>{formatRatio(stat.profitFactor)}</td>
                <td>{formatMoney(stat.expectancy)}</td>
                <td className={stat.netProfit >= 0 ? 'profit' : 'loss'}>{formatMoney(stat.netProfit)}</td>
                <td>{stat.averageScore.toFixed(1)}</td>
                <td>{stat.averagePips.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ZeroOptimizationAnalysis({ stats, onCreateVariant }: { stats: ZeroOptimizationStat[]; onCreateVariant: (stat: ZeroOptimizationStat) => void }) {
  if (stats.length === 0) {
    return (
      <div className="rounded-md border border-line bg-white p-4">
        <h3 className="font-black">ZERO Condition Optimizer</h3>
        <EmptyState title="No optimization comparison yet" body="Run a ZERO Logic backtest with enough candles and trades to compare condition ON/OFF variants." />
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-black">ZERO Condition Optimizer</h3>
          <p className="text-sm text-slate-500">Each row reruns ZERO with one condition removed and compares it with the baseline.</p>
        </div>
        <span className="status-pill">{stats.length} variants</span>
      </div>
      <div className="table-wrap mt-4">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Without</th>
              <th>Decision</th>
              <th>Trades</th>
              <th>Win Rate</th>
              <th>PF</th>
              <th>Net Profit</th>
              <th>Delta Profit</th>
              <th>Score</th>
              <th>Delta Score</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr key={stat.conditionKey}>
                <td className="font-black">{stat.rank}</td>
                <td className="font-bold">{stat.condition}</td>
                <td>{stat.recommendation}</td>
                <td>{`${stat.baselineTrades} -> ${stat.testTrades}`}</td>
                <td>{`${stat.baselineWinRate.toFixed(1)}% -> ${stat.testWinRate.toFixed(1)}%`}</td>
                <td>{`${formatRatio(stat.baselineProfitFactor)} -> ${formatRatio(stat.testProfitFactor)}`}</td>
                <td>{`${formatMoney(stat.baselineNetProfit)} -> ${formatMoney(stat.testNetProfit)}`}</td>
                <td className={stat.deltaNetProfit >= 0 ? 'profit' : 'loss'}>{formatSignedMoney(stat.deltaNetProfit)}</td>
                <td>{`${stat.baselineScore.toFixed(1)} -> ${stat.testScore.toFixed(1)}`}</td>
                <td className={stat.deltaScore >= 0 ? 'profit' : 'loss'}>{formatSignedRatio(stat.deltaScore)}</td>
                <td>
                  <button className={stat.recommendation === 'Disable Candidate' ? 'mini-button' : 'secondary-button'} onClick={() => onCreateVariant(stat)}>
                    Create Variant
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReliabilityWarnings({ warnings }: { warnings: BacktestResult['warnings'] }) {
  if (!warnings || warnings.length === 0) {
    return (
      <div className="reliability-panel reliability-panel-high">
        <p className="quality-title">信頼性チェック: High</p>
        <p className="quality-copy">取引回数、期間、PF、DD、Recovery Factorに大きな警告はありません。</p>
      </div>
    );
  }

  return (
    <div className="reliability-panel">
      <p className="quality-title">信頼性チェック警告</p>
      <ul className="quality-list">
        {warnings.map((warning, index) => (
          <li key={`${warning.message}-${index}`} className={warning.severity === 'danger' ? 'quality-error-text' : 'quality-warning-text'}>
            {warning.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReliabilityBadge({ label }: { label?: BacktestResult['reliability'] }) {
  const value = label ?? 'Medium';
  return <span className={`reliability-badge reliability-${value.toLowerCase()}`}>{value}</span>;
}

function LogicCenter({
  logics,
  setLogics,
}: {
  logics: LogicDefinition[];
  setLogics: Dispatch<SetStateAction<LogicDefinition[]>>;
}) {
  const [typeFilter, setTypeFilter] = useState<LogicType | 'All'>('All');
  const [editingId, setEditingId] = useState<string | null>(logics[0]?.id ?? null);
  const selectedLogic = logics.find((logic) => logic.id === editingId) ?? logics[0] ?? null;
  const filteredLogics = typeFilter === 'All' ? logics : logics.filter((logic) => logic.type === typeFilter);

  function addLogic() {
    const next = createLogic('maCross');
    setLogics((current) => [...current, next]);
    setEditingId(next.id);
  }

  function updateLogic(id: string, patch: Partial<LogicDefinition>) {
    setLogics((current) => current.map((logic) => (logic.id === id ? normalizeLogic({ ...logic, ...patch }, logic) : logic)));
  }

  function deleteLogic(id: string) {
    setLogics((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((logic) => logic.id !== id);
      setEditingId(next[0]?.id ?? null);
      return next;
    });
  }

  function duplicateLogic(logic: LogicDefinition) {
    const copy = normalizeLogic({ ...logic, id: `logic-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, name: `${logic.name} Copy` });
    setLogics((current) => [...current, copy]);
    setEditingId(copy.id);
  }

  async function importLogicJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const rawLogics = Array.isArray(parsed) ? parsed : parsed.logics;
      if (!Array.isArray(rawLogics)) throw new Error('JSON must contain a logics array.');
      const imported = rawLogics.map((logic) => normalizeLogic(logic));
      setLogics(imported);
      setEditingId(imported[0]?.id ?? null);
    } catch {
      window.alert('Logic JSON import failed.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-heading">Logic Center</h2>
            <p className="text-sm text-slate-500">Add, edit, duplicate, delete, export, and import logic settings.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="command-button" onClick={addLogic}>+ Add Logic</button>
            <label className="secondary-button cursor-pointer">
              Import JSON
              <input className="hidden" type="file" accept=".json,application/json" onChange={importLogicJson} />
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {logicTypes.map((type) => (
            <button key={type} className={`chip ${typeFilter === type ? 'chip-active' : ''}`} onClick={() => setTypeFilter(type)}>
              {type}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3">
          {filteredLogics.map((logic) => (
            <article key={logic.id} className={`logic-card ${editingId === logic.id ? 'logic-card-active' : ''}`}>
              <button className={`toggle ${logic.enabled ? 'toggle-on' : ''}`} onClick={() => updateLogic(logic.id, { enabled: !logic.enabled })}>
                <span />
              </button>
              <button className="logic-card-main" onClick={() => setEditingId(logic.id)}>
                <span className="logic-title">{logic.name}</span>
                <span className="logic-meta">{logic.type} / {strategyLabels[logic.strategy]} / TP {logic.takeProfit} pips / SL {logic.stopLoss} pips{formatDisabledZeroConditions(logic.params.zeroDisabledConditions)}</span>
              </button>
              <div className="logic-actions">
                <button className="mini-button" onClick={() => duplicateLogic(logic)}>Copy</button>
                <button className="mini-button danger" onClick={() => deleteLogic(logic.id)} disabled={logics.length <= 1}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="panel p-5">
        {selectedLogic ? <LogicEditor logic={selectedLogic} onChange={(patch) => updateLogic(selectedLogic.id, patch)} /> : <div className="chart-empty">No logic selected.</div>}
      </div>
    </section>
  );
}

function LogicEditor({ logic, onChange }: { logic: LogicDefinition; onChange: (patch: Partial<LogicDefinition>) => void }) {
  function updateParam<Key extends Exclude<keyof LogicDefinition['params'], 'zeroDisabledConditions'>>(key: Key, value: number) {
    onChange({ params: { ...logic.params, [key]: value } });
  }

  function toggleZeroCondition(key: ZeroConditionKey) {
    const current = logic.params.zeroDisabledConditions ?? [];
    const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    onChange({ params: { ...logic.params, zeroDisabledConditions: next } });
  }

  return (
    <div>
      <h2 className="section-heading">Logic Settings</h2>
      <div className="mt-4 grid gap-4">
        <Field label="Logic Name"><input className="form-input" value={logic.name} onChange={(event) => onChange({ name: event.target.value })} /></Field>
        <Field label="Description"><textarea className="form-input form-textarea" value={logic.description} onChange={(event) => onChange({ description: event.target.value })} /></Field>
        <div className="settings-grid">
          <Field label="Logic Type">
            <select className="form-input" value={logic.type} onChange={(event) => onChange({ type: event.target.value as LogicType })}>
              {logicTypes.filter((type): type is LogicType => type !== 'All').map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="Strategy">
            <select className="form-input" value={logic.strategy} onChange={(event) => onChange({ strategy: event.target.value as StrategyKind })}>
              {strategies.map((strategy) => <option key={strategy} value={strategy}>{strategyLabels[strategy]}</option>)}
            </select>
          </Field>
          <Field label="TP(pips)"><input className="form-input" type="number" min="0" step="1" value={logic.takeProfit} onChange={(event) => onChange({ takeProfit: Number(event.target.value) })} /></Field>
          <Field label="SL(pips)"><input className="form-input" type="number" min="0" step="1" value={logic.stopLoss} onChange={(event) => onChange({ stopLoss: Number(event.target.value) })} /></Field>
        </div>

        <div className="rounded-md border border-line bg-slate-50 p-4">
          <h3 className="font-black">Parameters</h3>
          <div className="settings-grid mt-3">
            <Field label="MA Fast"><input className="form-input" type="number" min="2" value={logic.params.maFast} onChange={(event) => updateParam('maFast', Number(event.target.value))} /></Field>
            <Field label="MA Slow"><input className="form-input" type="number" min="3" value={logic.params.maSlow} onChange={(event) => updateParam('maSlow', Number(event.target.value))} /></Field>
            <Field label="RSI Period"><input className="form-input" type="number" min="2" value={logic.params.rsiPeriod} onChange={(event) => updateParam('rsiPeriod', Number(event.target.value))} /></Field>
            <Field label="MACD Fast"><input className="form-input" type="number" min="2" value={logic.params.macdFast} onChange={(event) => updateParam('macdFast', Number(event.target.value))} /></Field>
            <Field label="MACD Slow"><input className="form-input" type="number" min="3" value={logic.params.macdSlow} onChange={(event) => updateParam('macdSlow', Number(event.target.value))} /></Field>
            <Field label="MACD Signal"><input className="form-input" type="number" min="2" value={logic.params.macdSignal} onChange={(event) => updateParam('macdSignal', Number(event.target.value))} /></Field>
            <Field label="Bollinger Period"><input className="form-input" type="number" min="3" value={logic.params.bollingerPeriod} onChange={(event) => updateParam('bollingerPeriod', Number(event.target.value))} /></Field>
            <Field label="Breakout Period"><input className="form-input" type="number" min="2" value={logic.params.breakoutPeriod} onChange={(event) => updateParam('breakoutPeriod', Number(event.target.value))} /></Field>
            <Field label="ATR Period"><input className="form-input" type="number" min="2" value={logic.params.atrPeriod} onChange={(event) => updateParam('atrPeriod', Number(event.target.value))} /></Field>
            <Field label="ADX Period"><input className="form-input" type="number" min="2" value={logic.params.adxPeriod} onChange={(event) => updateParam('adxPeriod', Number(event.target.value))} /></Field>
            <Field label="VWAP Period"><input className="form-input" type="number" min="5" value={logic.params.vwapPeriod} onChange={(event) => updateParam('vwapPeriod', Number(event.target.value))} /></Field>
            <Field label="Fibo Lookback"><input className="form-input" type="number" min="20" value={logic.params.fibonacciLookback} onChange={(event) => updateParam('fibonacciLookback', Number(event.target.value))} /></Field>
            <Field label="ZERO Confirmations"><input className="form-input" type="number" min="1" max="13" value={logic.params.zeroMinConfirmations} onChange={(event) => updateParam('zeroMinConfirmations', Number(event.target.value))} /></Field>
            <Field label="Min RR"><input className="form-input" type="number" min="1" step="0.1" value={logic.params.zeroMinRiskReward} onChange={(event) => updateParam('zeroMinRiskReward', Number(event.target.value))} /></Field>
            <Field label="ATR SL Mult"><input className="form-input" type="number" min="0.2" step="0.1" value={logic.params.zeroAtrStopMultiplier} onChange={(event) => updateParam('zeroAtrStopMultiplier', Number(event.target.value))} /></Field>
            <Field label="ATR TP Mult"><input className="form-input" type="number" min="1" step="0.1" value={logic.params.zeroAtrTargetMultiplier} onChange={(event) => updateParam('zeroAtrTargetMultiplier', Number(event.target.value))} /></Field>
            <Field label="ZERO Score Min"><input className="form-input" type="number" min="40" max="100" step="1" value={logic.params.zeroWeightedThreshold} onChange={(event) => updateParam('zeroWeightedThreshold', Number(event.target.value))} /></Field>
            <Field label="Volume Period"><input className="form-input" type="number" min="5" step="1" value={logic.params.volumePeriod} onChange={(event) => updateParam('volumePeriod', Number(event.target.value))} /></Field>
            <Field label="Volume Mult"><input className="form-input" type="number" min="0.1" step="0.1" value={logic.params.volumeMultiplier} onChange={(event) => updateParam('volumeMultiplier', Number(event.target.value))} /></Field>
          </div>
        </div>
        {logic.strategy === 'zeroLogic' && (
          <div className="rounded-md border border-line bg-white p-4">
            <h3 className="font-black">ZERO Disabled Conditions</h3>
            <p className="mt-1 text-sm text-slate-500">Disabled items are ignored by the ZERO score and entry gate for this variant.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {zeroConditionOptions.map((condition) => {
                const checked = (logic.params.zeroDisabledConditions ?? []).includes(condition.key);
                return (
                  <label key={condition.key} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm font-bold">
                    <span>{condition.rank} / {condition.label}</span>
                    <input type="checkbox" checked={checked} onChange={() => toggleZeroCondition(condition.key)} />
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Ranking({ results }: { results: BacktestResult[] }) {
  const [sortKey, setSortKey] = useState<RankingSort>('reliabilityScore');
  const sortedResults = useMemo(() => sortResults(results, sortKey), [results, sortKey]);

  return (
    <section className="panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="section-heading">Ranking</h2>
          <p className="text-sm text-slate-500">Sort active logics by report metrics.</p>
        </div>
        <Field label="Sort By">
          <select className="form-input min-w-48" value={sortKey} onChange={(event) => setSortKey(event.target.value as RankingSort)}>
            <option value="reliabilityScore">Reliability Score</option>
            <option value="score">Score</option>
            <option value="winRate">Win Rate</option>
            <option value="profitFactor">PF</option>
            <option value="expectancy">Expectancy</option>
            <option value="maxDrawdown">Max DD</option>
            <option value="netProfit">Net Profit</option>
          </select>
        </Field>
      </div>
      {sortedResults.length > 0 ? (
        <div className="table-wrap mt-5">
          <table>
            <thead>
              <tr>
            <th>Rank</th>
            <th>Logic</th>
            <th>Reliability</th>
            <th>Reliability Score</th>
            <th>Type</th>
            <th>Win Rate</th>
            <th>PF</th>
            <th>Recovery</th>
            <th>Expectancy</th>
            <th>Max DD</th>
            <th>Net Profit</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((result, index) => (
                <tr key={result.logicId}>
                  <td><span className="rank-badge">{index + 1}</span></td>
                  <td className="font-bold">{result.logicName}</td>
                  <td><ReliabilityBadge label={result.reliability} /></td>
                  <td>{result.validation?.score ?? 0}/100</td>
                  <td>{result.logicType}</td>
                  <td>{result.winRate.toFixed(1)}%</td>
                  <td>{result.profitFactor.toFixed(2)}</td>
                  <td>{formatRatio(result.analytics.recoveryFactor)}</td>
                  <td>{formatMoney(result.analytics.expectancy)}</td>
                  <td>{formatMoney(result.maxDrawdown)}</td>
                  <td className={result.netProfit >= 0 ? 'profit' : 'loss'}>{formatMoney(result.netProfit)}</td>
                  <td className="font-black">{result.score.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="ランキング結果がありません" body="CSVと有効ロジックが揃うと、勝率・PF・期待値・スコアで比較できます。" />
      )}
    </section>
  );
}

function TradeHistory({ trades }: { trades: Trade[] }) {
  const zeroTrades = trades.filter((trade) => typeof trade.entryScore === 'number' && trade.entryScore > 0);
  const averageZeroScore = zeroTrades.length ? zeroTrades.reduce((sum, trade) => sum + (trade.entryScore ?? 0), 0) / zeroTrades.length : 0;
  const sGradeCount = zeroTrades.filter((trade) => trade.entryGrade === 'S').length;
  const aGradeCount = zeroTrades.filter((trade) => trade.entryGrade === 'A').length;

  return (
    <section className="panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="section-heading">Trade History</h2>
          <p className="text-sm text-slate-500">Recent trades are restored from localStorage after reload.</p>
        </div>
        <button className="secondary-button" onClick={() => downloadText('trade-history.csv', toCsv(tradeRows(trades)))}>
          Trade CSV
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="ZERO Audited Trades" value={zeroTrades.length} />
        <Metric label="Avg ZERO Score" value={zeroTrades.length ? averageZeroScore.toFixed(1) : '-'} />
        <Metric label="S Entries" value={sGradeCount} />
        <Metric label="A Entries" value={aGradeCount} />
      </div>
      {trades.length > 0 ? (
        <div className="table-wrap mt-4">
          <table>
            <thead>
              <tr>
                <th>Logic</th>
                <th>Side</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Reason</th>
                <th>ZERO Score</th>
                <th>Grade</th>
                <th>S Rank</th>
                <th>A Rank</th>
                <th>Blocks</th>
                <th>Pips</th>
                <th>Cost</th>
                <th>Profit</th>
                <th>Max Floating Loss</th>
                <th>Equity</th>
                <th>DD</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(-180).map((trade) => (
                <tr key={trade.id}>
                  <td>{trade.logicName}</td>
                  <td>{trade.direction}</td>
                  <td>{trade.entryTime}</td>
                  <td>{trade.exitTime}</td>
                  <td>{trade.exitReason}</td>
                  <td>{typeof trade.entryScore === 'number' ? trade.entryScore.toFixed(0) : '-'}</td>
                  <td>{trade.entryGrade ?? '-'}</td>
                  <td>{formatConditionList(trade.entrySRank)}</td>
                  <td>{formatConditionList(trade.entryARank)}</td>
                  <td>{formatConditionList(trade.entryBlocks)}</td>
                  <td>{trade.pips.toFixed(1)}</td>
                  <td>{formatMoney(trade.cost)}</td>
                  <td className={trade.profit >= 0 ? 'profit' : 'loss'}>{formatMoney(trade.profit)}</td>
                  <td>{formatMoney(trade.maxFloatingLoss ?? 0)}</td>
                  <td>{formatMoney(trade.equity)}</td>
                  <td>{formatMoney(trade.drawdown)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="取引履歴がありません" body="バックテストで売買が発生すると、エントリー・決済・損益がここに保存されます。" />
      )}
    </section>
  );
}

function ResultTable({ results }: { results: BacktestResult[] }) {
  return (
    <div className="table-wrap mt-5">
      <table>
        <thead>
          <tr>
            <th>Logic</th>
            <th>Reliability</th>
            <th>Type</th>
            <th>Win Rate</th>
            <th>PF</th>
            <th>Total Pips</th>
            <th>Avg Pips</th>
            <th>Sharpe</th>
            <th>Recovery</th>
            <th>Payoff</th>
            <th>Max DD</th>
            <th>Trades</th>
            <th>Net Profit</th>
            <th>Avg Profit</th>
            <th>Avg Loss</th>
            <th>Expectancy</th>
            <th>RR</th>
            <th>Avg Hold</th>
            <th>Max Floating Loss</th>
            <th>Max Single Loss</th>
            <th>Max Single Profit</th>
            <th>Max Wins</th>
            <th>Max Losses</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.logicId}>
              <td className="font-bold">{result.logicName}</td>
              <td><ReliabilityBadge label={result.reliability} /></td>
              <td>{result.validation?.score ?? 0}/100</td>
              <td>{result.logicType}</td>
              <td>{result.winRate.toFixed(1)}%</td>
              <td>{result.profitFactor.toFixed(2)}</td>
              <td className={sumPips(result.trades) >= 0 ? 'profit' : 'loss'}>{sumPips(result.trades).toFixed(1)} pips</td>
              <td>{averagePips(result.trades).toFixed(1)} pips</td>
              <td>{formatRatio(result.analytics.sharpeRatio)}</td>
              <td>{formatRatio(result.analytics.recoveryFactor)}</td>
              <td>{formatRatio(result.analytics.payoffRatio)}</td>
              <td>{formatMoney(result.maxDrawdown)}</td>
              <td>{result.tradeCount}</td>
              <td className={result.netProfit >= 0 ? 'profit' : 'loss'}>{formatMoney(result.netProfit)}</td>
              <td>{formatMoney(result.averageProfit)}</td>
              <td>{formatMoney(result.averageLoss)}</td>
              <td>{formatMoney(result.analytics.expectancy)}</td>
              <td>{result.analytics.riskReward.toFixed(2)}</td>
              <td>{formatRatio(result.analytics.averageHoldingBars)}</td>
              <td>{formatMoney(result.analytics.maxFloatingLoss)}</td>
              <td>{formatMoney(result.analytics.maxSingleLoss)}</td>
              <td>{formatMoney(result.analytics.maxSingleProfit)}</td>
              <td>{result.analytics.maxConsecutiveWins}</td>
              <td>{result.analytics.maxConsecutiveLosses}</td>
              <td className="font-black">{result.score.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalysisPanel({ title, stats, compact = false }: { title: string; stats: PeriodStat[]; compact?: boolean }) {
  return (
    <div className="rounded-md border border-line bg-white p-4">
      <h3 className="font-black">{title}</h3>
      <div className={`mt-4 grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-md bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black">{stat.label}</p>
              <p className="text-sm font-bold text-sky">{stat.winRate.toFixed(0)}%</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-sky" style={{ width: `${Math.min(stat.winRate, 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{stat.trades} trades / {formatMoney(stat.profit)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ points, tone }: { points: CurvePoint[]; tone: 'mint' | 'coral' }) {
  if (points.length < 2) return <div className="chart-empty">No chart data yet.</div>;

  const width = 900;
  const height = 220;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const polyline = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point.value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="chart-shell">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="line chart">
        <polyline points={polyline} fill="none" stroke={tone === 'mint' ? '#00a896' : '#f25f5c'} strokeWidth="4" />
      </svg>
      <div className="chart-axis">
        <span>{formatMoney(min)}</span>
        <span>{formatMoney(max)}</span>
      </div>
    </div>
  );
}

function BarChart({ points }: { points: CurvePoint[] }) {
  if (points.length === 0) return <div className="chart-empty">No chart data yet.</div>;
  const max = Math.max(...points.map((point) => Math.abs(point.value)), 1);

  return (
    <div className="bar-chart">
      {points.map((point) => {
        const height = (Math.abs(point.value) / max) * 86 + 8;
        return (
          <div key={point.label} className="bar-item">
            <div className={point.value >= 0 ? 'bar-positive' : 'bar-negative'} style={{ height: `${height}%` }} title={`${point.label} ${formatMoney(point.value)}`} />
            <span>{point.label.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-card">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-2xl font-black">{value}</p>
    </div>
  );
}

function ProjectNode({ label, value }: { label: string; value: string }) {
  return (
    <div className="project-node">
      <p>{label}</p>
      <span>{value}</span>
    </div>
  );
}

function CsvQualityPanel({ report }: { report: CsvValidationReport | null }) {
  if (!report) {
    return (
      <div className="quality-panel quality-neutral">
        <div>
          <p className="quality-title">CSV品質チェック</p>
          <p className="quality-copy">CSVを読み込むと、ヘッダー、日付、数値、重複、欠損ローソク足を検証します。</p>
        </div>
      </div>
    );
  }

  const statusLabel = report.status === 'success' ? '読み込み成功' : report.status === 'warning' ? '警告あり' : '読み込みエラー';
  const visibleIssues = report.issues.slice(0, 5);

  return (
    <div className={`quality-panel quality-${report.status}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="quality-title">CSV品質チェック: {statusLabel}</p>
          <p className="quality-copy">
            有効行 {report.validRows.toLocaleString()} / 総行 {report.rows.toLocaleString()}、重複time {report.duplicateTimes.toLocaleString()}、欠損候補 {report.missingCandles.toLocaleString()}
          </p>
        </div>
        <span className="quality-score">{report.score}/100</span>
      </div>
      {visibleIssues.length > 0 ? (
        <ul className="quality-list">
          {visibleIssues.map((issue, index) => (
            <li key={`${issue.message}-${index}`} className={issue.severity === 'error' ? 'quality-error-text' : 'quality-warning-text'}>
              {issue.message}
            </li>
          ))}
          {report.issues.length > visibleIssues.length && <li>ほか {report.issues.length - visibleIssues.length} 件</li>}
        </ul>
      ) : (
        <p className="quality-copy mt-3">必須列、日付形式、数値列、time順に問題はありません。</p>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <p className="text-lg font-black">{title}</p>
      <p className="mt-2 max-w-xl text-sm leading-7 text-slate-400">{body}</p>
    </div>
  );
}

function createAiLogicDecisions(results: BacktestResult[]): AiLogicDecision[] {
  return results
    .map((result) => {
      const validation = result.validation;
      const outOfSample = validation.outOfSample.outOfSample;
      const monteCarlo = validation.monteCarlo;
      const strongestRegime = validation.marketRegimes.reduce(
        (best, regime) => (regime.score > best.score ? regime : best),
        validation.marketRegimes[0] ?? { regime: '-' as const, score: 0, trades: 0, winRate: 0, netProfit: 0, profitFactor: 0, bars: 0 },
      );
      const reasons: string[] = [];
      const rejectionReasons: string[] = [];
      let aiScore = 0;

      aiScore += Math.min(validation.score, 100) * 0.28;
      aiScore += outOfSample.netProfit > 0 ? 14 : -10;
      aiScore += Math.min(validation.outOfSample.retentionRate, 140) * 0.1;
      aiScore += monteCarlo.profitP10 > 0 ? 15 : monteCarlo.profitP50 > 0 ? 8 : -8;
      aiScore += result.maxDrawdown <= Math.max(result.netProfit, 1) * 0.45 ? 10 : -6;
      aiScore += result.profitFactor >= 1.5 ? 10 : result.profitFactor >= 1.15 ? 5 : -8;
      aiScore += result.tradeCount >= 30 ? 8 : result.tradeCount >= 15 ? 3 : -8;
      aiScore += strongestRegime.score >= 65 && strongestRegime.trades >= 4 ? 8 : strongestRegime.score >= 45 ? 3 : 0;

      if (validation.score >= 75) reasons.push('Reliability Score is strong.');
      else if (validation.score < 50) rejectionReasons.push('Reliability Score is below the preferred threshold.');

      if (outOfSample.netProfit > 0 && validation.outOfSample.retentionRate >= 55) reasons.push('Out-of-Sample performance is positive and retention is acceptable.');
      else rejectionReasons.push('Out-of-Sample performance is weak or retention is low.');

      if (monteCarlo.profitP10 > 0) reasons.push('Monte Carlo downside scenario remains profitable.');
      else if (monteCarlo.profitP50 > 0) reasons.push('Monte Carlo median result is positive, but downside needs monitoring.');
      else rejectionReasons.push('Monte Carlo distribution is unstable.');

      if (result.maxDrawdown <= Math.max(result.netProfit, 1) * 0.45) reasons.push('Maximum drawdown is controlled relative to profit.');
      else rejectionReasons.push('Maximum drawdown is high relative to profit.');

      if (result.profitFactor >= 1.5) reasons.push('Profit Factor is stable.');
      else if (result.profitFactor < 1.15) rejectionReasons.push('Profit Factor is not strong enough.');

      if (result.tradeCount >= 30) reasons.push('Trade count is sufficient for a first-pass evaluation.');
      else rejectionReasons.push('Trade count is too low for high-confidence adoption.');

      if (strongestRegime.score >= 65 && strongestRegime.trades >= 4) {
        reasons.push(`Shows clear strength in ${strongestRegime.regime}.`);
      } else {
        rejectionReasons.push('No strong market-regime edge was detected yet.');
      }

      const boundedScore = Math.round(Math.max(0, Math.min(100, aiScore)));
      const status: AiAdoptionStatus =
        boundedScore >= 75 && rejectionReasons.length <= 1
          ? 'Adopt'
          : boundedScore >= 50
            ? 'Watch'
            : 'Reject';

      return {
        result,
        status,
        aiScore: boundedScore,
        reasons,
        rejectionReasons: rejectionReasons.length > 0 ? rejectionReasons : ['No major exclusion reason detected.'],
        comment: createAiComment(result, status, strongestRegime.regime, outOfSample.netProfit, monteCarlo.profitP10),
        bestRegime: strongestRegime.regime,
      };
    })
    .sort((a, b) => {
      const statusRank: Record<AiAdoptionStatus, number> = { Adopt: 3, Watch: 2, Reject: 1 };
      return statusRank[b.status] - statusRank[a.status] || b.aiScore - a.aiScore || (b.result.validation?.score ?? 0) - (a.result.validation?.score ?? 0);
    });
}

function createAiComment(
  result: BacktestResult,
  status: AiAdoptionStatus,
  bestRegime: string,
  oosProfit: number,
  monteCarloP10: number,
): string {
  if (status === 'Adopt') {
    return `${result.logicName} is an adoption candidate because validation quality is high, Out-of-Sample profit is ${formatMoney(oosProfit)}, and drawdown is controlled. It is especially suitable for ${bestRegime}.`;
  }
  if (status === 'Watch') {
    return `${result.logicName} should stay on watch. It has useful signals, but OOS stability, Monte Carlo downside, trade count, or drawdown needs more confirmation before adoption.`;
  }
  return `${result.logicName} is rejected for now because the validation profile is not stable enough. OOS profit is ${formatMoney(oosProfit)} and Monte Carlo P10 profit is ${formatMoney(monteCarloP10)}.`;
}

function sortResults(results: BacktestResult[], sortKey: RankingSort): BacktestResult[] {
  return [...results].sort((a, b) => {
    if (sortKey === 'reliabilityScore') return (b.validation?.score ?? 0) - (a.validation?.score ?? 0);
    if (sortKey === 'expectancy') return b.analytics.expectancy - a.analytics.expectancy;
    if (sortKey === 'maxDrawdown') return a.maxDrawdown - b.maxDrawdown;
    return b[sortKey] - a[sortKey];
  });
}

function resultRows(results: BacktestResult[]): Array<Record<string, string | number>> {
  return results.map((result) => ({
    logic: result.logicName,
    reliability: result.reliability ?? 'Medium',
    reliabilityScore: result.validation?.score ?? 0,
    totalPips: sumPips(result.trades).toFixed(1),
    averagePips: averagePips(result.trades).toFixed(1),
    bestRegime: result.validation?.bestRegime ?? '-',
    oosNetProfit: result.validation?.outOfSample.outOfSample.netProfit.toFixed(0) ?? '0',
    oosRetention: result.validation?.outOfSample.retentionRate.toFixed(0) ?? '0',
    monteCarloAverageProfit: result.validation?.monteCarlo.averageProfit.toFixed(0) ?? '0',
    monteCarloWorstDrawdown: result.validation?.monteCarlo.worstMaxDrawdown.toFixed(0) ?? '0',
    type: result.logicType,
    winRate: result.winRate.toFixed(2),
    profitFactor: result.profitFactor.toFixed(2),
    sharpeRatio: formatRatio(result.analytics.sharpeRatio),
    recoveryFactor: formatRatio(result.analytics.recoveryFactor),
    payoffRatio: formatRatio(result.analytics.payoffRatio),
    expectancy: result.analytics.expectancy.toFixed(0),
    maxDrawdown: result.maxDrawdown.toFixed(0),
    maxFloatingLoss: (result.analytics.maxFloatingLoss ?? 0).toFixed(0),
    maxSingleLoss: (result.analytics.maxSingleLoss ?? 0).toFixed(0),
    maxSingleProfit: (result.analytics.maxSingleProfit ?? 0).toFixed(0),
    averageHoldingBars: formatRatio(result.analytics.averageHoldingBars),
    netProfit: result.netProfit.toFixed(0),
    trades: result.tradeCount,
    warnings: result.warnings?.length ?? 0,
    score: result.score.toFixed(1),
  }));
}

function tradeRows(trades: Trade[]): Array<Record<string, string | number>> {
  return trades.map((trade) => ({
    logic: trade.logicName,
    side: trade.direction,
    entryTime: trade.entryTime,
    exitTime: trade.exitTime,
    reason: trade.exitReason,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    zeroScore: typeof trade.entryScore === 'number' ? trade.entryScore.toFixed(0) : '',
    zeroGrade: trade.entryGrade ?? '',
    zeroConfirmations: trade.entryConfirmations ?? '',
    zeroSRank: formatConditionList(trade.entrySRank),
    zeroARank: formatConditionList(trade.entryARank),
    zeroBlocks: formatConditionList(trade.entryBlocks),
    pips: trade.pips.toFixed(1),
    cost: trade.cost.toFixed(0),
    profit: trade.profit.toFixed(0),
    maxFloatingLoss: (trade.maxFloatingLoss ?? 0).toFixed(0),
    equity: trade.equity.toFixed(0),
    drawdown: trade.drawdown.toFixed(0),
  }));
}

function conditionRows(results: BacktestResult[]): Array<Record<string, string | number>> {
  return results.flatMap((result) => (result.analytics.zeroConditionStats ?? []).map((stat) => ({
    logic: result.logicName,
    rank: stat.rank,
    condition: stat.label,
    trades: stat.trades,
    wins: stat.wins,
    losses: stat.losses,
    winRate: stat.winRate.toFixed(1),
    profitFactor: stat.profitFactor.toFixed(2),
    expectancy: stat.expectancy.toFixed(0),
    netProfit: stat.netProfit.toFixed(0),
    averageScore: stat.averageScore.toFixed(1),
    averagePips: stat.averagePips.toFixed(1),
  })));
}

function optimizationRows(results: BacktestResult[]): Array<Record<string, string | number>> {
  return results.flatMap((result) => (result.analytics.zeroOptimizationStats ?? []).map((stat) => ({
    logic: result.logicName,
    rank: stat.rank,
    withoutCondition: stat.condition,
    recommendation: stat.recommendation,
    baselineTrades: stat.baselineTrades,
    testTrades: stat.testTrades,
    baselineWinRate: stat.baselineWinRate.toFixed(1),
    testWinRate: stat.testWinRate.toFixed(1),
    baselineProfitFactor: stat.baselineProfitFactor.toFixed(2),
    testProfitFactor: stat.testProfitFactor.toFixed(2),
    baselineNetProfit: stat.baselineNetProfit.toFixed(0),
    testNetProfit: stat.testNetProfit.toFixed(0),
    deltaNetProfit: stat.deltaNetProfit.toFixed(0),
    baselineScore: stat.baselineScore.toFixed(1),
    testScore: stat.testScore.toFixed(1),
    deltaScore: stat.deltaScore.toFixed(1),
  })));
}

function variantRows(results: BacktestResult[], logics: LogicDefinition[]): Array<Record<string, string | number>> {
  return createZeroVariantComparisonRows(results, logics).map((row) => ({
    decision: row.decision,
    logic: row.result.logicName,
    offConditions: row.disabledLabel,
    trades: row.result.tradeCount,
    winRate: row.result.winRate.toFixed(1),
    deltaWinRate: row.deltaWinRate.toFixed(1),
    profitFactor: row.result.profitFactor.toFixed(2),
    deltaProfitFactor: row.deltaProfitFactor.toFixed(2),
    maxDrawdown: row.result.maxDrawdown.toFixed(0),
    deltaMaxDrawdown: row.deltaMaxDrawdown.toFixed(0),
    netProfit: row.result.netProfit.toFixed(0),
    deltaNetProfit: row.deltaNetProfit.toFixed(0),
    score: row.result.score.toFixed(1),
    deltaScore: row.deltaScore.toFixed(1),
  }));
}

function presetPerformanceRows(presets: ZeroPreset[], results: BacktestResult[], logics: LogicDefinition[]): Array<Record<string, string | number>> {
  return createZeroPresetPerformanceRows(presets, results, logics).map((row) => ({
    decision: row.decision,
    preset: row.preset.name,
    mode: row.preset.mode,
    pair: row.preset.pair,
    timeframe: row.preset.timeframe,
    logicCount: row.preset.logicIds.length,
    logicNames: row.logicNames.join(' / '),
    missingLogicIds: row.missingLogicIds.join(' / '),
    trades: row.trades,
    winRate: row.winRate.toFixed(1),
    profitFactor: row.profitFactor.toFixed(2),
    expectancy: row.expectancy.toFixed(0),
    recoveryFactor: row.recoveryFactor.toFixed(2),
    netProfit: row.netProfit.toFixed(0),
    deltaNetProfit: row.deltaNetProfit.toFixed(0),
    maxDrawdown: row.maxDrawdown.toFixed(0),
    deltaMaxDrawdown: row.deltaMaxDrawdown.toFixed(0),
    score: row.score.toFixed(1),
    deltaScore: row.deltaScore.toFixed(1),
    reliabilityScore: row.reliabilityScore.toFixed(0),
    createdAt: row.preset.createdAt,
  }));
}

function replayRankingRows(rows: ZeroPresetReplayRankingRow[]): Array<Record<string, string | number>> {
  return rows.map((row) => ({
    rank: row.rank,
    decision: row.decision,
    preset: row.preset.name,
    mode: row.preset.mode,
    pair: row.preset.pair,
    timeframe: row.preset.timeframe,
    topLogic: row.topLogicName,
    resultCount: row.resultCount,
    missingLogicIds: row.missingLogicIds.join(' / '),
    trades: row.trades,
    winRate: row.winRate.toFixed(1),
    profitFactor: row.profitFactor.toFixed(2),
    expectancy: row.expectancy.toFixed(0),
    recoveryFactor: row.recoveryFactor.toFixed(2),
    netProfit: row.netProfit.toFixed(0),
    maxDrawdown: row.maxDrawdown.toFixed(0),
    score: row.score.toFixed(1),
    reliabilityScore: row.reliabilityScore.toFixed(0),
  }));
}

function aggregateTradeProfitByMonth(trades: Trade[]): CurvePoint[] {
  const monthly = new Map<string, number>();
  trades.forEach((trade) => {
    const time = trade.exitTime || trade.entryTime;
    const date = new Date(time.includes('T') ? time : time.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return;
    const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthly.set(label, (monthly.get(label) ?? 0) + trade.profit);
  });
  return Array.from(monthly.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, value]) => ({ label, value }));
}

function createPresetReportNotes(summary: ZeroPresetReplaySummary, results: BacktestResult[], row?: ZeroPresetReplayRankingRow): string[] {
  const notes = [
    `Decision: ${row?.decision ?? 'Watch'} / Score ${summary.score.toFixed(1)} / Reliability ${summary.reliabilityScore.toFixed(0)}/100.`,
    `Replay result: ${summary.trades} trades, PF ${formatRatio(summary.profitFactor)}, win rate ${summary.winRate.toFixed(1)}%, net profit ${formatMoney(summary.netProfit)}.`,
  ];

  if (summary.trades < 30) notes.push('Warning: trade count is still low. Treat this preset as a watch candidate until more data is tested.');
  if (summary.maxDrawdown > Math.max(1, Math.abs(summary.netProfit) * 0.6)) notes.push('Risk: drawdown is large relative to net profit. Reduce lot size or require a longer sample before adoption.');
  if (normalizePf(summary.profitFactor) >= 1.2 && summary.recoveryFactor >= 1 && summary.reliabilityScore >= 55) notes.push('Strength: PF, Recovery, and reliability are aligned enough for a stricter forward-test candidate.');
  if (results.some((result) => result.warnings.length > 0)) notes.push('Validation: one or more included logics still have warnings. Check the logic-level report before showing this as final proof.');
  if ((row?.missingLogicIds.length ?? 0) > 0) notes.push(`Missing: ${row?.missingLogicIds.length ?? 0} preset logic IDs were not found in the current Logic Center.`);

  return notes;
}

function createPresetReportPayload(
  preset: ZeroPreset,
  settings: BacktestSettings,
  summary: ZeroPresetReplaySummary,
  results: BacktestResult[],
  trades: Trade[],
  row?: ZeroPresetReplayRankingRow,
) {
  return {
    exportedAt: new Date().toISOString(),
    preset,
    decision: row?.decision ?? 'Watch',
    rank: row?.rank ?? null,
    settings,
    summary,
    monthlyProfit: aggregateTradeProfitByMonth(trades),
    notes: createPresetReportNotes(summary, results, row),
    results,
    trades,
  };
}

function liveSignalRows(logs: LiveSampleLog[]): Array<Record<string, string | number>> {
  return logs.map((log) => ({
    receivedAt: log.receivedAt,
    marketTime: log.time,
    pair: log.pair,
    timeframe: log.timeframe,
    logic: log.logicName,
    signal: log.side,
    price: log.price.toFixed(5),
    takeProfitPrice: log.takeProfitPrice.toFixed(5),
    stopLossPrice: log.stopLossPrice.toFixed(5),
    takeProfitPips: log.takeProfitPips,
    stopLossPips: log.stopLossPips,
    regime: log.regime,
    confidence: log.confidence,
    note: log.note,
  }));
}

function toCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
}

function downloadJson(fileName: string, value: unknown) {
  downloadText(fileName, JSON.stringify(value, null, 2), 'application/json');
}

function downloadText(fileName: string, text: string, type = 'text/csv') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readMergedStorage<T extends Record<string, unknown>>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? ({ ...fallback, ...JSON.parse(value) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function readLogics(): LogicDefinition[] {
  const saved = readStorage<unknown[]>(storageKeys.logics, []);
  if (!Array.isArray(saved) || saved.length === 0) return defaultLogics;
  const normalized = saved.map((logic) => {
    const normalized = normalizeLogic(logic);
    const fallback = defaultLogics.find((item) => item.id === normalized.id || item.strategy === normalized.strategy);
    return normalizeLogic(logic, fallback);
  });
  const missingDefaults = defaultLogics.filter((logic) => !normalized.some((item) => item.id === logic.id || item.strategy === logic.strategy));
  return [...normalized, ...missingDefaults];
}

function readSymbols(): string[] {
  const saved = readStorage<string[]>(storageKeys.symbols, defaultSymbols);
  const merged = [...defaultSymbols, ...saved]
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
  return Array.from(new Set(merged));
}

function readZeroPresets(): ZeroPreset[] {
  return normalizeZeroPresets(readStorage<unknown[]>(storageKeys.zeroPresets, []));
}

function normalizeZeroPresets(input: unknown): ZeroPreset[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (!isPlainObject(item)) return null;
      const mode = readPresetMode(item.mode);
      const timeframe = timeframes.includes(item.timeframe as Timeframe) ? item.timeframe as Timeframe : defaultSettings.timeframe;
      const logicIds = Array.isArray(item.logicIds) ? item.logicIds.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
      if (logicIds.length === 0) return null;

      return {
        id: typeof item.id === 'string' && item.id ? item.id : `zero-preset-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        name: typeof item.name === 'string' && item.name ? item.name : mode,
        mode,
        pair: typeof item.pair === 'string' && item.pair ? item.pair.toUpperCase() : defaultSettings.pair,
        timeframe,
        logicIds: Array.from(new Set(logicIds)),
        notes: typeof item.notes === 'string' ? item.notes : '',
        createdAt: typeof item.createdAt === 'string' && item.createdAt ? item.createdAt : new Date().toISOString(),
      };
    })
    .filter((preset): preset is ZeroPreset => preset !== null);
}

function readPresetMode(value: unknown): ZeroPresetMode {
  return value === 'ZERO PRO Candidate' || value === 'ZERO Conservative' || value === 'ZERO Aggressive' || value === 'Pair Specific'
    ? value
    : 'ZERO PRO Candidate';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readCandles(): Candle[] {
  const saved = readStorage<Candle[]>(storageKeys.candles, []);
  if (!Array.isArray(saved)) return [];
  return saved.filter(
    (candle) =>
      typeof candle?.time === 'string' &&
      typeof candle.open === 'number' &&
      typeof candle.high === 'number' &&
      typeof candle.low === 'number' &&
      typeof candle.close === 'number' &&
      typeof candle.volume === 'number',
  );
}

function createDataProfile(candles: Candle[], timeframe: Timeframe, updatedAt: string) {
  if (candles.length === 0) {
    return {
      count: 0,
      start: '-',
      end: '-',
      missingLabel: '未確認',
      updatedAt,
    };
  }

  const sorted = [...candles].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  const interval = timeframeToMs(timeframe);
  let missing = 0;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = Date.parse(sorted[index - 1].time);
    const current = Date.parse(sorted[index].time);
    if (!Number.isFinite(previous) || !Number.isFinite(current)) continue;
    const gap = current - previous;
    if (gap > interval * 1.5) {
      missing += Math.max(1, Math.round(gap / interval) - 1);
    }
  }

  return {
    count: sorted.length,
    start: sorted[0]?.time ?? '-',
    end: sorted[sorted.length - 1]?.time ?? '-',
    missingLabel: missing === 0 ? '問題なし' : `${missing.toLocaleString()} gaps`,
    updatedAt,
  };
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

function formatMoney(value: number | undefined): string {
  const safeValue = Number.isFinite(value) ? Number(value) : 0;
  return safeValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatSignedMoney(value: number | undefined): string {
  const safeValue = Number.isFinite(value) ? Number(value) : 0;
  const prefix = safeValue > 0 ? '+' : '';
  return `${prefix}${formatMoney(safeValue)}`;
}

function formatRatio(value: number | undefined): string {
  if (!Number.isFinite(value)) return '0.00';
  return Number(value).toFixed(2);
}

function formatSignedRatio(value: number | undefined): string {
  const safeValue = Number.isFinite(value) ? Number(value) : 0;
  return `${safeValue > 0 ? '+' : ''}${safeValue.toFixed(1)}`;
}

function sumPips(trades: Trade[]): number {
  return trades.reduce((sum, trade) => sum + trade.pips, 0);
}

function averagePips(trades: Trade[]): number {
  return trades.length ? sumPips(trades) / trades.length : 0;
}

function createZeroVariantComparisonRows(results: BacktestResult[], logics: LogicDefinition[]): ZeroVariantComparisonRow[] {
  const logicById = new Map(logics.map((logic) => [logic.id, logic]));
  const zeroRows = results
    .map((result) => ({ result, logic: logicById.get(result.logicId) }))
    .filter((item): item is { result: BacktestResult; logic: LogicDefinition } => item.logic?.strategy === 'zeroLogic');
  if (zeroRows.length === 0) return [];

  const baseline = zeroRows.find((item) => (item.logic.params.zeroDisabledConditions ?? []).length === 0) ?? zeroRows[0];

  return zeroRows
    .map(({ result, logic }) => {
      const disabled = logic.params.zeroDisabledConditions ?? [];
      const deltaNetProfit = result.netProfit - baseline.result.netProfit;
      const deltaWinRate = result.winRate - baseline.result.winRate;
      const deltaProfitFactor = normalizePf(result.profitFactor) - normalizePf(baseline.result.profitFactor);
      const deltaMaxDrawdown = result.maxDrawdown - baseline.result.maxDrawdown;
      const deltaScore = result.score - baseline.result.score;
      const decision = result.logicId === baseline.result.logicId
        ? 'Base'
        : decideZeroVariant({
            deltaNetProfit,
            deltaProfitFactor,
            deltaMaxDrawdown,
            deltaScore,
            result,
            baseline: baseline.result,
          });

      return {
        result,
        logic,
        disabledLabel: disabled.length > 0 ? disabled.map(zeroConditionLabel).join(' / ') : 'None',
        decision,
        deltaNetProfit,
        deltaWinRate,
        deltaProfitFactor,
        deltaMaxDrawdown,
        deltaScore,
      };
    })
    .sort((a, b) => {
      if (a.decision === 'Base') return -1;
      if (b.decision === 'Base') return 1;
      return b.result.score - a.result.score || b.deltaNetProfit - a.deltaNetProfit;
    });
}

function createZeroPresetPerformanceRows(presets: ZeroPreset[], results: BacktestResult[], logics: LogicDefinition[]): ZeroPresetPerformanceRow[] {
  const logicById = new Map(logics.map((logic) => [logic.id, logic]));
  const resultById = new Map(results.map((result) => [result.logicId, result]));
  const currentZeroLogicIds = logics
    .filter((logic) => logic.strategy === 'zeroLogic' && logic.enabled)
    .map((logic) => logic.id);
  const current = summarizeZeroPresetLogicIds(currentZeroLogicIds, resultById, logicById);
  const hasCurrentReference = current.trades > 0;

  return presets
    .map((preset) => {
      const aggregate = summarizeZeroPresetLogicIds(preset.logicIds, resultById, logicById);
      const isCurrent = sameStringSet(preset.logicIds, currentZeroLogicIds);
      const reference = hasCurrentReference ? current : aggregate;
      const deltaNetProfit = aggregate.netProfit - reference.netProfit;
      const deltaScore = aggregate.score - reference.score;
      const deltaMaxDrawdown = aggregate.maxDrawdown - reference.maxDrawdown;
      const decision = decideZeroPresetPerformance({
        aggregate,
        hasCurrentReference,
        isCurrent,
        missingCount: aggregate.missingLogicIds.length,
        reference,
      });

      return {
        preset,
        ...aggregate,
        decision,
        deltaNetProfit,
        deltaScore,
        deltaMaxDrawdown,
      };
    })
    .sort((a, b) => {
      const decisionOrder: Record<ZeroPresetDecision, number> = { Current: 0, Adopt: 1, Watch: 2, Reject: 3 };
      return decisionOrder[a.decision] - decisionOrder[b.decision]
        || b.score - a.score
        || b.netProfit - a.netProfit;
    });
}

function createPresetReplayLogics(preset: ZeroPreset, logics: LogicDefinition[]): LogicDefinition[] {
  const selected = new Set(preset.logicIds);
  return logics.map((logic) => normalizeLogic({
    ...logic,
    enabled: logic.strategy === 'zeroLogic' && selected.has(logic.id),
  }, logic));
}

function createZeroPresetReplayRankingRows(
  presets: ZeroPreset[],
  candles: Candle[],
  logics: LogicDefinition[],
  settings: BacktestSettings,
  sortBy: 'score' | 'netProfit' | 'profitFactor' | 'winRate' | 'maxDrawdown' | 'trades',
): ZeroPresetReplayRankingRow[] {
  const logicById = new Map(logics.map((logic) => [logic.id, logic]));
  const currentZeroLogicIds = logics
    .filter((logic) => logic.strategy === 'zeroLogic' && logic.enabled)
    .map((logic) => logic.id);

  return presets
    .map((preset) => {
      const replayResults = runBacktests(candles, createPresetReplayLogics(preset, logics), settings);
      const summary = summarizeReplayResults(replayResults);
      const missingLogicIds = preset.logicIds.filter((id) => !logicById.has(id));
      const isCurrent = sameStringSet(preset.logicIds, currentZeroLogicIds);

      return {
        ...summary,
        preset,
        rank: 0,
        decision: decideZeroReplayRanking(summary, missingLogicIds.length, isCurrent),
        topLogicName: replayResults[0]?.logicName ?? '-',
        missingLogicIds,
        resultCount: replayResults.length,
      };
    })
    .sort((a, b) => compareReplayRankingRows(a, b, sortBy))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function summarizeReplayResults(results: BacktestResult[]): ZeroPresetReplaySummary {
  const trades = results.flatMap((result) => result.trades ?? []);
  const tradeCount = trades.length > 0 ? trades.length : results.reduce((sum, result) => sum + result.tradeCount, 0);
  const netProfit = trades.length > 0
    ? trades.reduce((sum, trade) => sum + trade.profit, 0)
    : results.reduce((sum, result) => sum + result.netProfit, 0);
  const grossProfit = trades.reduce((sum, trade) => sum + Math.max(0, trade.profit), 0);
  const grossLoss = Math.abs(trades.reduce((sum, trade) => sum + Math.min(0, trade.profit), 0));
  const wins = trades.filter((trade) => trade.profit > 0).length;
  const maxDrawdown = results.reduce((max, result) => Math.max(max, result.maxDrawdown), 0);

  return {
    trades: tradeCount,
    winRate: tradeCount > 0
      ? trades.length > 0
        ? (wins / tradeCount) * 100
        : weightedAverage(results, (result) => result.winRate, (result) => Math.max(1, result.tradeCount))
      : 0,
    profitFactor: trades.length > 0
      ? grossLoss === 0
        ? grossProfit > 0 ? 99 : 0
        : grossProfit / grossLoss
      : weightedAverage(results, (result) => result.profitFactor, (result) => Math.max(1, result.tradeCount)),
    expectancy: tradeCount > 0 ? netProfit / tradeCount : 0,
    recoveryFactor: maxDrawdown === 0 ? (netProfit > 0 ? 99 : 0) : netProfit / maxDrawdown,
    reliabilityScore: weightedAverage(results, (result) => result.validation?.score ?? 0, (result) => Math.max(1, result.tradeCount)),
    netProfit,
    maxDrawdown,
    score: weightedAverage(results, (result) => result.score, (result) => Math.max(1, result.tradeCount)),
  };
}

function decideZeroReplayRanking(summary: ZeroPresetReplaySummary, missingCount: number, isCurrent: boolean): ZeroPresetDecision {
  if (isCurrent) return 'Current';
  if (missingCount > 0 && summary.trades === 0) return 'Reject';
  if (summary.trades < 10 || normalizePf(summary.profitFactor) < 1 || summary.netProfit <= 0) return 'Reject';
  if (summary.score >= 60 && normalizePf(summary.profitFactor) >= 1.2 && summary.reliabilityScore >= 55 && summary.recoveryFactor >= 1) return 'Adopt';
  return 'Watch';
}

function compareReplayRankingRows(
  left: ZeroPresetReplayRankingRow,
  right: ZeroPresetReplayRankingRow,
  sortBy: 'score' | 'netProfit' | 'profitFactor' | 'winRate' | 'maxDrawdown' | 'trades',
): number {
  const leftValue = replaySortValue(left, sortBy);
  const rightValue = replaySortValue(right, sortBy);
  return rightValue - leftValue || right.score - left.score || right.netProfit - left.netProfit;
}

function replaySortValue(row: ZeroPresetReplayRankingRow, sortBy: 'score' | 'netProfit' | 'profitFactor' | 'winRate' | 'maxDrawdown' | 'trades'): number {
  if (sortBy === 'maxDrawdown') return -row.maxDrawdown;
  if (sortBy === 'profitFactor') return normalizePf(row.profitFactor);
  const value = row[sortBy];
  return Number.isFinite(value) ? value : 0;
}

function summarizeZeroPresetLogicIds(
  logicIds: string[],
  resultById: Map<string, BacktestResult>,
  logicById: Map<string, LogicDefinition>,
): Pick<
  ZeroPresetPerformanceRow,
  'logicNames' | 'missingLogicIds' | 'trades' | 'winRate' | 'profitFactor' | 'netProfit' | 'maxDrawdown' | 'score' | 'reliabilityScore' | 'expectancy' | 'recoveryFactor'
> {
  const uniqueLogicIds = Array.from(new Set(logicIds));
  const resultItems = uniqueLogicIds
    .map((id) => resultById.get(id))
    .filter((result): result is BacktestResult => Boolean(result));
  const tradeItems = resultItems.flatMap((result) => result.trades ?? []);
  const trades = tradeItems.length > 0
    ? tradeItems.length
    : resultItems.reduce((sum, result) => sum + result.tradeCount, 0);
  const netProfit = tradeItems.length > 0
    ? tradeItems.reduce((sum, trade) => sum + trade.profit, 0)
    : resultItems.reduce((sum, result) => sum + result.netProfit, 0);
  const grossProfit = tradeItems.reduce((sum, trade) => sum + Math.max(0, trade.profit), 0);
  const grossLoss = Math.abs(tradeItems.reduce((sum, trade) => sum + Math.min(0, trade.profit), 0));
  const wins = tradeItems.filter((trade) => trade.profit > 0).length;
  const maxDrawdown = resultItems.reduce((max, result) => Math.max(max, result.maxDrawdown), 0);
  const winRate = trades > 0
    ? tradeItems.length > 0
      ? (wins / trades) * 100
      : weightedAverage(resultItems, (result) => result.winRate, (result) => Math.max(1, result.tradeCount))
    : 0;
  const profitFactor = tradeItems.length > 0
    ? grossLoss === 0
      ? grossProfit > 0 ? 99 : 0
      : grossProfit / grossLoss
    : weightedAverage(resultItems, (result) => result.profitFactor, (result) => Math.max(1, result.tradeCount));

  return {
    logicNames: uniqueLogicIds.map((id) => logicById.get(id)?.name ?? id),
    missingLogicIds: uniqueLogicIds.filter((id) => !logicById.has(id) || !resultById.has(id)),
    trades,
    winRate,
    profitFactor,
    netProfit,
    maxDrawdown,
    score: weightedAverage(resultItems, (result) => result.score, (result) => Math.max(1, result.tradeCount)),
    reliabilityScore: weightedAverage(resultItems, (result) => result.validation?.score ?? 0, (result) => Math.max(1, result.tradeCount)),
    expectancy: trades > 0 ? netProfit / trades : 0,
    recoveryFactor: maxDrawdown === 0 ? (netProfit > 0 ? 99 : 0) : netProfit / maxDrawdown,
  };
}

function decideZeroPresetPerformance({
  aggregate,
  hasCurrentReference,
  isCurrent,
  missingCount,
  reference,
}: {
  aggregate: Pick<ZeroPresetPerformanceRow, 'trades' | 'profitFactor' | 'netProfit' | 'maxDrawdown' | 'score' | 'reliabilityScore' | 'recoveryFactor'>;
  reference: Pick<ZeroPresetPerformanceRow, 'trades' | 'profitFactor' | 'netProfit' | 'maxDrawdown' | 'score' | 'recoveryFactor'>;
  hasCurrentReference: boolean;
  isCurrent: boolean;
  missingCount: number;
}): ZeroPresetDecision {
  if (isCurrent) return 'Current';
  if (missingCount > 0 && aggregate.trades === 0) return 'Reject';
  if (aggregate.trades < 10) return 'Reject';

  if (!hasCurrentReference) {
    if (aggregate.netProfit > 0 && normalizePf(aggregate.profitFactor) >= 1.15 && aggregate.score >= 50 && aggregate.reliabilityScore >= 50) return 'Adopt';
    if (aggregate.netProfit < 0 || normalizePf(aggregate.profitFactor) < 1 || aggregate.reliabilityScore < 45) return 'Reject';
    return 'Watch';
  }

  if (aggregate.trades < Math.max(8, reference.trades * 0.25)) return 'Reject';
  if (
    aggregate.netProfit > reference.netProfit &&
    aggregate.score >= reference.score - 1 &&
    aggregate.recoveryFactor >= Math.max(0.8, reference.recoveryFactor * 0.75) &&
    aggregate.maxDrawdown <= Math.max(reference.maxDrawdown * 1.25, reference.maxDrawdown + 1)
  ) {
    return 'Adopt';
  }
  if (
    (aggregate.netProfit < reference.netProfit && aggregate.score < reference.score && normalizePf(aggregate.profitFactor) < normalizePf(reference.profitFactor)) ||
    (aggregate.maxDrawdown > Math.max(reference.maxDrawdown * 1.5, reference.maxDrawdown + 1) && aggregate.netProfit <= reference.netProfit) ||
    aggregate.reliabilityScore < 45 ||
    normalizePf(aggregate.profitFactor) < 1
  ) {
    return 'Reject';
  }
  return 'Watch';
}

function decideZeroVariant({
  baseline,
  deltaMaxDrawdown,
  deltaNetProfit,
  deltaProfitFactor,
  deltaScore,
  result,
}: {
  baseline: BacktestResult;
  result: BacktestResult;
  deltaNetProfit: number;
  deltaProfitFactor: number;
  deltaMaxDrawdown: number;
  deltaScore: number;
}): ZeroVariantComparisonRow['decision'] {
  if (result.tradeCount < Math.max(8, baseline.tradeCount * 0.35)) return 'Reject';
  if (deltaNetProfit > 0 && deltaScore >= 0 && deltaProfitFactor >= -0.1 && deltaMaxDrawdown <= Math.max(baseline.maxDrawdown * 0.15, 1)) return 'Adopt';
  if (deltaNetProfit < 0 && deltaScore < 0 && deltaProfitFactor < 0) return 'Reject';
  if (result.maxDrawdown > baseline.maxDrawdown * 1.35 && deltaNetProfit <= 0) return 'Reject';
  return 'Watch';
}

function normalizePf(value: number): number {
  return value >= 99 ? 5 : value;
}

function weightedAverage<T>(items: T[], valueOf: (item: T) => number, weightOf: (item: T) => number): number {
  const totalWeight = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0);
  if (totalWeight === 0) return 0;
  return items.reduce((sum, item) => sum + valueOf(item) * Math.max(0, weightOf(item)), 0) / totalWeight;
}

function sameStringSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

function formatLogicNameList(names: string[]): string {
  if (names.length === 0) return '-';
  const visible = names.slice(0, 3).join(' / ');
  return names.length > 3 ? `${visible} +${names.length - 3}` : visible;
}

function formatConditionList(items?: string[]): string {
  return items && items.length > 0 ? items.join(' / ') : '-';
}

function zeroConditionLabel(key: ZeroConditionKey): string {
  return zeroConditionOptions.find((condition) => condition.key === key)?.label ?? key;
}

function formatDisabledZeroConditions(items?: ZeroConditionKey[]): string {
  if (!items || items.length === 0) return '';
  const labels = items.map(zeroConditionLabel).join(', ');
  return ` / OFF ${labels}`;
}

function formatPrice(value: number | undefined): string {
  if (!Number.isFinite(value)) return '-';
  return Number(value).toFixed(3);
}

function shortDate(value: string): string {
  if (!value || value === '-') return '-';
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateTimeLabel(value: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default App;
