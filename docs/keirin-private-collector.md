# 競輪ローカル収集ツール

このツールは、個人の検証用としてKEIRIN.JP公式ページをローカル保存します。書面等で確認できる自動取得許可の参照が登録されている場合に限り、GitHub Actions版は当日の出走表・3連単オッズ・確定結果を取得し、検証済み表示用JSONだけをPagesへ配信します。

## 安全制限

- 取得先は `https://keirin.jp/pc/` または `https://keirin.jp/sp/` 配下のみ
- `robots.txt` を取得前に確認し、確認できない場合も `DATA BLOCKED`
- 最短取得間隔は60秒、初期値は90秒
- GitHub Actions版は当日開催だけを最大2場ずつ処理し、ログインや投票操作は行わない
- 1回の応答は最大5MB
- 保存先 `private_keirin_data/` は `.gitignore` でGit管理外
- 元取得データはGit管理・Pages成果物から除外し、整形・検証済みJSONだけを公開

## 使い方

PowerShellでプロジェクトへ移動し、対象月を1回取得します。

```powershell
python scripts/collect_keirin_private.py --schedule 2026-08
```

特定の公式ページを1件だけ保存する場合:

```powershell
python scripts/collect_keirin_private.py --url "https://keirin.jp/pc/raceschedule?scym=08&scyy=2026"
```

権利者から自動取得の許可を得ており、robots.txtより許可条件を優先できる場合だけ、許可の管理用参照を記録して実行します。

```powershell
python scripts/collect_keirin_private.py --schedule 2026-08 --permission-reference "user-attested-2026-08-04"
```

参照文字列は取得ごとの `metadata.json` に保存されます。この指定は許可そのものを作る機能ではありません。実際に許可を得た場合だけ使用してください。

保存物は `private_keirin_data/<UTC時刻>/` の `source.html`、`metadata.json`、`tables.json` です。サイト構造変更、取得拒否、robots確認失敗などの場合は、推測で補完せず `DATA BLOCKED` で終了します。

ブラウザで取得したレース別出走表・3連単オッズJSONは、次のコマンドで全組み合わせが揃っているか検証できます。

```powershell
python scripts/validate_keirin_race_export.py private_keirin_data/<UTC時刻>/race_odds.json
```

出走車番から作れる3連単全組み合わせが1件でも欠ける、オッズが数値でない、許可参照がない、公開フラグが有効になっている場合は `DATA BLOCKED` になります。

自動定期実行は `.github/workflows/keirin-auto-update.yml` で1日5回です。リポジトリ変数 `KEIRIN_PERMISSION_REFERENCE` が空なら `DATA BLOCKED` で停止します。許可条件が変わった場合は変数を削除し、定期実行を停止してください。

## 現在の取得状態

2026-08-04の初回実取得試験では、公式サイトの `robots.txt` 判定により開催日程ページの自動取得は `DATA BLOCKED` になりました。その後、利用者から権利者の許可取得済みとの確認を受けたため、許可参照を必須記録した実行に限り取得できる構造を追加しました。
