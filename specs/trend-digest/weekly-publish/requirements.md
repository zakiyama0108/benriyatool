# 要件定義: 週2回の記事自動生成・公開

> ステータス: 仕様確認中(未実装)

## サマリ
エンタメ編(火曜)・カルチャー・ライフスタイル編(金曜)それぞれの候補収集・選定・要約・記事執筆・公開を自動実行する。ai-dev-digestのdaily-publishと同じく、この機能に限り完全自動マージを行う。

## 概要
- 機能名: 週2回の記事自動生成・公開
- 目的: エンタメ編・カルチャー編それぞれの収集・選定・要約・公開を週1回ずつ(合計週2回)自動実行する。通常はPRレビューを必須とするこのプロジェクトの運用の中で、この機能に限り完全自動マージを行う根拠と条件を明確にする
- 優先度: 高

## ユーザーストーリー
- 運営者として、人手を介さず火曜にエンタメ編、金曜にカルチャー・ライフスタイル編が公開されてほしい
- 運営者として、自動公開の範囲・条件を明確にしておき、想定外の公開が起きないようにしたい

> ユースケース図は、アクターがGitHub Actions(スケジュール実行)のみで、人が直接操作する機能ではないため省略する。

## 機能要件

### 実行
- [1] エンタメ編の収集・選定・要約・記事執筆のバッチを毎週火曜に1回実行する
- [2] カルチャー・ライフスタイル編の収集・選定・要約・記事執筆のバッチを毎週金曜に1回実行する
- [3] 実行主体はGitHub Actions(スケジュール実行のワークフロー)とする。[content-selection/requirements.md](../content-selection/requirements.md)のスクリプトで固定リストジャンルの候補を収集・数値判定し、WebSearchジャンルの候補収集・判定、および[content-generation/requirements.md](../content-generation/requirements.md)に従う要約・記事執筆は、Claude Code CLIのヘッドレス実行(運営者個人のPro/Maxサブスクリプション認証)により1回の実行で行う(ai-dev-digestのdaily-publishと同じ運用パターン)
- [4] 生成した記事はJSON等のコンテンツファイルとしてリポジトリに追加し、ビルド時に取り込まれる形で配信する(サーバーを持たない静的サイトの構成を維持するため)

### 公開フロー
- [5] 生成した記事はブランチを切ってPRを作成し、CI(テスト等)が成功したら人間の承認を待たずに自動的にmainへマージする(ai-dev-digestのdaily-publishと同じ例外運用)
- [6] CIが失敗した場合はマージせず、原因を記録して運営者が把握できるようにする(具体的な通知方法は設計で詰める)

## ビジネスルール・制約

### 掲載件数の保証
- [1] [content-selection/requirements.md](../content-selection/requirements.md)の基準を満たす候補があるジャンルだけを掲載し、候補がないジャンルは掲載しない(架空の話題を作らない)。その回に対象9ジャンルの候補が実在するものも含め1件もない場合のみ、その回の公開をスキップする
- [2] 選定された個々の候補について要約の生成([content-generation/requirements.md](../content-generation/requirements.md))が失敗した場合、その候補だけを除外し、生成に成功した残りの候補でその回の記事を公開する(1件の生成失敗で全体を落とさない、ai-dev-digestと同じ考え方)。選定された全候補の生成が失敗した場合、および利用枠の枯渇でその回の生成を続行できない場合は、記事を公開せずその回の実行を失敗として終える(候補不足による正常なスキップ(緑の実行)とは区別し、運営者がGitHub Actionsの失敗表示で異常に気づけるようにする)

### 自動マージの範囲
- [3] 完全自動マージの対象はこの週次記事生成PRに限る。情報源や採用基準そのものの変更([source-review/requirements.md](../source-review/requirements.md))は対象外とし、別途人間の承認を必須とする(根拠: 週次記事1件の影響範囲は小さいが、基準・情報源の変更は以後の全記事の方向性を左右する重い変更のため)

## 依存関係
- 収集対象・採用基準は[content-selection/requirements.md](../content-selection/requirements.md)に従う
- 要約・記事執筆のルールは[content-generation/requirements.md](../content-generation/requirements.md)に従う
- 生成された記事の表示は[article-list/requirements.md](../article-list/requirements.md)・[article-detail/requirements.md](../article-detail/requirements.md)に従う
- 記事のマージをトリガーに[line-broadcast/requirements.md](../line-broadcast/requirements.md)が起動する

## スコープ外
- 手動でのタイミング指定実行・即時再実行機能
- 週2回を超える実行
- 実行結果の詳細ログを訪問者向けに公開すること
