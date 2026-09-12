# タスク分解: 週2回の記事自動生成・公開

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 記事データの組み立て(仕様: design.md「1回分の記事を生成する処理」手順5)
  - 🔴 選定結果(edition・9ジャンル分の候補)と生成済みの見出し・本文の配列から、`id`(`<date>-<edition>`)・`edition`・`date`・`topics`(GENRE_ORDER順に並び替え済み)を持つArticleが組み立てられることを確認するテストを書く。生成が失敗した候補は結果から除外されていることも確認する
  - 🟢 `app/trend-digest/lib/assembleArticle.ts`に`assembleArticle(edition, date, topics): Article`を実装する

- Task 2: 記事データの書き出しCLI(仕様: design.md「関連するファイル」)
  - TDD対象外(assembleArticleの薄い呼び出し+ファイル書き出しのみのため。ロジック自体はTask 1でテスト済み)
  - `scripts/trend-digest/write-article.ts`を実装する。edition・実行日・生成済みトピック(JSON)を引数に取り、`content/trend-digest/articles/<id>.json`へ書き出す

- Task 3: ワークフロー本体の実装(仕様: design.md「実行環境の前提」「1回分の記事を生成する処理」「PRを作成しCIの結果を待つ処理」「PRを自動マージする処理」)
  - TDD対象外(GitHub Actionsワークフロー定義のためユニットテスト不可。ai-dev-digest-daily.ymlと同じ構造で実装する)
  - `.github/workflows/trend-digest-weekly.yml`を作成する:
    - `schedule`に火曜用(`43 22 * * 1`)・金曜用(`43 22 * * 4`)の2エントリ、`workflow_dispatch`(edition入力)、`workflow_run`(CI完了通知)を設定する
    - `publish`ジョブ: `TREND_DIGEST_GH_PAT`でcheckout→Claude Code CLIインストール→実行日(JST)・edition算出→作業用ブランチ作成→`collect-and-select.ts`実行→候補不足によるスキップ判定→`generate-content.ts`実行→`write-article.ts`実行→コミット・push・PR作成・`gh pr merge --auto --squash`
    - `record-ci-failure`ジョブ: `trend-digest/articles/**`ブランチ由来のPRのCI失敗時にコメントを追記する(ai-dev-digest-daily.ymlの同名ジョブと同じ構造)

- Task 4: GitHub Actions Secretsの準備(仕様: design.md「実行環境の前提」)(TDD対象外。手動のインフラ設定作業)
  - fine-grained PAT(Contents・Pull requestsのwrite権限、このリポジトリのみ)を発行し`TREND_DIGEST_GH_PAT`として保存する
  - 既存の`CLAUDE_CODE_OAUTH_TOKEN`(ai-dev-digestで発行済み)がそのまま使えることを確認する(新規発行は不要)
  - 運用開始前に、上記が実際にActions Secretsへ設定されていることを確認する
