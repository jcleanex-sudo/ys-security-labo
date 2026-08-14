# AI FX LAB

AI FX LAB is a browser-based FX strategy research platform. It imports OHLCV CSV data, runs multiple backtest logics, compares performance, and evaluates whether a strategy is likely to remain reproducible outside the original sample.

Ver4.0 adds AI Logic Selector, a rule-based AI layer that reads Ver3.4 validation results and selects which strategies should be adopted, watched, or rejected. It does not implement AI price prediction, automated trading, or live MT5 connectivity.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview a production build:

```bash
npm run preview
```

On Windows PowerShell, if `npm` is blocked by execution policy, use `npm.cmd` instead:

```bash
npm.cmd run build
```

## CSV Format

CSV files must include a header row with these columns:

```csv
time,open,high,low,close,volume
2025-01-01 00:00,150.123,150.300,149.980,150.210,1200
```

Requirements:

- `time`: parseable date/time string
- `open`, `high`, `low`, `close`: numeric prices
- `volume`: numeric volume
- Rows should be sorted by time
- Duplicate timestamps and missing candles are reported by the CSV quality checker

MT4 and MT5 users can export compatible CSV data with:

```text
mt4/ExportRatesToCsv.mq4
mt4/AIFXLAB_LiveCsvBridge.mq4
mt5/ExportRatesToCsv.mq5
mt5/AIFXLAB_LiveCsvBridge.mq5
```

## Implemented Features

- Multi-logic backtesting
- Logic Center for editing, duplicating, importing, and exporting strategies
- Strategy types: Trend, Reversal, Breakout, Volatility
- Built-in logics: MA Cross, RSI Reversal, MACD Cross, Bollinger Band Reversal, Breakout
- Ranking by score, win rate, PF, expectancy, DD, net profit, and reliability score
- Trade history export
- Result JSON/CSV export
- CSV quality validation
- MT4 / MT5 CSV export guide and MQL4/MQL5 exporters
- MT4 / MT5 Live CSV Bridge EA for signal-only sample collection
- Dashboard with equity curve, drawdown, monthly profit, and recommended logic
- AI Logic Selector for Adopt, Watch, and Reject decisions
- Operation Mode for realtime-style sample replay and signal logging

## MT4 / MT5 CSV Bridge

AI FX LAB supports CSV import from both MetaTrader 4 and MetaTrader 5.

- MT4 exporter: `mt4/ExportRatesToCsv.mq4`
- MT5 exporter: `mt5/ExportRatesToCsv.mq5`
- MT4 live bridge EA: `mt4/AIFXLAB_LiveCsvBridge.mq4`
- MT5 live bridge EA: `mt5/AIFXLAB_LiveCsvBridge.mq5`
- Output format: `time,open,high,low,close,volume`
- Output file example: `AIFXLAB_USDJPY_H1_20250101_20251231.csv`

The manual scripts export historical data. The live bridge EAs refresh `AIFXLAB_LIVE_SYMBOL_TIMEFRAME.csv` on a timer for Operation Mode. They do not execute trades, send orders, or let AI FX LAB control a broker account.

## Ver4.0 Additions

Ver4.0 adds AI Logic Selector:

- New `AI Selector` screen
- Rule-based AI selection without external AI APIs
- Adoption status per logic: Adopt, Watch, Reject
- AI comments for each logic
- Adoption and rejection reasons
- Evaluation using Reliability Score, PF, max DD, Out-of-Sample results, Monte Carlo results, trade count, and Market Regime fit
- Dashboard metrics for AI recommended logic count, Adopt count, Watch count, Reject count, and current top AI logic

## Realtime Sample Operation

Operation Mode replays loaded sample candles like realtime market data. It generates signal-only alerts from the selected logic and records a downloadable sample log.

- Start, pause, and reset sample replay
- Live CSV Feed for MT4/MT5-updated CSV snapshots
- Signal-only MT4/MT5 Live CSV Bridge EA support
- Real FX chart image panel for MT4, MT5, TradingView, or broker screenshots
- Current signal, price, TP, SL, confidence, and market regime
- Realtime-style signal log
- `operation-sample-signals.csv` export
- No order execution and no broker connection

## Ver3.4 Additions

Ver3.4 adds validation tools for selecting strategies that are more likely to reproduce in future data:

- Walk Forward Test
  - Splits data into repeated training and validation windows
  - Compares in-sample and out-of-sample performance per window
- Out-of-Sample Test
  - Splits known data from unseen validation data
  - Reports OOS profit, PF, DD, trade count, and retention rate
- Monte Carlo Simulation
  - Randomizes trade order over 120 runs
  - Reports average profit, average DD, worst DD, profit distribution, and win-rate distribution
- Market Regime Classification
  - Classifies periods as Trend, Range, High Volatility, or Low Volatility
  - Aggregates which logic performs best in each regime
- Reliability Score
  - 100-point composite score using PF, max DD, OOS results, Monte Carlo results, trade count, and Walk Forward results
  - Ranking defaults to Reliability Score

## Roadmap

- Future improvements
  - Explainable AI Selector tuning
  - AI selection history and report export
  - Saved research projects
  - More robust report templates
  - Parameter optimization history
  - Additional market regime analytics
  - Optional broker/live-data bridge after the validation workflow is mature
