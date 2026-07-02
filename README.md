# AI FX LAB

AI FX LAB is a browser-based FX strategy research platform. It imports OHLCV CSV data, runs multiple backtest logics, compares performance, and evaluates whether a strategy is likely to remain reproducible outside the original sample.

Ver3.4 Stable focuses on validation quality. It does not implement AI prediction, automated trading, or live MT5 connectivity.

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

MT5 users can export compatible CSV data with:

```text
mt5/ExportRatesToCsv.mq5
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
- MT5 CSV export guide and MQL5 exporter
- Dashboard with equity curve, drawdown, monthly profit, and recommended logic

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

- Ver4: AI Logic Selector
  - AI reads Ver3.4 validation results
  - AI selects which logic to adopt
  - AI does not directly predict the market
- Future improvements
  - Saved research projects
  - More robust report templates
  - Parameter optimization history
  - Additional market regime analytics
  - Optional broker/live-data bridge after the validation workflow is mature
