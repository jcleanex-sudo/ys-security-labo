import { ChangeEvent, Dispatch, ReactNode, SetStateAction, useEffect, useMemo, useState } from 'react';
import {
  BacktestResult,
  BacktestSettings,
  Candle,
  CsvValidationReport,
  CurvePoint,
  LogicDefinition,
  LogicType,
  PeriodStat,
  StrategyKind,
  Timeframe,
  Trade,
  createLogic,
  defaultLogics,
  defaultSettings,
  filterCandles,
  generateSampleCsv,
  normalizeLogic,
  parseCsvDetailed,
  runBacktests,
  strategyLabels,
} from './backtest';

type View = 'Dashboard' | 'Backtest' | 'Logic Center' | 'Ranking' | 'Trade History';
type RankingSort = 'reliabilityScore' | 'score' | 'winRate' | 'profitFactor' | 'expectancy' | 'maxDrawdown' | 'netProfit';
type DataSource = 'CSV' | 'MT5';

type SavedBacktest = {
  savedAt: string;
  fileName: string;
  settings: BacktestSettings;
  results: BacktestResult[];
  trades: Trade[];
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
};

const views: View[] = ['Dashboard', 'Backtest', 'Logic Center', 'Ranking', 'Trade History'];
const timeframes: Timeframe[] = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'];
const defaultSymbols = ['USDJPY', 'EURUSD', 'GBPUSD', 'GBPJPY', 'AUDJPY', 'EURJPY', 'XAUUSD'];
const logicTypes: Array<LogicType | 'All'> = ['All', 'Trend', 'Reversal', 'Breakout', 'Volatility'];
const strategies = Object.keys(strategyLabels) as StrategyKind[];

