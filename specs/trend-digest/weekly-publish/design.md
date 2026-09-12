# 設計: 週2回の記事自動生成・公開

## サマリ
GitHub Actionsのスケジュール実行が火曜(エンタメ編)・金曜(カルチャー編)それぞれ独立して起動し、[content-selection](../content-selection/design.md)の収集・選定→[content-generation](../content-generation/design.md)の見出し・本文生成→記事データの組み立て→PR作成・自動マージまでを行う。完全自動マージの対象はこの週次記事PRのみ(ai-dev-digestのdaily-publishと同じ例外運用)。実行環境・自動マージの技術的前提は下記「実行環境の前提」参照。

## 実行環境の前提

実行主体はGitHub Actionsとする(ai-dev-digestのdaily-publishと同じ構成をそのまま踏襲する):

- ワークフロー本体は`.github/workflows/trend-digest-weekly.yml`として、火曜(エンタメ編)・金曜(カルチャー編)それぞれ独立したcronで起動する。GitHub Actionsのscheduled workflowには起動時刻のSLAがなく、特に毎時0分は起動が遅延しやすいため、`cron`の分は0を避けて設定する(ai-dev-digestの実測知見を踏襲。requirements.mdに配信時刻の厳密な固定要件はなく、朝の時間帯に届けば足りるため)。JST 07:43頃の配信を狙い、次の2つの独立したcronエントリを`schedule:`に登録する(具体的な時刻はai-dev-digestの日次実行(06:43 JST)に合わせつつ、週次であることが分かるよう+1時間ずらした):
  - `43 22 * * 1` — 火曜07:43 JST(月曜22:43 UTC)にエンタメ編を実行
  - `43 22 * * 4` — 金曜07:43 JST(木曜22:43 UTC)にカルチャー編を実行
  - ジョブ内では`github.event.schedule`(起動の元になったcron式)を見て`edition`を`entertainment`/`culture-lifestyle`のどちらにするか分岐する。`workflow_dispatch`による手動実行時は`edition`を入力パラメータとして受け取る(Secrets設定後の動作確認用)
- GitHubへの書き込み(ブランチ作成・コミット・push・PR作成)には、このリポジトリのみに範囲を限定したfine-grained PAT(Contents・Pull requestsのwrite権限)を発行し、`TREND_DIGEST_GH_PAT`としてリポジトリのActions Secretsに保存する。ワークフロー既定の`GITHUB_TOKEN`は使わない(既定の`GITHUB_TOKEN`で作成したPR・pushでは、無限ループ防止のGitHub側の仕様により既存の`ci.yml`を含む後続ワークフローが自動起動されず、CIが走らないまま自動マージ判定に進めなくなるため。ai-dev-digestと同じ理由)
- [content-generation](../content-generation/design.md)の見出し・本文生成は、Anthropic APIの従量課金呼び出しではなくClaude Code CLIのヘッドレス実行(運営者個人のClaude Code Pro/Maxサブスクリプション認証)で行う。GitHub Actionsランナーには`npm install -g @anthropic-ai/claude-code`でClaude Code CLIをインストールし、既にai-dev-digestで発行済みの長期(1年)OAuthトークンを`CLAUDE_CODE_OAUTH_TOKEN`としてこのリポジトリのActions Secretsに保存済みのものをそのまま再利用する(同じ運営者個人のサブスクリプションのため、アプリごとに新しいトークンを発行し直す必要はない。この利用枠(5時間ごと・週次の上限)はai-dev-digestの日次実行・運営者本人のClaude Code対話利用と共有される)
- [content-selection](../content-selection/design.md)のWebSearchジャンル収集も同じClaude Code CLI・同じOAuthトークンで行う(追加のAPIキーは不要)
- ワークフローへの実行指示は、この`weekly-publish`のrequirements.md/design.mdと、参照先の`content-selection`/`content-generation`/`article-detail`のrequirements.md/design.mdをスクリプト・プロンプトの根拠としてそのまま参照する形にする(専用のプロンプトファイルを別途複製しない)
- 運用開始前に、上記のPAT・OAuthトークンが実際にリポジトリのActions Secretsに設定されていることを確認する

## 処理フロー

