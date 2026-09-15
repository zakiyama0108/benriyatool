# 設計: 週次記事の自動生成・公開

## サマリ
毎週水曜、GitHub Actionsが情報源収集(content-selection)→要約生成(content-generation)を実行し、記事PRを作成してCI成功後に完全自動マージする(ai-dev-digestのdaily-publishと同じ完全自動マージの例外運用を週次に適用)。自動マージの対象は記事PR(`news-digest/articles/**`)のみに限定し、情報源・採用基準の変更(monthly-review)は対象外とする。実行にはニュース専用のGitHub Actions Secrets(fine-grained PAT等)を新規に用意し、ai-dev-digestの認証情報とは分離する(下記「実行環境の前提」)。

## 実行環境の前提

実行主体はGitHub Actionsとする(ai-dev-digestのdaily-publishと同じ構成を踏襲)。

- ワークフロー本体は`.github/workflows/news-digest-weekly.yml`として毎週水曜(JST想定時刻をUTCのcronに変換)に起動する。GitHub Actionsのscheduled workflowには起動時刻のSLAがないため、`cron`の分は0を避けて設定し、起動遅延の傾向を緩和する(ai-dev-digest/daily-publish/design.mdと同じ理由。厳密な定刻配信までは保証しない)
- GitHubへの書き込み(ブランチ作成・コミット・push・PR作成)には、このリポジトリのみに範囲を限定した新規のfine-grained PAT(Contents・Pull requestsのwrite権限)を発行し、`NEWS_DIGEST_GH_PAT`としてリポジトリのActions Secretsに保存する。ai-dev-digestの`AI_DEV_DIGEST_GH_PAT`とは分離する(根拠: ai-dev-digest/daily-publish/design.md「PRを自動マージする処理」が明記するとおり、自動マージの安全な範囲限定は「ワークフローが常に決まった名前のブランチからしかPRを作らない」という運用規律に依存する。PATをアプリ間で共用すると、一方のワークフローの不具合が他方の自動マージ範囲に影響しうるため、アプリ単位でPATを分離し影響範囲を限定する)。ワークフロー既定の`GITHUB_TOKEN`は使わない(既定の`GITHUB_TOKEN`で作成したPR・pushでは後続ワークフロー(CI)が自動起動されないため。ai-dev-digestと同じ理由)
- [content-generation](../content-generation/design.md)の要約生成、[content-selection](../content-selection/design.md)の候補グループ化・判定は、いずれもClaude Code CLIのヘッドレス実行(運営者個人のClaude Code Pro/Maxサブスクリプション認証)で行う。GitHub Actionsランナーには`npm install -g @anthropic-ai/claude-code`でインストールし、`claude setup-token`で発行済みの長期OAuthトークンを使う。**ai-dev-digestが既に`CLAUDE_CODE_OAUTH_TOKEN`として保存済みの同じトークンを再利用する**(運営者個人のサブスクリプション自体が同一のため、新しいトークンを発行する必要はない)。ただし利用枠(5時間ごと・週次の上限)は、ai-dev-digestの日次・月次実行、news-digestの週次・月次実行が同じ枠を共有する点に留意する(下記「セキュリティ」参照)
- ワークフローへの実行指示は、この`weekly-publish`のrequirements.md/design.mdと、参照先の`content-selection`/`content-generation`/`article-detail`のrequirements.md/design.mdをスクリプト・プロンプトの根拠としてそのまま参照する形にする(専用のプロンプトファイルを別途複製しない)
- 運用開始前に、上記のPAT・OAuthトークンが実際にリポジトリのActions Secretsに設定されていることを確認する

## 処理フロー

### 1週分の記事を生成する処理
- 対象: 実行週(JST、水曜起動)
- 手順:
  1. 作業用ブランチ`news-digest/articles/<date>`を作成する(`<date>`は実行日のYYYY-MM-DD)
  2. [content-selection](../content-selection/design.md)の`scripts/news-digest/collect-and-select.ts`を実行し、その週の候補収集・グループ化・採用基準判定・1週分のトピック選定を行う
  3. 選定結果が「候補不足によりスキップ」だった場合は、記事を作成せず後述「記事生成をスキップする処理」に進む
  4. 選定された各候補について、`scripts/news-digest/generate-content.ts`から[content-generation](../content-generation/design.md)のルールを踏まえたプロンプトでClaude Code CLI(`claude -p`)を1件ずつヘッドレス起動し、見出し・要約(日本語)を生成する。1候補の生成が一時的な失敗(応答からJSONを抽出できない等)に終わった場合は、同じ候補を最大2回まで(初回+リトライ1回)起動し直す(ai-dev-digestと同じ既定値)。リトライしても失敗する候補は、その候補だけを除外して次の候補に進む
  5. 生成に成功した候補が1件以上あれば、`assembleArticle(date, topics)`でその候補のみから記事データ(`date`・`topics`。article-detail/design.mdのスキーマに従う)を組み立て、`content/news-digest/articles/<date>.json`として書き出す。選定された全候補の生成が失敗した場合、または利用枠の枯渇でその週の生成を続行できない場合は、`generate-content.ts`が明示的なエラーメッセージとともに非ゼロ終了し、後続のステップを実行しない(候補不足による正常なスキップ(緑)と区別する)
  6. 変更をコミットし、ブランチをリモートにpushする
- 関連するビジネスルール: requirements.md#実行-1〜3、requirements.md#掲載件数の保証-1〜2

