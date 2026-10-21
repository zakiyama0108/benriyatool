# 要件定義: digest-failure-notification

> ステータス: 仕様確認中(未実装)

## サマリ

- 運営者(zaki)の「ai-dev-digest・news-digest・trend-digest・research-digest・future-digestの5アプリで記事生成がGitHub Actions上で失敗しても、画面を開かないと気づけない」を解決する〔合意〕
- 主要なルール: 自動再実行の仕組みがないワークフローは失敗時点で即時通知する。研究・未来予測は自動再実行(最大3回)を使い切ってなお失敗した場合のみ通知する〔合意〕
- 通知手段: 新規チャネルは作らず、5アプリのLINE記事配信が既に使う共通LINE公式アカウントから、運営者個人へLINEのpushメッセージ(1:1)で送る〔合意〕
- スコープ外: 月次見直し・LINE配信・deploy/ci等の失敗通知、LINE以外のチャネルの追加〔合意〕
- 全体像は[ユースケース図](#ユースケース図)を参照〔合意〕

## 概要

- 機能名: digest-failure-notification〔合意〕
- 目的: 5アプリの日次・週次記事生成ワークフローがGitHub Actions上で失敗した際、運営者(zaki)がLINEで能動的に気づけるようにする〔合意〕
- 優先度: 中**🟡〔提案〕**

## ユーザーストーリー

- 運営者(zaki)として、5アプリの日次・週次記事生成がGitHub Actions上で失敗したときに、GitHub Actionsの画面を開かなくても気づけるようにしたい〔合意〕

## ユースケース図

```mermaid
flowchart LR
    gha["GitHub Actions\n(5アプリの記事生成ワークフロー)"]
    notify["失敗を検知してLINEで知らせる"]
    zaki["運営者(zaki)"]
    gha -->|実行結果(workflow_run)| notify
    notify -->|LINE pushメッセージ| zaki
```

正となる文章: [ユーザーストーリー](#ユーザーストーリー)・[機能要件](#機能要件)

## 機能要件

### 失敗検知・通知

対象5ワークフローの失敗を共通の監視ワークフローが検知し、LINEで運営者個人に知らせる。〔合意〕

<details><summary>詳細を開く</summary>

- [1] 対象は`ai-dev-digest-daily.yml`・`news-digest-weekly.yml`・`trend-digest-weekly.yml`・`research-digest-weekly.yml`・`future-digest-weekly.yml`の5ワークフロー(5アプリそれぞれの日次・週次の記事生成ワークフロー)であること
- [2] 5アプリで共通の1つの監視ワークフローが対象ワークフローの実行結果を監視し、各アプリの既存ワークフローには個別実装を追加しないこと
- [3] 通知はLINE Messaging APIのpushメッセージ(1:1)で、既存の共通LINE公式アカウント(5アプリのLINE記事配信が相乗りするチャネル)から運営者個人へ送ること
- [4] 通知内容は、アプリ名・失敗したワークフロー名・失敗日時(JST)・該当実行(Run)のGitHub Actions上のログへのリンクを含むこと

</details>

## ビジネスルール・制約

### 通知タイミング

自動再実行の仕組みがあるワークフローは、再実行を使い切ってなお失敗した場合のみ通知する。〔合意〕

<details><summary>詳細を開く</summary>

- [1] 自動再実行の仕組みを持たないワークフロー(`ai-dev-digest-daily`・`news-digest-weekly`・`trend-digest-weekly`)は、実行が失敗した時点で直ちに通知すること(根拠: 再実行による自動復旧の機会がないため、気づく遅れを避ける)
- [2] 自動再実行の仕組みを持つワークフロー(`research-digest-weekly`・`future-digest-weekly`。いずれも本番cron失敗後、12時間後・24時間後・36時間後の最大3回まで自動再実行する)は、最後の再実行(36時間後)も失敗した場合のみ通知すること。本番〜2回目の再実行までの失敗では通知しないこと(根拠: 再実行の仕組み自体が一時的な失敗からの自動復旧を狙ったものであり、使い切るまでは様子見でよいという運営判断)
- [3] `workflow_dispatch`による手動実行が失敗した場合は、再実行の仕組みの対象外のため直ちに通知すること

</details>

### 通知手段

既存の共通LINE公式アカウントを使い、運営者個人のLINE userIdへpushする。〔合意〕

<details><summary>詳細を開く</summary>

- [1] 新規のLINEチャネルは作らず、5アプリのLINE記事配信(各アプリの`line-broadcast`仕様)が既に使う共通チャネル(`LINE_CHANNEL_ACCESS_TOKEN`)をそのまま使うこと
- [2] 運営者(zaki)個人のLINE userIdは運営者が事前に手動で取得し、新規Secret(例: `LINE_ADMIN_USER_ID`)としてリポジトリに保存すること。取得作業自体(友だち登録の確認・userIdの特定)は本specの自動化対象外とする(根拠: 既存の`LINE_CHANNEL_ACCESS_TOKEN`発行と同じく、コードで強制できない前提条件のため運用手順として扱う)
- [3] push送信も既存の共通チャネルの無料プラン(月200通)の枠内で行われ、他アプリの記事配信と同じ予算を共有すること。失敗が頻発しない前提のため配信予算への影響は小さいと見込むが、無料枠超過時に従量課金はしない(既存のline-broadcast仕様と同じ方針)

</details>

## 依存関係

LINE Messaging API(既存の共通チャネル)は利用できる。運営者個人のLINE userIdの取得は未確定(運営者の事前手動作業が必要)。**🟡〔提案〕**

<details><summary>詳細を開く</summary>

- LINE Messaging API: 既存の共通LINE公式アカウント・チャネルアクセストークン(`LINE_CHANNEL_ACCESS_TOKEN`)が発行済みのため利用できる。参照: [ai-dev-digest/line-broadcast/requirements.md#アカウント・配信主体](../ai-dev-digest/line-broadcast/requirements.md#アカウント・配信主体)
- 運営者個人のLINE userId: 未確定。運営者(zaki)が共通LINE公式アカウントの友だち登録済みであることを前提に、userIdを特定する手動作業が必要

</details>

## スコープ外

- 月次見直しワークフロー(`*-monthly.yml`)の失敗通知〔合意〕
- LINE配信ワークフロー(`*-line-broadcast.yml`)の失敗通知〔合意〕
- `deploy.yml`・`ci.yml`・`supabase-health-check.yml`など記事生成以外のワークフローの失敗通知〔合意〕
- LINE以外の通知チャネル(Slack・メール・ntfy等)の追加〔合意〕
- 失敗原因の自動診断、既存の自動再実行以外の自動復旧処理〔合意〕
- 運営者(zaki)以外への通知、複数人への配信〔合意〕