### 1回分の記事を生成する処理
- 対象: 実行日(JST)とedition(火曜実行=`entertainment`、金曜実行=`culture-lifestyle`)
- 手順:
  1. 作業用ブランチ`trend-digest/articles/<id>`(`<id>`は`<date>-<edition>`)を作成する
  2. [content-selection](../content-selection/design.md)の`scripts/trend-digest/collect-and-select.ts`を実行し、対象editionの9ジャンルの候補収集・採用基準判定・絞り込み(最大10件)を行う
  3. 選定結果が「候補不足によりスキップ」だった場合は、記事を作成せず後述「記事生成をスキップする処理」に進む
  4. 選定された各候補について、`scripts/trend-digest/generate-content.ts`から[content-generation](../content-generation/design.md)のルールを踏まえたプロンプトでClaude Code CLI(`claude -p`)を1件ずつヘッドレス起動し、見出し・本文(日本語)を生成する。1候補の生成が一時的な失敗に終わった場合は、同じ候補を最大2回まで(初回+リトライ1回)起動し直す(ai-dev-digestと同じリトライ回数の考え方)。リトライしても失敗する候補は、その候補だけを除外して次の候補に進む(後述「エラーハンドリング」)
  5. 生成に成功した候補が1件以上あれば、`assembleArticle(edition, date, topics)`でその候補のみから記事データ(`id`・`edition`・`date`・`topics`。article-detail/design.mdのスキーマに従う。`topics`はGENRE_ORDER順に並べ替える)を組み立て、`writeArticleFile`で`content/trend-digest/articles/<id>.json`として書き出す。選定された全候補の生成が失敗した場合、または利用枠の枯渇でその回の生成を続行できない場合は、`generate-content.ts`が明示的なエラーメッセージとともに非ゼロ終了し、後続のステップ(記事書き出し・commit・push・PR作成)を実行しない。この場合、ブランチ・PRは作られず、GitHub Actionsの実行が失敗(赤)として残る(requirements.md#掲載件数の保証-2。候補不足による正常なスキップ(緑)と区別する。後述「エラーハンドリング」)
  6. 変更をコミットし、ブランチをリモートにpushする
- 関連するビジネスルール: requirements.md#実行-1〜4、requirements.md#掲載件数の保証-1〜2

### PRを作成しCIの結果を待つ処理
- 対象: 上記で作成したブランチ
- 手順:
  1. `main`向けにPRを作成する(タイトル例: `[trend-digest] <id>を公開`。本文に選定件数の概要を記載する)
  2. 既存の`ci.yml`(lint・test・check:spec-coverage・build)がこのPRに対しても通常どおり実行される(このPRだけの特別なCI設定は追加しない。article-detail/design.mdのビルド時バリデーションが記事データの妥当性をここで検証する)
  3. GitHub標準のauto-merge機能(`gh pr merge --auto --squash`)を有効にし、CIの成功を待って自動マージされるようにする
- 関連するビジネスルール: requirements.md#公開フロー-5

### PRを自動マージする処理(完全自動マージの例外運用)
- 対象: `trend-digest/articles/**`ブランチからのPRのみ
- 手順:
  1. CIが成功した場合、GitHub標準のauto-mergeにより人間の承認を待たずに`main`へマージされる
  2. この自動マージの対象は`trend-digest/articles/**`ブランチパターンのPRに限る。[source-review](../source-review/design.md)が作成するPR(`trend-digest/source-review/**`)は対象外とし、通常どおりレビュー必須のまま残す(混同防止のため、ブランチ命名規則で明確に区別する)
  3. **この範囲の限定はGitHub側の技術的強制ではなく、ワークフロー自身が常に`trend-digest/articles/**`という名前のブランチからしかPRを作らないという運用規律に委ねる**(ai-dev-digest/daily-publishと同じ設計。GitHub Rulesetsの必須レビュー免除はブランチパターン単位で設定できないため)
- 関連するビジネスルール: requirements.md#自動マージの範囲-3

### CI失敗時に記録する処理
- 対象: CIが失敗したPR
- 手順:
  1. マージは行わず、PRをオープンのまま残す(GitHub上でCI失敗のPRとして可視化される)
  2. 失敗の概要(どのチェックが失敗したか)をPRへのコメントとして自動追記する(ai-dev-digestと同じ方法。追加の通知チャネルは設けない)
  3. 次回分の実行はこのPRの状態に関わらず独立して行う
- 関連するビジネスルール: requirements.md#実行-6

### 記事生成をスキップする処理
- 対象: content-selectionが「候補不足」と判定した回(対象9ジャンルすべてで候補が0件。正常なスキップ。GitHub Actionsの実行は成功(緑)のまま終わる)
- 手順:
  1. ブランチ・PRを作成しない(空のPRを作らない)
  2. スキップした旨を実行ログに記録する(content-selection/design.md#ログ)
  3. 次回以降は通常どおり実行を続ける
- 選定はできたが全候補の生成が失敗した場合・利用枠が枯渇した場合は、この正常なスキップとは区別し、実行を失敗(赤)として終える(後述「エラーハンドリング」。requirements.md#掲載件数の保証-2)
- 関連するビジネスルール: requirements.md#掲載件数の保証-1

## エラーハンドリング

- CIの失敗(lint/test/check:spec-coverage/buildのいずれか)は上記「CI失敗時に記録する処理」に従い、マージせずPRを残す
- **個々の候補の生成失敗(一時的な失敗)**: 1候補の生成が応答からのJSON抽出失敗・分量不正などに終わった場合は、その候補を最大2回まで(初回+リトライ1回)起動し直す。リトライしても失敗する候補は、その候補**だけ**を除外し、生成に成功した残りの候補でその回の記事を公開する(requirements.md#掲載件数の保証-2)。除外した候補があった旨(ジャンル・作品名・失敗理由)は実行ログに記録する
- **全候補の生成失敗・利用枠の枯渇(恒久的な失敗)**: 選定された全候補がリトライしても生成に失敗した場合、または応答が利用上限到達を示す場合は、`generate-content.ts`が非ゼロ終了する。利用枠の枯渇は同じ実行内でリトライしても回復しないため上記のリトライ対象とせず、検知した時点でその候補以降の生成を打ち切って終了する。非ゼロ終了により後続ステップ(記事書き出し・commit・push・PR作成)は実行されず、ブランチ・PRは作られないまま、GitHub Actionsの実行が失敗(赤)として残る。終了時のエラーメッセージには失敗理由(全候補の生成失敗か、利用枠の枯渇か)を明示する
- 記事生成処理が上記以外の例外で中断した場合(外部サービスの全面障害等)も同様に非ゼロ終了し、ブランチ・PRは作成しない、または作成済みでコミット前に失敗した場合は何もリモートに残さない
- 1回の実行が失敗・スキップしても、他の回([article-list](../article-list/requirements.md)・[article-detail](../article-detail/requirements.md))の表示には影響しない(該当ファイルが存在しないだけで、一覧・詳細ページは正常に動作する)

## 関連するファイル(抜粋)

```
.github/workflows/trend-digest-weekly.yml (新規: 火曜(エンタメ編)・金曜(カルチャー編)それぞれ起動するワークフロー本体)
scripts/trend-digest/collect-and-select.ts (content-selectionで新規: 候補収集・選定のCLI)
scripts/trend-digest/generate-content.ts (content-generationで新規: 見出し・本文生成のCLI)
app/trend-digest/lib/assembleArticle.ts (新規: 選定結果+生成済み見出し・本文からArticleを組み立てる純粋関数)
scripts/trend-digest/write-article.ts (新規: assembleArticleの結果をcontent/trend-digest/articles/<id>.jsonへ書き出すCLI)
content/trend-digest/articles/<id>.json (新規: 生成される記事データ。1回1ファイル)
.github/workflows/ci.yml (既存: 変更不要。全PR共通のlint/test/buildがこのPRにもそのまま適用される)
```

## セキュリティ

- GitHub書き込み用PAT(`TREND_DIGEST_GH_PAT`)は、このリポジトリのActions Secretsとして保存する(暗号化され、ワークフロー実行時以外は値を参照できないGitHubの標準機能)。PATはこのリポジトリのみに範囲を限定したfine-grained PATとし、他リポジトリへの影響が及ばないようにする
- `CLAUDE_CODE_OAUTH_TOKEN`はai-dev-digestと共用の、運営者個人のClaude Code Pro/Maxサブスクリプションに紐づく認証情報である。有効期限切れ時は再発行してSecretsを更新する運用とする(ai-dev-digest/daily-publish/design.mdと同じ)
- 「CI失敗時に記録する処理」で失敗ジョブ・ステップを特定する処理は同一リポジトリのActions実行結果を読むだけの読み取り専用の問い合わせのため、書き込み用PATではなくワークフロー既定の`GITHUB_TOKEN`を使う
- 自動マージの範囲を`trend-digest/articles/**`のみに限定する仕組みは、GitHub側のACLではなくワークフロー自身の運用規律であるため(上記「PRを自動マージする処理」参照)、このワークフロー以外が誤って同じPATで他ブランチを自動マージしないよう、PATの用途をこのワークフロー専用に限定する
- 記事データの内容自体の安全性(著作権配慮・分量)はcontent-generation/article-detailのビルド時バリデーションで担保する(本specはオーケストレーションのみを担当し、内容検証のロジックは持たない)

## ログ

- 実行ごとに、edition・選定件数・PR URL・マージ結果(成功/CI失敗/スキップ)をGitHub Actionsのワークフロー実行ログに記録する
- スキップが複数回連続した場合に気づけるよう、[source-review](../source-review/design.md)の月次見直しが記事データの欠落回(該当回のJSONファイルが存在しない)を確認できるようにしておく
