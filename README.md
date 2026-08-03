# KEIBA EDGE LAB

`betako-public-site` の「全レース比較・見送り優先・検証表示」という思想を引き継ぎつつ、コードとデータを共有しない競馬専用の静的サイトです。Render / Manusは使わず、GitHub Pages + GitHub Actionsだけで公開できます。

## 初期版で動くもの

- 開催日、中央競馬10場、1R〜12Rの選択
- 全レースの手動予想と端末内保存
- `UP / DOWN / WATCH / DATA BLOCKED` の安全判定
- 期待度ランキングと見送り理由
- 本線6点 + 押さえ6点の3連単フォーメーション
- 点別の手入力オッズとnet edge順位
- 承認済みCSVからの過去レース取り込み口
- 時系列70/30分割による純損益、利益係数、最大DD、勝率95% CI
- 全安全ゲート通過時だけの重み更新
- 学習状況の公開表示
- 選択中レースを開く共有URL

入力した予想はブラウザのlocalStorageにのみ保存されます。共有URLは開催・レース選択を共有しますが、個人の入力内容は公開しません。公開予想を共有する場合は、権利確認済みデータをレビュー付きでリポジトリへ追加する設計に拡張してください。

## ローカル確認

```powershell
cd keiba-edge-lab
python -m http.server 8080
```

別ターミナルで検証します。

```powershell
npm test
python scripts/validate_data.py
python scripts/evaluate_weights.py
```

## 過去レースの追加

権利確認済みCSVだけを使います。列は `race_id,decided_at,baseline_probability,candidate_probability,market_probability,odds,result` です。

```powershell
python scripts/import_history.py approved-history.csv
```

インポート直後は安全のため `source_terms_confirmed=false` になります。利用条件を記録して人が確認した後だけtrueにし、検証を実行します。最低200レース、後半の検証期間60レース、安全性の全条件を通らなければ重みは更新されません。

## GitHub Pages

専用の `keiba-site` ブランチにある `.github/workflows/pages.yml` がデータと計算を検証し、Pages成果物として公開します。既存の `main` ブランチや他プロジェクトは変更しません。

公開URLは通常、次の形式です。

`https://jcleanex-sudo.github.io/ys-security-labo/`

## 未接続のデータ元

初期版はJRA等へのネットワーク取得処理を持ちません。理由と導入条件は [docs/data-policy.md](docs/data-policy.md) に記録しています。的中や利益を保証しません。
