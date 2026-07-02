# AI FX LAB MT5 CSV Bridge

`ExportRatesToCsv.mq5` は、MetaTrader 5の過去チャートデータをAI FX LABで読み込めるCSV形式へ書き出すスクリプトです。

今回はMT5 API接続や自動売買は行いません。

## CSV形式

出力ヘッダー:

```csv
time,open,high,low,close,volume
```

出力ファイル名:

```text
AIFXLAB_SYMBOL_TIMEFRAME_START_END.csv
```

例:

```text
AIFXLAB_USDJPY_H1_20250101_20251231.csv
```

## 設置方法

1. MT5を開きます。
2. メニューから `File > Open Data Folder` を開きます。
3. `MQL5 > Scripts` フォルダを開きます。
4. `ExportRatesToCsv.mq5` を `Scripts` フォルダへ配置します。

## コンパイル方法

1. MT5で `Tools > MetaQuotes Language Editor` を開きます。
2. `Scripts > ExportRatesToCsv.mq5` を開きます。
3. `Compile` を押します。
4. エラーがなければ `ExportRatesToCsv.ex5` が生成されます。

## CSV出力方法

1. MT5の `Navigator` から `Scripts` を開きます。
2. `ExportRatesToCsv` をチャートへドラッグします。
3. Inputsで以下を指定します。

| Input | 内容 |
| --- | --- |
| `InpSymbol` | 出力するSymbol。例: `USDJPY`, `EURUSD`, `XAUUSD` |
| `InpTimeframe` | 出力する時間足。例: `PERIOD_M1`, `PERIOD_H1`, `PERIOD_D1` |
| `InpStartDate` | 開始日時 |
| `InpEndDate` | 終了日時 |

4. 実行後、CSVは `MQL5 > Files` に保存されます。

保存先を開くには、MT5で `File > Open Data Folder` を開き、`MQL5 > Files` を確認してください。

## AI FX LABへの読み込み方法

1. AI FX LABを開きます。
2. `Data Source` は `CSV` を選択します。
3. `CSV読み込み` から、MT5が出力したCSVを選択します。
4. Data Managerで以下を確認します。
   - データ数
   - 開始日
   - 終了日
   - 欠損データ
5. Backtest / Ranking / Trade Historyで検証します。

## 注意

- MT5のヒストリーデータが不足している場合、出力本数が少なくなることがあります。
- 先にMT5上で対象SymbolとTimeframeのチャートを開き、必要な期間までスクロールしてヒストリーを取得しておくと安定します。
- 出力CSVの時刻は `YYYY-MM-DD HH:MM` 形式です。
- `volume` はMT5の `tick_volume` を使用しています。
