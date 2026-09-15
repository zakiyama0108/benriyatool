# タスク分解: 週次記事の自動生成・公開

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 記事データの組み立て(仕様: design.md「1週分の記事を生成する処理」手順5)
  - 🔴 選定結果+生成済み見出し・要約から、[article-detail/design.md](../article-detail/design.md)のスキーマを満たす`Article`が組み立てられること、生成に失敗した候補は`topics`から除外されることを確認するテストを書く
  - 🟢 `app/news-digest/lib/assembleArticle.ts`に`assembleArticle(date, topics): Article`を実装する

- Task 2: 記事データの書き出しCLI(仕様: design.md「関連するファイル」)
  - TDD対象外(assembleArticleの薄い呼び出し+ファイル書き出しのみのため)
  - `scripts/news-digest/write-article.ts`を実装する。`assembleArticle`の結果を`content/news-digest/articles/<date>.json`へ書き出す

- Task 3: 週次ワークフローの作成(仕様: design.md「実行環境の前提」「処理フロー」)
  - TDD対象外(GitHub Actionsのワークフロー定義・運用設定のため)
  - `.github/workflows/news-digest-weekly.yml`を作成する。ブランチ作成(`news-digest/articles/<date>`)→`collect-and-select.ts`実行→候補ごとに`generate-content.ts`実行(最大2回まで)→`assembleArticle`+`write-article.ts`でコミット→PR作成→`gh pr merge --auto --squash`の有効化、までを行う
  - CI失敗時にPRへコメントを自動追記するステップを追加する
  - 候補不足によるスキップ時はブランチ・PRを作成せず、実行ログにその旨を記録するステップにする

- Task 4: Secretsの準備(運用タスク、design.md「実行環境の前提」「セキュリティ」)
  - TDD対象外(コード変更を伴わない運用手順)
  - このリポジトリ専用のfine-grained PATを発行し、`NEWS_DIGEST_GH_PAT`としてActions Secretsに登録する
  - 既存の`CLAUDE_CODE_OAUTH_TOKEN`がこのワークフローからも参照できることを確認する(新規発行は不要)
