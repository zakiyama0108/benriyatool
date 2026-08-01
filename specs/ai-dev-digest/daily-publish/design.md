# 設計: 日次記事の自動生成・公開

## 実行環境の前提(初導入のため明記する設計判断)【推測】

Claude Routinesの具体的な起動設定・認証情報の管理方法は、本プロジェクトで前例がないため、以下を設計上の前提として明記する(要件は「実行主体はClaude Routines」とのみ定めており、詳細は本designで確定する):

- Routineは1日1回、対象リポジトリ(このGitHubリポジトリ)をチェックアウトできるGitHubの書き込み権限(PR作成権限)を持つものとする。認証情報(GitHub App/PAT等)はRoutine側の実行環境で保持し、このリポジトリ・CIのSecretsには追加しない(このリポジトリが管理する範囲外の設定のため)
- [content-selection/design.md](../content-selection/design.md)が必要とするYouTube Data APIキー等の外部APIキーも同様にRoutine側の実行環境の環境変数として保持する
- Routineへの実行指示(何を読み、どう動くか)は、この`daily-publish`のrequirements.md/design.mdと、参照先の`content-selection`/`content-generation`/`article-detail`のrequirements.md/design.mdをそのまま読ませる形にする(専用のプロンプトファイルを別途複製しない。DRYに保つ)
- 運用開始前に、上記の認証情報・APIキーが実際にRoutineの実行環境に設定されていることを確認する(docs/adr/0006の「管理画面公開前の設定確認」と同様、コードで強制できない前提条件のため運用手順として確認する)

## 処理フロー

### 1日分の記事を生成する処理
- 対象: 実行日(JST)
- 手順:
  1. 作業用ブランチ`ai-dev-digest/articles/<date>`を作成する(`<date>`は実行日のYYYY-MM-DD)
  2. [content-selection](../content-selection/design.md)の`scripts/ai-dev-digest/collect-and-select.ts`を実行し、その日の候補収集・採用基準判定・1日分のトピック選定(3〜5件を目安に、基準未達掲載の日は実在する候補の件数)を行う
  3. 選定結果が「候補不足によりスキップ」だった場合は、記事を作成せず後述「記事生成をスキップする処理」に進む
  4. 選定された各候補について、[content-generation](../content-generation/design.md)のルールに従って見出し・要約(日本語)を作成し、`extractYoutubeVideoId`でYouTube動画IDを抽出する
  5. `assembleArticle(date, topics)`で記事データ(`date`・`topics`。article-detail/design.mdのスキーマに従う)を組み立て、`writeArticleFile`で`content/ai-dev-digest/articles/<date>.json`として書き出す
  6. 変更をコミットし、ブランチをリモートにpushする
- 関連するビジネスルール: requirements.md#実行-1〜3、requirements.md#掲載件数の保証-1

### PRを作成しCIの結果を待つ処理
- 対象: 上記で作成したブランチ
- 手順:
  1. `main`向けにPRを作成する(タイトル例: `[ai-dev-digest] <date>のダイジェストを公開`。本文に選定件数・基準未達件数の概要を記載する)
  2. 既存の`ci.yml`(lint・test・check:spec-coverage・build)がこのPRに対しても通常どおり実行される(このPRだけの特別なCI設定は追加しない。article-detail/design.mdのビルド時バリデーションが記事データの妥当性をここで検証する)
  3. GitHub標準のauto-merge機能(`gh pr merge --auto --squash`)を有効にし、CIの成功を待って自動マージされるようにする(下記「PRを自動マージする処理」参照)
- 関連するビジネスルール: requirements.md#公開フロー-4

### PRを自動マージする処理(完全自動マージの例外運用)
- 対象: `ai-dev-digest/articles/**`ブランチからのPRのみ
- 手順:
  1. CIが成功した場合、GitHub標準のauto-mergeにより人間の承認を待たずに`main`へマージされる
  2. この自動マージの対象は`ai-dev-digest/articles/**`ブランチパターンのPRに限る。[watchlist-review](../watchlist-review/design.md)が作成するPR(`ai-dev-digest/watchlist-review/**`)は対象外とし、通常どおりレビュー必須のまま残す(混同防止のため、ブランチ命名規則で明確に区別する)
  3. リポジトリのブランチ保護(Rulesets)には、`ai-dev-digest/articles/**`パターンのブランチに限り、必須レビューを免除する例外を設定しておく(GitHub側のリポジトリ設定であり、このリポジトリのコードでは表現できない。運用開始前に設定し、対象パターン・対象外パターンの両方を確認する)【推測】
