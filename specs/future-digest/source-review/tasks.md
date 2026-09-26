# タスク分解: 月次見直し(ジャンル・採用基準・執筆ルール)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 候補なしの枠の集計(仕様: requirements.md#見直しの実行-1・5、design.md「見直しの材料を集める処理」手順1〜2)
  - 🔴 `summarizeEmptySlots(articles, from, to)`について次を確認するテストを書く: 期間内の記事だけが対象になる/枠ごとに候補なしの回数と、その時間軸を扱った回数が数えられる/収集に失敗した枠・生成に失敗した枠は候補なしと別に数えられる/その月にその時間軸を扱ったすべての回で候補なしだった枠に「続いている」の印が付く/1回でも採用された枠には印が付かない
  - 🟢 `app/future-digest/lib/reviewRecords.ts`に実装する

- Task 2: 見直し材料の収集スクリプト(仕様: design.md「見直しの材料を集める処理」)(TDD対象外。DB接続・ファイル読み込みを伴うため。集計ロジックはTask 1でテスト済み)
  - `scripts/future-digest/collect-review-data/`に独立した`package.json`(pg・dotenv)を作る
  - `collectReviewData.ts`を実装する: 記事データの集計(Task 1)と、`future_digest_feedback`の過去1か月・`is_test = false`の読み取り(`benriyatool_readonly`)を行い、フィードバックに対象予測の見出し・ジャンル・時間軸を添えて、1つのJSONを標準出力に出す。DB接続に失敗した場合はフィードバックを空にして続ける

- Task 3: ワークフロー本体(仕様: design.md「実行環境の前提」「見直し案を作る処理」「見直し案をPRとして出す処理」)(TDD対象外。GitHub Actionsの定義とClaude CLIの起動のため。trend-digest-monthly.ymlと同じ構造で実装する)
  - `.github/workflows/future-digest-monthly.yml`を作る: `schedule`(`30 23 1 * *`)・`workflow_dispatch`で起動し、Task 2(DB接続情報を使う材料収集。Claude CLI起動より前に完了させる)→Claude CLIのヘッドレス起動(design.md「見直し案を作る処理」の指示をプロンプトに含め、`--allowedTools`をファイル編集・`npm test`・`npm run lint`・`npm run build`・`npm run check:spec-coverage`に限定。DB接続情報・GitHub PATは渡さない)→変更の検知→ブランチ`future-digest/source-review/<年-月>`の作成・コミット・push・PR作成(自動マージしない。GitHub PATを使うのはこのステップのみ)を行う
  - コミット対象のパスを、`specs/future-digest/content-selection/requirements.md`・`content/future-digest/genres.json`・`specs/future-digest/content-generation/`に限る(記事生成CLIは`content-generation`のrequirements.md/design.mdを実行時に読み込むため変更対象外)

- Task 4: Actions Secretsの確認(仕様: design.md「実行環境の前提」)(TDD対象外。手動の確認作業)
  - `FUTURE_DIGEST_GH_PAT`([weekly-publish/tasks.md](../weekly-publish/tasks.md)のTask 4で発行)・`CLAUDE_CODE_OAUTH_TOKEN`・`SUPABASE_READONLY_DB_URL`がそのまま使えることを確認する
  - `workflow_dispatch`で1回実行し、材料がない場合にPRが作られないこと、材料がある場合にPRが作られ自動マージされないことを確認する