function App() {
  const [activeView, setActiveView] = useState<View>('Dashboard');
  const [candles, setCandles] = useState<Candle[]>(() => readCandles());
  const [fileName, setFileName] = useState(() => localStorage.getItem(storageKeys.fileName) ?? 'sample-usdjpy.csv');
  const [logics, setLogics] = useState<LogicDefinition[]>(() => readLogics());
  const [settings, setSettings] = useState<BacktestSettings>(() => readMergedStorage(storageKeys.settings, defaultSettings));
  const [dataSource, setDataSource] = useState<DataSource>(() => readStorage<DataSource>(storageKeys.dataSource, 'CSV'));
  const [symbols, setSymbols] = useState<string[]>(() => readSymbols());
  const [dataUpdatedAt, setDataUpdatedAt] = useState(() => localStorage.getItem(storageKeys.dataUpdatedAt) ?? '');
  const [csvReport, setCsvReport] = useState<CsvValidationReport | null>(() => readStorage<CsvValidationReport | null>(storageKeys.csvReport, null));
  const savedBacktest = useMemo(() => readStorage<SavedBacktest | null>(storageKeys.results, null), []);
  const [lastRunAt, setLastRunAt] = useState(savedBacktest?.savedAt ?? '');
  const [message, setMessage] = useState('CSVを読み込むか、MT5接続準備エリアからデータソースを確認してください。');

  useEffect(() => localStorage.setItem(storageKeys.candles, JSON.stringify(candles)), [candles]);
  useEffect(() => localStorage.setItem(storageKeys.logics, JSON.stringify(logics)), [logics]);
  useEffect(() => localStorage.setItem(storageKeys.settings, JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem(storageKeys.fileName, fileName), [fileName]);
  useEffect(() => localStorage.setItem(storageKeys.dataSource, dataSource), [dataSource]);
  useEffect(() => localStorage.setItem(storageKeys.symbols, JSON.stringify(symbols)), [symbols]);
  useEffect(() => localStorage.setItem(storageKeys.dataUpdatedAt, dataUpdatedAt), [dataUpdatedAt]);
  useEffect(() => localStorage.setItem(storageKeys.csvReport, JSON.stringify(csvReport)), [csvReport]);

  const filteredCandles = useMemo(() => filterCandles(candles, settings), [candles, settings]);
  const computedResults = useMemo(() => runBacktests(candles, logics, settings), [candles, logics, settings]);
  const computedTrades = useMemo(() => computedResults.flatMap((result) => result.trades), [computedResults]);
  const results = computedResults.length > 0 ? computedResults : savedBacktest?.results ?? [];
  const trades = computedTrades.length > 0 ? computedTrades : savedBacktest?.trades ?? [];
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

  function prepareMt5Connection() {
    setDataSource('MT5');
    setMessage('MT5接続は準備中です。Ver4でAPI接続を追加できる構造にしています。');
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
                <span className="version-pill">Ver3.4 Stable</span>
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
          />
        )}
        {activeView === 'Backtest' && (
          <Backtest results={results} trades={trades} logics={logics} settings={settings} fileName={fileName} />
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
          <h2 className="section-heading">MT5 Data Bridge</h2>
          <p className="text-sm text-slate-500">MT5 API接続の前に、まずCSVブリッジで実データを安全に取り込みます。</p>
        </div>
        <div className="source-switch">
          {(['CSV', 'MT5'] as DataSource[]).map((source) => (
            <button
              key={source}
              className={`source-button ${dataSource === source ? 'source-button-active' : ''}`}
              onClick={() => onSelectDataSource(source)}
            >
              {source}{source === 'MT5' ? '（準備中）' : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 bridge-guide">
        <div>
          <p className="bridge-title">MT5 CSV Export Guide</p>
          <p className="bridge-copy">
            MT5から直接接続する前に、まず <code>mt5/ExportRatesToCsv.mq5</code> でCSVを出力してください。
            出力された <code>AIFXLAB_SYMBOL_TIMEFRAME_START_END.csv</code> をAI FX LABのCSV読み込みから取り込めます。
          </p>
        </div>
        <div className="guide-steps">
          <span>MT5</span>
          <span>ExportRatesToCsv.mq5</span>
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
              <button className="command-button" onClick={onConnectMt5}>
                MT5接続（準備中）
              </button>
            </div>
            <div className="data-manager-grid mt-4">
              <Metric label="データ数" value={dataProfile.count.toLocaleString()} />
              <Metric label="開始日" value={dataProfile.start} />
              <Metric label="終了日" value={dataProfile.end} />
              <Metric label="最終更新" value={formatDateTimeLabel(dataUpdatedAt)} />
              <Metric label="欠損データ" value={dataProfile.missingLabel} />
              <Metric label="品質スコア" value={csvReport ? `${csvReport.score}/100` : '-'} />
              <Metric label="MT5状態" value={dataSource === 'MT5' ? '接続準備中' : 'CSVモード'} />
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
}: {
  results: BacktestResult[];
  candles: Candle[];
  trades: Trade[];
  settings: BacktestSettings;
  logics: LogicDefinition[];
  lastRunAt: string;
  dataSource: DataSource;
  dataUpdatedAt: string;
}) {
  const leader = results[0];
  const leaderValidation = leader?.validation;
  const bestWinRate = Math.max(0, ...results.map((result) => result.winRate));
  const bestPf = Math.max(0, ...results.map((result) => result.profitFactor === 99 ? 0 : result.profitFactor));
  const bestScore = Math.max(0, ...results.map((result) => result.score));
  const bestReliabilityScore = Math.max(0, ...results.map((result) => result.validation?.score ?? 0));
  const highReliabilityCount = results.filter((result) => result.reliability === 'High').length;
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
          <Metric label="最高勝率" value={results.length ? `${bestWinRate.toFixed(1)}%` : '-'} />
          <Metric label="最高PF" value={results.length ? bestPf.toFixed(2) : '-'} />
          <Metric label="最高スコア" value={results.length ? bestScore.toFixed(1) : '-'} />
          <Metric label="Reliability Score" value={results.length ? `${bestReliabilityScore}/100` : '-'} />
          <Metric label="高信頼ロジック" value={results.length ? highReliabilityCount : '-'} />
          <Metric label="最新バックテスト" value={formatDateTimeLabel(lastRunAt)} />
          <Metric label="データ最終更新" value={formatDateTimeLabel(dataUpdatedAt)} />
          <Metric label="おすすめロジック" value={leader?.logicName ?? '-'} />
          <Metric label="総取引数" value={trades.length.toLocaleString()} />
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

function Backtest({
  results,
  trades,
  logics,
  settings,
  fileName,
}: {
  results: BacktestResult[];
  trades: Trade[];
  logics: LogicDefinition[];
  settings: BacktestSettings;
  fileName: string;
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
            <ExportPanel results={results} trades={trades} logics={logics} settings={settings} fileName={fileName} />
            <ResultTable results={results} />
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
          <ValidationReport result={selectedReport} />
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
}: {
  results: BacktestResult[];
  trades: Trade[];
  logics: LogicDefinition[];
  settings: BacktestSettings;
  fileName: string;
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
        <button className="secondary-button" onClick={() => downloadJson('logic-settings.json', { exportedAt: new Date().toISOString(), logics })}>
          Logic JSON
        </button>
      </div>
    </div>
  );
}

function ValidationReport({ result }: { result: BacktestResult }) {
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
                <span className="logic-meta">{logic.type} / {strategyLabels[logic.strategy]} / TP {logic.takeProfit} SL {logic.stopLoss}</span>
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
  function updateParam<Key extends keyof LogicDefinition['params']>(key: Key, value: number) {
    onChange({ params: { ...logic.params, [key]: value } });
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
          </div>
        </div>
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
    pips: trade.pips.toFixed(1),
    cost: trade.cost.toFixed(0),
    profit: trade.profit.toFixed(0),
    maxFloatingLoss: (trade.maxFloatingLoss ?? 0).toFixed(0),
    equity: trade.equity.toFixed(0),
    drawdown: trade.drawdown.toFixed(0),
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
  return saved.map((logic) => {
    const normalized = normalizeLogic(logic);
    const fallback = defaultLogics.find((item) => item.id === normalized.id || item.strategy === normalized.strategy);
    return normalizeLogic(logic, fallback);
  });
}

function readSymbols(): string[] {
  const saved = readStorage<string[]>(storageKeys.symbols, defaultSymbols);
  const merged = [...defaultSymbols, ...saved]
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
  return Array.from(new Set(merged));
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

function formatRatio(value: number | undefined): string {
  if (!Number.isFinite(value)) return '0.00';
  return Number(value).toFixed(2);
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
