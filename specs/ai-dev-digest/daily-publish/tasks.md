# タスク分解: 日次記事の自動生成・公開

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## コード側の実装

- Task 1: 記事データの組み立て(仕様: design.md「1日分の記事を生成する処理」手順5)
  - 🔴 選定結果(見出し・要約・出典・belowCriteria等が揃ったトピック配列)から、article-detailのスキーマを満たす`Article`が組み立てられることを確認するテストを書く
  - 🟢 `app/ai-dev-digest/lib/assembleArticle.ts`に`assembleArticle(date, topics): Article`を実装する

- Task 2: 記事ファイルの書き出し(仕様: design.md「1日分の記事を生成する処理」手順5)
  - TDD対象外(fsへの書き込みのみの薄いラッパーのため。組み立てロジック自体はTask 1でテスト済み)
  - `scripts/ai-dev-digest/write-article.ts`を実装する。`assembleArticle`の結果を`content/ai-dev-digest/articles/<date>.json`へ書き出すCLIにする

- Task 3: ワークフロー本体の実装(仕様: design.md「実行環境の前提」「1日分の記事を生成する処理」「PRを作成しCIの結果を待つ処理」)(TDD対象外。GitHub Actionsのワークフロー定義ファイルであり、内部で呼ぶ各スクリプトはそれぞれのspecでテスト済みのため)
  - `.github/workflows/ai-dev-digest-daily.yml`を実装する。1日1回のcronトリガーで、ブランチ作成→`collect-and-select.ts`→(スキップ判定)→`generate-content.ts`→`assembleArticle`/`write-article.ts`→コミット・push→`gh pr create`→`gh pr merge --auto --squash`までを行う
  - GitHub書き込みには`secrets.AI_DEV_DIGEST_GH_PAT`を使う(既定の`GITHUB_TOKEN`は使わない。design.md「実行環境の前提」参照)

## 運用設定(コード外)

- Task 4: GitHub Actions Secretsの設定(仕様: design.md「実行環境の前提」)
  - このリポジトリのみに範囲を限定したfine-grained PATを発行し、`AI_DEV_DIGEST_GH_PAT`としてリポジトリのActions Secretsに保存する
  - `YOUTUBE_API_KEY`・`ANTHROPIC_API_KEY`を同様にActions Secretsに保存する
  - 初回実行前に、上記のSecretsが実際に設定されていること、`AI_DEV_DIGEST_GH_PAT`で作成したPRに対し既存の`ci.yml`が正しく起動すること(既定の`GITHUB_TOKEN`使用時に起きる無限ループ防止による起動抑制が発生しないこと)を確認する(テスト実行1回分をレビューする)
  - 初回実行前に、このリポジトリのAllow auto-merge設定が有効になっていること(Settings > General > Pull Requestsで確認、または`gh api repos/<owner>/<repo> --jq .allow_auto_merge`)を確認する(`gh pr merge --auto --squash`の前提条件のため)

## 動作確認

- Task 5: 通しの動作確認(仕様: requirements.md#実行-1〜3、requirements.md#公開フロー-4〜5)
  - Task 1〜4が揃った状態で1日分の実行を行い、PRが作成されCI成功後に自動マージされることを確認する
  - 意図的にCIを失敗させるケース(例: 不正な記事データ)でマージされず、PRが残ることを確認する
  - 候補不足を人為的に再現し、PRが作成されずスキップ扱いになることを確認する(content-selection/tasks.md Task 4のテストで担保済みのロジックを、実行フロー全体で再確認する)
