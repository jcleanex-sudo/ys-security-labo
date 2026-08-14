# AI FX LAB MT5 CSV Bridge

AI FX LAB can read MT5 data through CSV files. This folder includes two options:

- `ExportRatesToCsv.mq5`: manual historical CSV export script
- `AIFXLAB_LiveCsvBridge.mq5`: signal-only Expert Advisor that refreshes a live CSV file on a timer

Neither file sends orders, modifies positions, closes trades, or connects AI FX LAB directly to a broker account.

## CSV Format

Both exporters create this header:

```csv
time,open,high,low,close,volume
```

Example row:

```csv
2025-01-01 00:00,150.123,150.300,149.980,150.210,1200
```

AI FX LAB reads this timestamp format directly.

## Manual Historical Export

Use this when you want a fixed backtest sample.

1. Open MT5.
2. Select `File > Open Data Folder`.
3. Copy `ExportRatesToCsv.mq5` into `MQL5 > Scripts`.
4. Open MetaEditor and compile `Scripts > ExportRatesToCsv.mq5`.
5. Drag `ExportRatesToCsv` from `Navigator > Scripts` onto a chart.
6. Set symbol, timeframe, start date, and end date.
7. Open the generated file from `MQL5 > Files`.

Output file name:

```text
AIFXLAB_SYMBOL_TIMEFRAME_START_END.csv
```

## Live CSV Bridge EA

Use this when you want AI FX LAB Operation Mode to keep reading the latest MT5 bars.

1. Open MT5.
2. Select `File > Open Data Folder`.
3. Copy `AIFXLAB_LiveCsvBridge.mq5` into `MQL5 > Experts`.
4. Open MetaEditor and compile `Experts > AIFXLAB_LiveCsvBridge.mq5`.
5. Drag `AIFXLAB_LiveCsvBridge` from `Navigator > Expert Advisors` onto the chart.
6. Keep `Algo Trading` enabled so the EA timer can run.
7. Confirm the CSV is updating in `MQL5 > Files`.
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

## Notes

- This is a sample collection bridge, not an auto-trading EA.
- The EA contains no `CTrade`, `OrderSend`, position modification, or close logic.
- `volume` uses MT5 `tick_volume`.
- If rows are missing, open the symbol/timeframe chart in MT5 and load more history first.