### PRを作成しCIの結果を待つ処理
- 対象: 上記で作成したブランチ
- 手順:
  1. `main`向けにPRを作成する(タイトル例: `[news-digest] <date>週の重要ニュースを公開`)
  2. 既存の`ci.yml`(lint・test・check:spec-coverage・build)がこのPRに対しても通常どおり実行される
  3. GitHub標準のauto-merge機能(`gh pr merge --auto --squash`)を有効にし、CIの成功を待って自動マージされるようにする
- 関連するビジネスルール: requirements.md#公開フロー-4

### PRを自動マージする処理(完全自動マージの例外運用)
- 対象: `news-digest/articles/**`ブランチからのPRのみ
- 手順:
  1. CIが成功した場合、GitHub標準のauto-mergeにより人間の承認を待たずに`main`へマージされる
  2. この自動マージの対象は`news-digest/articles/**`ブランチパターンのPRに限る。[monthly-review](../monthly-review/design.md)が作成するPR(`news-digest/monthly-review/**`)は対象外とし、通常どおりレビュー必須のまま残す
  3. 自動マージ範囲の限定は、GitHub Rulesets等の技術的強制ではなく、ワークフロー自身が常に`news-digest/articles/**`という名前のブランチからしかPRを作らないという運用規律に委ねる(ai-dev-digest/daily-publish/design.mdと同じ設計判断)
- 関連するビジネスルール: requirements.md#自動マージの範囲-3

### CI失敗時に記録する処理
- 対象: CIが失敗したPR
- 手順:
  1. マージは行わず、PRをオープンのまま残す
  2. 失敗の概要(どのチェックが失敗したか)をPRへのコメントとして自動追記する
  3. 翌週分の実行はこのPRの状態に関わらず独立して行う
- 関連するビジネスルール: requirements.md#実行-5

### 記事生成をスキップする処理
- 対象: content-selectionが「候補不足」と判定した週(正常なスキップ。GitHub Actionsの実行は成功(緑)のまま終わる)
- 手順:
  1. ブランチ・PRを作成しない
  2. スキップした旨と理由を実行ログに記録する
  3. 翌週以降は通常どおり実行を続ける
- 選定はできたが全候補の生成が失敗した場合・利用枠が枯渇した場合は、この正常なスキップとは区別し、実行を失敗(赤)として終える

## エラーハンドリング

- CIの失敗(lint/test/check:spec-coverage/buildのいずれか)は上記「CI失敗時に記録する処理」に従い、マージせずPRを残す
- **個々の候補の生成失敗(一時的な失敗)**: 1候補の生成が応答からのJSON抽出失敗等に終わった場合は、その候補を最大2回まで起動し直す。リトライしても失敗する候補は、その候補だけを除外し、生成に成功した残りの候補でその週の記事を公開する(requirements.md#掲載件数の保証-2)
- **全候補の生成失敗・利用枠の枯渇(恒久的な失敗)**: 選定された全候補がリトライしても生成に失敗した場合、または利用枠の上限到達を示す場合は、`generate-content.ts`が非ゼロ終了する。非ゼロ終了により後続ステップは実行されず、ブランチ・PRは作られないまま、GitHub Actionsの実行が失敗(赤)として残る
- 1週の実行が失敗・スキップしても、他の週([article-list](../article-list/requirements.md)・[article-detail](../article-detail/requirements.md))の表示には影響しない

## 関連するファイル(抜粋)

```
.github/workflows/news-digest-weekly.yml (新規: 毎週水曜起動するワークフロー本体)
scripts/news-digest/generate-content.ts (content-generationで新規)
app/news-digest/lib/assembleArticle.ts (新規: 選定結果+生成済み見出し・要約からArticleを組み立てる純粋関数)
scripts/news-digest/write-article.ts (新規: assembleArticleの結果をcontent/news-digest/articles/<date>.jsonへ書き出すCLI)
scripts/news-digest/collect-and-select.ts (content-selectionで新規)
content/news-digest/articles/<date>.json (新規: 生成される記事データ。週1件)
.github/workflows/ci.yml (既存: 変更不要。全PR共通のlint/test/buildがこのPRにもそのまま適用される)
```

## セキュリティ

- GitHub書き込み用PAT(`NEWS_DIGEST_GH_PAT`)は、このリポジトリのActions Secretsとして保存する。他リポジトリへの影響が及ばないfine-grained PATとする
- `CLAUDE_CODE_OAUTH_TOKEN`はai-dev-digestと共用する(運営者個人のClaude Code Pro/Maxサブスクリプションに紐づく認証情報のため)。この利用枠は、ai-dev-digestの日次・月次実行、news-digestの週次・月次実行が共有する。運営者本人のClaude Code対話利用とも共有されるため、利用枠の枯渇頻度が増える可能性がある点に留意する(自動実行が失敗した場合の扱いは上記「エラーハンドリング」参照。運用開始後に頻発するようであれば、実行スケジュールの分散(曜日・時刻をずらす)を検討する)
- 自動マージの範囲を`news-digest/articles/**`のみに限定する仕組みは、ワークフロー自身の運用規律であるため、このワークフロー以外が誤って同じPATで他ブランチを自動マージしないよう、PATの用途をこのワークフロー専用に限定する

## ログ

- 実行ごとに、選定件数・カテゴリ別の掲載件数・専用枠の基準未達件数・PR URL・マージ結果(成功/CI失敗/スキップ)をGitHub Actionsのワークフロー実行ログに記録する
- スキップが複数週連続した場合に気づけるよう、[monthly-review](../monthly-review/design.md)の月次見直しが記事データの欠落週を確認できるようにしておく