- 関連するビジネスルール: requirements.md#自動マージの範囲-2

### CI失敗時に記録する処理
- 対象: CIが失敗したPR
- 手順:
  1. マージは行わず、PRをオープンのまま残す(GitHub上でCI失敗のPRとして可視化される)
  2. 失敗の概要(どのチェックが失敗したか)をPRへのコメントとして自動追記する【推測】(具体的な通知方法は要件で明記されていないため設計判断。追加の通知チャネル(メール・チャット等)は設けず、GitHub通知に委ねる。将来的に見落としが問題になれば通知経路の追加を検討する)
  3. 翌日分の実行はこのPRの状態に関わらず独立して行う(日をまたいだ依存はない。失敗した日は運営者が手動で修正するかクローズする)
- 関連するビジネスルール: requirements.md#実行-5

### 記事生成をスキップする処理
- 対象: content-selectionが「候補不足」と判定した日
- 手順:
  1. ブランチ・PRを作成しない(空のPRを作らない)
  2. スキップした旨と理由(候補が何件しかなかったか)を実行ログに記録する(content-selection/design.md#ログ)
  3. 翌日以降は通常どおり実行を続ける
- 関連するビジネスルール: content-selection/requirements.md#1日の掲載件数-10(候補不足時の安全策として本specのdesignで追加)

## エラーハンドリング

- CIの失敗(lint/test/check:spec-coverage/buildのいずれか)は上記「CI失敗時に記録する処理」に従い、マージせずPRを残す
- 記事生成処理自体が例外で中断した場合(外部APIの全面障害等)、ブランチ・PRは作成しない、または作成済みでコミット前に失敗した場合は何もリモートに残さない(中途半端な状態のPRを作らない)
- 1日の実行が失敗・スキップしても、他の日([article-list](../article-list/requirements.md)・[article-detail](../article-detail/requirements.md))の表示には影響しない(該当日のファイルが存在しないだけで、一覧・詳細ページは正常に動作する)

## 関連するファイル(抜粋)

```
app/ai-dev-digest/lib/assembleArticle.ts (新規: 選定結果+生成済み見出し・要約からArticleを組み立てる純粋関数)
scripts/ai-dev-digest/write-article.ts (新規: assembleArticleの結果をcontent/ai-dev-digest/articles/<date>.jsonへ書き出すCLI)
scripts/ai-dev-digest/collect-and-select.ts (content-selectionで新規: 候補収集・選定のCLI)
content/ai-dev-digest/articles/<date>.json (新規: 生成される記事データ。1日1ファイル)
.github/workflows/ci.yml (既存: 変更不要。全PR共通のlint/test/buildがこのPRにもそのまま適用される)
```

## セキュリティ

- Routineが保持するGitHub書き込み権限・外部APIキーは、このリポジトリ・CIのSecretsに一切含めない(上記「実行環境の前提」参照)。漏洩時の影響範囲をRoutine側の管理に閉じ込める
- 自動マージの対象を`ai-dev-digest/articles/**`のみに限定するブランチ保護の例外設定は、他のブランチ・PR(watchlist-reviewのPRを含む)には一切影響しない設計にする(誤って全体のレビュー必須を緩めないよう、パターンを限定する)
- 記事データの内容自体の安全性(著作権配慮・要約分量)はcontent-generation/article-detailのビルド時バリデーションで担保する(本specはオーケストレーションのみを担当し、内容検証のロジックは持たない)

## ログ

- 実行ごとに、選定件数・基準未達件数・PR URL・マージ結果(成功/CI失敗/スキップ)をRoutineの実行ログに記録する
- スキップが複数日連続した場合に気づけるよう、[watchlist-review](../watchlist-review/design.md)の月次見直しが記事データの欠落日(該当日のJSONファイルが存在しない日)を確認できるようにしておく(欠落日の一覧は記事データのディレクトリを日付順に確認すれば得られるため、追加のログファイルは持たない)
