# 個人ワークスペース引継ぎ

## 開くプロジェクト

このファイルがあるフォルダを、Codexの個人ワークスペースでローカルプロジェクトとして開く。

```text
C:\Users\jclea\OneDrive\デスクトップ\肉の太　レシピ\ドキュメント\ys-security-labo
```

実行環境の選択肢が出た場合は、未コミット変更を保持するため `Local` を選ぶ。`Worktree` や `Cloud` から開始しない。

## 個人側の最初の指示

新しいタスクへ、次の文章をそのまま送る。

```text
PERSONAL_WORKSPACE_HANDOFF.md、AGENTS.md、README.mdを最初に読んでください。
これは同じ所有者のチームワークスペースから個人ワークスペースへ引き継いだローカルプロジェクトです。
git statusを確認し、既存ファイル、未コミット変更、未追跡ディレクトリを削除・上書きしないでください。
各サブプロジェクトは独立したアプリとして扱い、作業対象を確認してから変更してください。
```

## 現在の保存状態

- ルートリポジトリ: `main`
- `origin/main` より1コミット先行
- 最終確認時のHEAD: `d7f7402 AI FX LAB Ver3.4 stable`
- ルートには変更済みファイルと、多数の未追跡サブプロジェクトが存在する
- 未追跡は「不要」という意味ではない。システム本体を含むため削除しない

主な変更済みファイル:

- `CHANGELOG.md`
- `README.md`
- `mt5/README.md`
- `src/App.tsx`
- `src/backtest.ts`
- `src/styles.css`

## 主なサブプロジェクト

- `ai-bridge-japan`
- `ai-eigyo-kun-lp`
- `ai-eigyo-kun-site`
- `betako-free-site`
- `betako-public-site`
- `betako-publish-work`
- `betako-system-repo`
- `betako_deploy_work`
- `boatrace-ai-repo`
- `casino-slot-autobet`
- `fundhub-mvp`
- `kage-prediction-engine`
- `keiba-edge-lab`
- `keirin-auto-main`
- `minamo-koroko`
- `mt4`
- `mt5`
- `sc03g-upgrade`

## 重要な注意

- `.env`、APIキー、デプロイトークンをGitへ追加したり、会話へ表示したりしない
- `kage-prediction-engine/.env` は機密情報として扱う
- `ai-bridge-japan` のGitリモートはチーム管理環境を指しているため、勝手に削除・変更しない
- `betako-system-repo` など、ルート内に独立した `.git` を持つディレクトリがある
- サブプロジェクトをまとめてルートへコミットしない
- `git clean`、`git reset --hard`、一括削除を実行しない

## 引継ぎ完了の確認

個人ワークスペースで次を確認できれば、ローカルシステムの引継ぎは完了。

1. このファイルを読める
2. `git status` で既存の変更が表示される
3. `src` と各サブプロジェクトのファイルを参照できる
4. 作業対象を指定してCodexへ修正・実行を依頼できる

