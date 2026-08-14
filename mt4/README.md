# AI FX LAB MT4 CSV Bridge

AI FX LAB can read MT4 data through CSV files. This folder includes two options:

- `ExportRatesToCsv.mq4`: manual historical CSV export script
- `AIFXLAB_LiveCsvBridge.mq4`: signal-only Expert Advisor that refreshes a live CSV file on a timer

These bridges do not send orders, connect AI FX LAB to a live account, or run automated trading. They only export OHLCV data for research, backtesting, AI Selector, and Operation sample replay.

## CSV Format

The generated CSV header is:

```csv
time,open,high,low,close,volume
```

Example row:

```csv
2025-01-01 00:00,150.123,150.300,149.980,150.210,1200
```

AI FX LAB reads this timestamp format directly during CSV import.

## Output File Name

```text
AIFXLAB_SYMBOL_TIMEFRAME_START_END.csv
```

Example:

```text
AIFXLAB_USDJPY_H1_20250101_20251231.csv
```

## Manual Historical Export

Use this when you want a fixed backtest sample.

### Install

1. Open MT4.
2. Select `File > Open Data Folder`.
3. Open `MQL4 > Scripts`.
4. Copy `ExportRatesToCsv.mq4` into that folder.
5. Restart MT4 or refresh `Navigator > Scripts`.

### Compile

1. Open `Tools > MetaQuotes Language Editor`.
2. Open `Scripts > ExportRatesToCsv.mq4`.
3. Click `Compile`.
4. Confirm `ExportRatesToCsv.ex4` is created without errors.

### Export CSV

1. In MT4, open the chart symbol and timeframe you want to export.
2. Make sure enough historical bars are loaded.
3. Drag `ExportRatesToCsv` from `Navigator > Scripts` onto the chart.
4. Set the inputs:

| Input | Description |
| --- | --- |
| `InpSymbol` | Symbol to export, for example `USDJPY`, `EURUSD`, `XAUUSD` |
| `InpTimeframe` | Timeframe, for example `PERIOD_M1`, `PERIOD_H1`, `PERIOD_D1` |
| `InpStartDate` | Export start date/time |
| `InpEndDate` | Export end date/time |

5. The CSV is saved in `MQL4 > Files`.

Open it from:

```text
MT4 > File > Open Data Folder > MQL4 > Files
```

## Live CSV Bridge EA

Use this when you want AI FX LAB Operation Mode to keep reading the latest MT4 bars.

1. Open MT4.
2. Select `File > Open Data Folder`.
3. Copy `AIFXLAB_LiveCsvBridge.mq4` into `MQL4 > Experts`.
4. Open MetaEditor and compile `Experts > AIFXLAB_LiveCsvBridge.mq4`.
5. Drag `AIFXLAB_LiveCsvBridge` from `Navigator > Expert Advisors` onto the chart.
6. Keep `AutoTrading` enabled so the EA timer can run.
7. Confirm the CSV is updating in `MQL4 > Files`.
8. In AI FX LAB, open `Operation` and click `Select Live CSV`.
9. Select the generated `AIFXLAB_LIVE_...csv` file.

Live output file name:

```text
AIFXLAB_LIVE_SYMBOL_TIMEFRAME.csv
```

Example:

```text
AIFXLAB_LIVE_USDJPY_H1.csv
```

## Live EA Inputs

| Input | Description |
| --- | --- |
| `InpSymbol` | Symbol to export when `InpUseChartSymbol` is false |
| `InpTimeframe` | Timeframe to export when `InpUseChartTimeframe` is false |
| `InpBarsToExport` | Number of recent bars written to CSV |
| `InpUpdateSeconds` | CSV refresh interval |
| `InpUseChartSymbol` | Use the chart symbol |
| `InpUseChartTimeframe` | Use the chart timeframe |

## Import Into AI FX LAB

1. Open AI FX LAB.
2. Select `MT4` or `CSV` in Data Source.
3. Use the CSV import button.
4. Select the exported `AIFXLAB_...csv` file.
5. Check CSV quality, then run Backtest, AI Selector, and Operation sample replay.

## Notes

- MT4 must have historical bars loaded before export.
- If the exported row count is too small, scroll back on the chart or download more history from MT4 History Center.
- `volume` uses MT4 tick volume.
- The live EA contains no `OrderSend`, order modification, or order close logic.
- This bridge is for sample collection and research only.
