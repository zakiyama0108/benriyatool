# 要件定義: 毎週木曜の記事自動生成・公開

> ステータス: 仕様確認中(未実装)

## サマリ
毎週木曜の朝に、未来予測記事の収集・選定・要約・記事の組み立て・公開を自動で行う。trend-digestのweekly-publishと同じく、この週次記事PRに限り、CIが通れば人の承認を待たずにmainへ自動マージする。

## 概要
- 機能名: 毎週木曜の記事自動生成・公開
- 目的: 週1回(木曜)、未来予測記事の収集から公開までを自動で行う。自動マージの範囲と条件をはっきりさせる
- 優先度: 高

## ユーザーストーリー
- 運営者として、人手をかけずに毎週木曜の朝に未来予測記事が公開されてほしい
- 運営者として、自動公開の範囲・条件をはっきりさせ、想定外の公開が起きないようにしたい

> ユースケース図は、実行するのがGitHub Actions(スケジュール実行)だけで、人が直接操作する機能ではないため省略する。

## 機能要件

### 実行
- [1] 毎週木曜の朝(日本時間)に、収集・選定・要約・記事の組み立てを1回実行する(根拠: /requirementでの決定。既存のdigestアプリが配信していない木曜を埋めるため)。具体的な時刻は、既存digestのワークフローと時間帯がかぶらないように設計で決める
- [2] 実行主体はGitHub Actions(スケジュール実行のワークフロー)とする。収集・選定・要約は、Claude Code CLIのヘッドレス実行(運営者個人のPro/Maxサブスクリプション認証)で行う(trend-digestと同じ運用パターン)
- [3] 作った記事はJSONのコンテンツファイルとしてリポジトリに追加し、ビルド時に取り込んで配信する(サーバーを持たない静的サイトの構成を保つため)

### 公開フロー
- [4] 作った記事はブランチを切ってPRを作成し、CIが成功したら人の承認を待たずにmainへ自動マージする(trend-digestのweekly-publishと同じ例外運用)
- [5] CIが失敗した場合はマージせず、運営者が気づけるようにする(具体的な通知方法は設計で決める)

## ビジネスルール・制約

### 掲載件数の保証
- [1] 候補が見つからない枠は、「候補が見つからなかった」ことが分かる記載にして公開する([content-selection/requirements.md#候補が見つからない枠](../content-selection/requirements.md))。全枠(有効なジャンル数×2時間軸。現在は20枠)で1本も採用できなかった場合に限り、その回の公開をスキップする(候補なしによる正常なスキップ)
- [2] 収集の処理自体が失敗した枠は、[content-selection/requirements.md#収集失敗](../content-selection/requirements.md)の分類ラベルを添えて公開する。候補なしとは区別し、公開のスキップ判定([1])にも数えない。全枠が収集失敗した回は、公開せずに実行を失敗として終える(候補なしによる正常なスキップとは区別し、GitHub Actionsの失敗表示で気づけるようにする)
- [3] 個々の記事の要約の生成に失敗した場合は、その記事だけを除き、残りで公開する。全件の生成に失敗した場合と、利用枠の枯渇で続行できない場合は、公開せずに実行を失敗として終える(候補不足による正常なスキップとは区別し、GitHub Actionsの失敗表示で気づけるようにする)

### 自動マージの範囲
- [3] 自動マージの対象はこの週次記事PRだけとする。ジャンル・採用基準・執筆ルールの変更([source-review/requirements.md](../source-review/requirements.md))は、人の承認を必須とする(根拠: 基準の変更は以後のすべての記事の方向性を左右するため)

## 依存関係
- 選定ルールは[content-selection/requirements.md](../content-selection/requirements.md)、執筆ルールは[content-generation/requirements.md](../content-generation/requirements.md)に従う
- 記事の表示は[article-list/requirements.md](../article-list/requirements.md)・[article-detail/requirements.md](../article-detail/requirements.md)に従う
- 記事のマージをきっかけに[line-broadcast/requirements.md](../line-broadcast/requirements.md)が動く

## スコープ外
- 手動での日時指定実行・即時の再実行機能(Secrets設定後の動作確認用の`workflow_dispatch`起動は除く。design.md「実行環境の前提」参照)
- 週1回を超える実行
- 実行ログの訪問者向け公開
