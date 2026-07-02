# Changelog

## Ver3.4 Stable

- Added Walk Forward Test for repeated training and validation windows.
- Added Out-of-Sample Test with in-sample vs unseen-data comparison.
- Added Monte Carlo Simulation with 120 randomized trade-order runs.
- Added Market Regime Classification: Trend, Range, High Volatility, Low Volatility.
- Added Market Regime performance aggregation per logic.
- Added 100-point Reliability Score.
- Updated ranking to prioritize reproducibility through Reliability Score.
- Added Ver3.4 dashboard panels for reliability, walk forward, OOS, Monte Carlo, and regime fit.
- Marked the UI version as `Ver3.4 Stable`.

## Ver3.3

- Completed final build verification for the Ver3 platform.
- Stabilized the Vite/React project structure.
- Confirmed production build output.

## Ver3.2

- Added CSV quality validation.
- Added checks for required columns, invalid rows, duplicate timestamps, time sorting, and missing candles.
- Added CSV quality score and validation messages.

## Ver3.1

- Added MT5 CSV export workflow.
- Added `mt5/ExportRatesToCsv.mq5`.
- Documented the MT5-to-AI-FX-LAB CSV bridge flow.

## Ver3.0

- Added MT5 Data Bridge preparation.
- Added data source management for CSV and MT5 workflow planning.
- Added symbol and timeframe management.
- Prepared the structure for future MT5 connectivity without adding live trading.

## Ver2.0

- Added logic validation and analysis features.
- Added advanced metrics including expectancy, risk/reward, Sharpe ratio, recovery factor, payoff ratio, max floating loss, single-trade extremes, and consecutive win/loss streaks.
- Added monthly, weekday, hourly, equity curve, and drawdown analytics.
- Added reliability warnings based on sample size, drawdown, PF, win rate, and recovery factor.

## Ver1.0

- Built the MVP backtesting platform.
- Added CSV import and sample CSV loading.
- Added multiple built-in strategy logics.
- Added dashboard, ranking, backtest result table, logic editor, and trade history.
- Added localStorage persistence for data, settings, logics, and last results.
