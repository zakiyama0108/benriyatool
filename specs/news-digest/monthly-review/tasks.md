# タスク分解: 月次見直し(選定・生成)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 見直し材料の集計スクリプト(仕様: requirements.md#見直しの実行-1、design.md「見直しの材料を集める処理」)
  - `scripts/news-digest/collect-review-data/`を独立したpackage.json(pg/dotenv使用)として作成する(ai-dev-digestの`collect-review-data`と同じ依存隔離パターン)
  - 🔴 `content/news-digest/articles/*.json`から直近1ヶ月分の`belowCriteria: true`トピックを集計する関数のテストを書く(発生週・カテゴリ・理由が集計されること)
  - 🟢 `collectReviewData.ts`にファイル集計部分を実装する
  - DB接続部分(`news_digest_feedback`のSELECT)はTDD対象外(実DB接続を伴うため)。`benriyatool_readonly`ロールで接続し、直近1ヶ月分・`is_test = false`のレコードを取得する

- Task 2: 月次ワークフローの作成(仕様: design.md「実行環境の前提」「見直し案をPRとして提案する処理」)
  - TDD対象外(GitHub Actionsのワークフロー定義・エージェントのヘッドレス実行オーケストレーションのため)
  - `.github/workflows/news-digest-monthly.yml`を作成する。月1回起動→`collectReviewData.ts`実行→Claude Code CLIのヘッドレス起動(選定/生成の見直し案検討、判断材料の表を`/tmp/news-digest-monthly-review-pr-body.md`に書き出す指示を含む)→変更があればコミット・push・PR作成(`news-digest/monthly-review/<year-month>`ブランチ、`--body-file`でPR本文を読み込む)、までを行う
  - 両領域とも材料が0件の月はPRを作成しないステップにする
  - 自動マージは行わない(auto-merge有効化のステップを含めない)

- Task 3: Secretsの確認(運用タスク、design.md「実行環境の前提」「セキュリティ」)
  - TDD対象外(コード変更を伴わない運用手順)
  - ai-dev-digestが保存済みの`SUPABASE_READONLY_DB_URL`・`CLAUDE_CODE_OAUTH_TOKEN`がこのワークフローからも参照できることを確認する
  - [weekly-publish/tasks.md](../weekly-publish/tasks.md)Task 4で発行した`NEWS_DIGEST_GH_PAT`がこのワークフローからも参照できることを確認する
