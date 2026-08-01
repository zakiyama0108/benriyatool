# タスク分解: 日次記事の自動生成・公開

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## コード側の実装

- Task 1: 記事データの組み立て(仕様: design.md「1日分の記事を生成する処理」手順5)
  - 🔴 選定結果(見出し・要約・出典・belowCriteria等が揃ったトピック配列)から、article-detailのスキーマを満たす`Article`が組み立てられることを確認するテストを書く
  - 🟢 `app/ai-dev-digest/lib/assembleArticle.ts`に`assembleArticle(date, topics): Article`を実装する

- Task 2: 記事ファイルの書き出し(仕様: design.md「1日分の記事を生成する処理」手順5)
  - TDD対象外(fsへの書き込みのみの薄いラッパーのため。組み立てロジック自体はTask 1でテスト済み)
  - `scripts/ai-dev-digest/write-article.ts`を実装する。`assembleArticle`の結果を`content/ai-dev-digest/articles/<date>.json`へ書き出すCLIにする

## 運用設定(コード外)

- Task 3: ブランチ保護の例外設定(仕様: design.md「PRを自動マージする処理」手順3)
  - リポジトリのRulesetsに、`ai-dev-digest/articles/**`パターンのブランチのみ必須レビューを免除する例外を追加する
  - `ai-dev-digest/watchlist-review/**`パターン(または他の通常ブランチ)がこの例外の対象に含まれていないことを確認する
  - GitHubの設定作業のため、このリポジトリへのコード変更は発生しない(design.mdへの前提記載のみ)

- Task 4: Claude Routineの実行設定(仕様: design.md「実行環境の前提」)
  - 1日1回の起動スケジュールを設定する
  - GitHub書き込み権限・YouTube Data APIキー等をRoutine側の実行環境にのみ設定する(このリポジトリ・GitHub Actions Secretsには追加しない)
  - Routineの実行指示に、本specとcontent-selection/content-generation/article-detailのrequirements.md・design.mdを読む手順を含める
  - 初回実行前に、上記の設定が実際に機能することを確認する(テスト実行1回分をレビューする)

## 動作確認

- Task 5: 通しの動作確認(仕様: requirements.md#実行-1〜3、requirements.md#公開フロー-4〜5)
  - Task 1〜4が揃った状態で1日分の実行を行い、PRが作成されCI成功後に自動マージされることを確認する
  - 意図的にCIを失敗させるケース(例: 不正な記事データ)でマージされず、PRが残ることを確認する
  - 候補不足を人為的に再現し、PRが作成されずスキップ扱いになることを確認する(content-selection/tasks.md Task 4のテストで担保済みのロジックを、実行フロー全体で再確認する)
