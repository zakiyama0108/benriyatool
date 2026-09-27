# タスク分解: 月次見直し(ジャンル・採用基準・執筆ルール)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 候補なしのジャンルの集計(仕様: requirements.md#見直しの実行-1・5、design.md「見直しの材料を集める処理」手順1〜2)
  - 🔴 `summarizeEmptyGenres(articles, from, to)`について次を確認するテストを書く: 期間内の記事だけが対象になる/ジャンルごとに候補なしの回数と有効回数(収集に失敗した回を除いた回数)が数えられる/収集に失敗した回は候補なしの回数にも有効回数にも数えない/生成に失敗したジャンルは候補なしと別に数えられる/有効回数が1回以上あり、そのすべての回で候補なしだったジャンルに「続いている」の印が付く/1回でも採用されたジャンルには印が付かない/その月のすべての回で収集に失敗した(有効回数0)ジャンルには印が付かない
  - 🟢 `app/research-digest/lib/reviewRecords.ts`に実装する

- Task 2: 見直し材料の収集スクリプト(仕様: design.md「見直しの材料を集める処理」)(TDD対象外。DB接続・ファイル読み込みを伴うため。集計ロジックはTask 1でテスト済み)
  - `scripts/research-digest/collect-review-data/`に独立した`package.json`(pg・dotenv)を作る
  - `collectReviewData.ts`を実装する: 記事データの集計(Task 1)と、`research_digest_feedback`の過去1か月・`is_test = false`の読み取り(`benriyatool_readonly`)を行い、フィードバックに対象研究の見出し・ジャンルを添えて、1つのJSONを標準出力に出す。DB接続に失敗した場合はフィードバックを空にして続ける

- Task 3: 月次再実行cronの冪等チェック(仕様: requirements.md#利用上限への到達時の再実行-7、design.md「実行環境の前提」)
  - 🔴 `shouldSkipMonthlyRetry(hasSuccessfulRun, reviewPrExists)`について次を確認するテストを書く: どちらかが`true`なら`true`(スキップ)/どちらも`false`なら`false`(再実行してよい)
  - 🟢 `app/research-digest/lib/shouldSkipMonthlyRetry.ts`に実装する

- Task 4: ワークフロー本体(仕様: design.md「実行環境の前提」「見直し案を作る処理」「見直し案をPRとして出す処理」)(TDD対象外。GitHub Actionsの定義とClaude CLIの起動のため。分岐の判定ロジックはTask 3の`shouldSkipMonthlyRetry`でテスト済みで、ここではその結果に従うだけ。trend-digest-monthly.ymlと同じ構造で実装する)
  - `.github/workflows/research-digest-monthly.yml`を作る: `schedule`(本番cron`30 0 2 * *`、再実行cron`30 12 2 * *`・`30 0 3 * *`・`30 12 3 * *`の3本)・`workflow_dispatch`で起動し、再実行cronの場合はまず`gh run list`・`gh pr list`で得た値をTask 3の`shouldSkipMonthlyRetry`に渡してスキップ判定を行う→(本番cron、またはスキップしない場合)Task 2(DB接続情報を使う材料収集。Claude CLI起動より前に完了させる)→Claude CLIのヘッドレス起動(design.md「見直し案を作る処理」の指示をプロンプトに含め、`--allowedTools`をファイル編集・`npm test`・`npm run lint`・`npm run build`・`npm run check:spec-coverage`に限定。DB接続情報・GitHub PATは渡さない)→変更の検知→ブランチ`research-digest/source-review/<年-月>`の作成・コミット・push・PR作成(自動マージしない。GitHub PATを使うのはこのステップのみ)を行う
  - コミット対象のパスを、`specs/research-digest/content-selection/requirements.md`・`content/research-digest/genres.json`・`specs/research-digest/content-generation/`に限る(記事生成CLIは`content-generation`のrequirements.md/design.mdを実行時に読み込むため変更対象外)

- Task 5: Actions Secretsの確認(仕様: design.md「実行環境の前提」)(TDD対象外。手動の確認作業)
  - `RESEARCH_DIGEST_GH_PAT`([weekly-publish/tasks.md](../weekly-publish/tasks.md)のTask 6「Actions Secretsの準備」で発行)・`CLAUDE_CODE_OAUTH_TOKEN`・`SUPABASE_READONLY_DB_URL`がそのまま使えることを確認する
  - `workflow_dispatch`で1回実行し、材料がない場合にPRが作られないこと、材料がある場合にPRが作られ自動マージされないことを確認する
