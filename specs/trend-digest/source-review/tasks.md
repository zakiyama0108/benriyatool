# タスク分解: 月次見直し(情報源・採用基準・生成ルール)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: `trend_digest_feedback`への`benriyatool_readonly`向けSELECTポリシーの確認(仕様: design.md「データベース設計」)(TDD対象外。[article-detail/tasks.md](../article-detail/tasks.md)のTask 1で作成済みのマイグレーションにSELECTポリシーが含まれていることを確認するだけの作業)
  - `supabase/migrations/<timestamp>_create_trend_digest_feedback.sql`に`benriyatool_readonly`へのGRANT・RLSポリシーが含まれていることを確認する(未反映なら本タスクで追加する)

- Task 2: 見直し材料の収集スクリプト(仕様: design.md「見直しの材料を集める処理」)
  - `scripts/trend-digest/collect-review-data/`に独立した`package.json`(pg/dotenv)を作成する
  - `scripts/trend-digest/collect-review-data/collectReviewData.ts`を実装する。集計開始日を引数に取り、(a)`content/trend-digest/articles/*.json`から直近1ヶ月分のファイルを読み、各回の`topics`に含まれなかったジャンル(掲載見送り)を集計する、(b)`trend_digest_feedback`から直近1ヶ月・`is_test = false`のレコードを`benriyatool_readonly`で取得する、(c)下記の観測ログ集計、の3種類のデータをまとめてJSON標準出力する
  - TDD対象外(DB接続・ファイルI/Oを伴う集計スクリプトのため。ai-dev-digestのcollectReviewData.tsと同じ扱い)

- Task 2b: 観測ログからの継続度ラベル再集計・地域不明率の集計(仕様: requirements.md#選定領域の見直し案の粒度・提示方法-9〜10、design.md「見直しの材料を集める処理」手順3)
  - 🔴 `content/trend-digest/history/`配下の観測ログ(直近1ヶ月分に限らず、trend-historyの`aggregateHistory`が要求する全期間分)を一時ディレクトリに置き、次を確認するテストを書く: あるジャンルで`meetsCriteria`が真の観測が1件以上ある回のうち、その回の集計対象記事(直近1ヶ月分の`content/trend-digest/articles/*.json`)で実際に掲載された話題の継続度ラベルが「流行前」だった回数が正しく数えられること、`meetsCriteria`が真の観測が0件の回はこの集計に数えられないこと(観測ログが非空なだけでは「候補が収集できている」と扱わないことの回帰テスト)、ジャンルごとの観測項目のうち発祥地域・主な流行地域が「不明」(null・空配列)のまま記録された割合が正しく算出されること
  - 🟢 `app/trend-digest/lib/reviewRecords.ts`(または新規`app/trend-digest/lib/sourceReviewHistoryStats.ts`)に、trend-historyの`aggregateHistory`・`judgeDurationLabel`を再利用して上記2種類のジャンルごとの集計を返す関数を実装する(継続度ラベルの再判定ロジックを二重に持たない)
  - `collectReviewData.ts`(Task 2)からこの関数を呼び出し、出力JSONに含める

- Task 3: ワークフロー本体の実装(仕様: design.md「実行環境の前提」「見直し案を作成する処理」「見直し案をPRとして提案する処理」)
  - TDD対象外(GitHub Actionsワークフロー定義+Claude Code CLIのヘッドレス起動のためユニットテスト不可。ai-dev-digest-monthly.ymlと同じ構造で実装する)
  - `.github/workflows/trend-digest-monthly.yml`を作成する: `schedule`(月1回。例: `0 23 1 * *` = 毎月1日23:00 UTC = 2日08:00 JST)・`workflow_dispatch`をトリガーに、Task 2のスクリプト実行→Claude Code CLIヘッドレス起動(design.md「見直し案を作成する処理」の指示内容をプロンプトに含める)→変更検知→ブランチ作成・コミット・push・PR作成(自動マージしない)を行う
  - 変更検知・git addの対象パスに、選定領域(`specs/trend-digest/content-selection/requirements.md`・`content/trend-digest/watchlist.json`・`content/trend-digest/criteria.json`・`app/trend-digest/lib`・`__tests__/trend-digest/lib`・`scripts/spec-coverage-skip.json`)と生成領域(`specs/trend-digest/content-generation`・`scripts/trend-digest/generate-content.ts`)の両方を含める

- Task 4: GitHub Actions Secretsの準備(仕様: design.md「実行環境の前提」)(TDD対象外。手動のインフラ設定作業)
  - 既存の`TREND_DIGEST_GH_PAT`([weekly-publish](../weekly-publish/tasks.md)Task 4で発行済み)・`CLAUDE_CODE_OAUTH_TOKEN`・`SUPABASE_READONLY_DB_URL`(いずれもai-dev-digest・weekly-publishと共用)がそのまま使えることを確認する(新規発行は不要)
  - 運用開始前に、上記が実際にActions Secretsへ設定されていることを確認する
