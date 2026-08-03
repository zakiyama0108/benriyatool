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

## 運用設定(コード外)

- Task 4: 月次Routineの実行設定(仕様: design.md「実行環境の前提」)
  - **着手前提**: `SUPABASE_READONLY_DB_URL`をRoutine専用の実行環境に設定する具体的な手段を先に確認する(design.md「実行環境の前提」に記載の未解決事項。daily-publishの検証時点ではRoutineへの独自シークレット追加手段が見当たらなかった。手段が見つからない場合は本specの実行主体の再検討が必要)
  - 月1回の起動スケジュールを設定する
  - `SUPABASE_READONLY_DB_URL`をRoutine専用の実行環境に設定する(本体リポジトリ・GitHub Actions Secretsには追加しない)
  - Routineの実行指示に、本specとcontent-selectionのrequirements.md・design.mdを読む手順、および「変更なしならPRを作らない」判断基準を含める

- Task 5: 自動マージ対象外であることの確認(仕様: design.md「見直し案をPRとして提案する処理」手順3)
  - 本specのRoutineが作成するPR(`ai-dev-digest/watchlist-review/**`)は、daily-publishのワークフロー([daily-publish/design.md](../daily-publish/design.md)「PRを自動マージする処理」)とは別のPATを使い、`gh pr merge --auto`のようなauto-merge操作を一切行わないことをRoutineの実行指示・実装内容で確認する(2026-08改定: GitHub Rulesetsによるブランチパターン単位の技術的な例外設定は行わない前提のため、ここでの区別は運用規律によるものであり、GitHub側の設定確認ではない)

## 動作確認

- Task 6: 通しの動作確認(仕様: requirements.md#見直しの実行-1〜2、requirements.md#承認フロー-3)
  - Task 1〜5が揃った状態で月次実行を行い、`specs/ai-dev-digest/content-selection/requirements.md`と`content/ai-dev-digest/watchlist.json`/`criteria.json`の両方を変更するPRが作成されることを確認する
  - 作成されたPRが自動マージされず、通常のレビュー必須フローのままであることを確認する
