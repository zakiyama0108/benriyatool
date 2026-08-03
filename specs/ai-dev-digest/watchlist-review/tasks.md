# タスク分解: ウォッチリスト・採用基準の月次見直し

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## コード側の実装

- Task 1: 基準未達記録の集計(仕様: requirements.md#見直しの実行-1、design.md「見直しの材料を集める処理」手順1)
  - 🔴 複数日の記事データ(フィクスチャ)から、指定期間内の`belowCriteria: true`のトピックだけが抽出されることを確認するテストを書く(期間外のファイルが混ざっていても除外されること含む)
  - 🟢 `scripts/ai-dev-digest/collect-review-data/collectReviewData.ts`に`collectBelowCriteriaRecords(dir, sinceDate)`を実装する

- Task 2: フィードバックの取得(仕様: design.md「見直しの材料を集める処理」手順2)
  - 🔴 `pg`クライアントをモックし、期間・`is_test = false`の条件でSELECTが発行されることを確認するテストを書く
  - 🟢 `collectReviewData.ts`に`collectFeedback(sinceDate)`を実装する

- Task 3: 独立した依存関係の用意(仕様: design.md「関連するファイル」)(TDD対象外。パッケージ定義のみのため)
  - `scripts/ai-dev-digest/collect-review-data/package.json`を作成する(`.claude/skills/data-check/package.json`と同様に`pg`/`dotenv`を依存として持つ。本体`package.json`には追加しない)

- Task 4: ワークフロー本体の実装(仕様: design.md「実行環境の前提」「見直し案を作成する処理」「見直し案をPRとして提案する処理」)(TDD対象外。GitHub Actionsのワークフロー定義ファイルであり、内部で呼ぶcollectReviewData.tsはTask1・2でテスト済み、Claude Code呼び出し自体はエージェントの推論のためユニットテスト対象を持たない)
  - `.github/workflows/ai-dev-digest-monthly.yml`を実装する。月1回のcronトリガーで、`collectReviewData.ts`の実行→収集データ・関連specを渡してClaude Code CLIをヘッドレスモードで起動(見直し案の検討・ファイル編集)→変更があればブランチ作成・コミット・push・`gh pr create`までを行う(`gh pr merge --auto`は呼ばない)
  - GitHub書き込みには[daily-publish](../daily-publish/design.md)と同じ`secrets.AI_DEV_DIGEST_GH_PAT`を使う

## 運用設定(コード外)

- Task 5: GitHub Actions Secretsの設定(仕様: design.md「実行環境の前提」)
  - `SUPABASE_READONLY_DB_URL`をこのリポジトリのActions Secretsに保存する(2026-08第2次改定でdocs/adr/0004が許容した例外。設定前にADRの改定内容を確認する)
  - `CLAUDE_CODE_OAUTH_TOKEN`が未設定であれば同様に保存する(daily-publishで設定済みなら流用する。2026-08第3次改定でANTHROPIC_API_KEYから変更)
  - 初回実行前に、上記のSecretsが実際に設定されていることを確認する(テスト実行1回分をレビューする)

## 動作確認

- Task 6: 通しの動作確認(仕様: requirements.md#見直しの実行-1〜2、requirements.md#承認フロー-3)
  - Task 1〜5が揃った状態で月次実行を行い、`specs/ai-dev-digest/content-selection/requirements.md`と`content/ai-dev-digest/watchlist.json`/`criteria.json`の両方を変更するPRが作成されることを確認する
  - 作成されたPRが自動マージされず、通常のレビュー必須フローのままであることを確認する
