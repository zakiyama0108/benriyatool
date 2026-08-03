# 要件定義: 日次記事の自動生成・公開

## 概要
- 機能名: 日次記事の自動生成・公開
- 目的: ダイジェスト記事の収集・翻訳・要約・公開を1日1回自動実行する。通常はPRレビューを必須とするこのプロジェクトの運用の中で、この機能に限り完全自動マージを行う根拠と条件を明確にする
- 優先度: 高

## ユーザーストーリー
- 運営者として、人手を介さず毎日記事が公開されてほしい
- 運営者として、自動公開の範囲・条件を明確にしておき、想定外の公開が起きないようにしたい

## 機能要件

### 実行
- [1] 収集・翻訳・要約・記事執筆のバッチを1日1回実行する
- [2] 実行主体はGitHub Actions(スケジュール実行のワークフロー)とする。[content-selection/requirements.md](../content-selection/requirements.md)のスクリプトでウォッチリストから候補を収集・数値判定し、Anthropic API呼び出しにより翻訳・要約・記事執筆までを1回の実行で行う(2026-08改定。当初はClaude Routinesを実行主体とする想定だったが、Routine実行環境に独自の環境変数・シークレット(YouTube Data APIキー等)を追加する手段が確認できず、GitHub Actionsに変更した。詳細はdesign.md「実行環境の前提」参照)
- [3] 生成した記事はMarkdown等のコンテンツファイルとしてリポジトリに追加し、ビルド時に取り込まれる形で配信する(サーバーを持たない静的サイトの構成を維持するため)

### 公開フロー
- [4] 生成した記事はブランチを切ってPRを作成し、CI(テスト等)が成功したら人間の承認を待たずに自動的にmainへマージする(通常のCLAUDE.mdの運用(人間レビュー必須)の例外。根拠: ユーザーが著作権リスクの説明を理解した上で明示的に許可した特別対応)
- [5] CIが失敗した場合はマージせず、原因を記録して運営者が把握できるようにする(具体的な通知方法は設計で詰める)

## ビジネスルール・制約

### 掲載件数の保証
- [1] [content-selection/requirements.md](../content-selection/requirements.md)の基準を満たすトピックが不足していても、実在する候補(基準未達の候補を含む)が1件以上ある限りその件数のまま記事を公開する(スキップしない)。その日に収集した候補が実在するものも含め1件もない場合のみ、その日はスキップする。詳細は同specの該当ルールに従う

### 自動マージの範囲
- [2] 完全自動マージの対象はこの日次記事生成PRに限る。ウォッチリストや採用基準そのものの変更([watchlist-review/requirements.md](../watchlist-review/requirements.md))は対象外とし、別途人間の承認を必須とする(根拠: 日次記事1件の影響範囲は小さいが、基準・ウォッチリストの変更は以後の全記事の方向性を左右する重い変更のため)

## 依存関係
- 収集対象・採用基準は[content-selection/requirements.md](../content-selection/requirements.md)に従う
- 翻訳・要約・記事執筆のルールは[content-generation/requirements.md](../content-generation/requirements.md)に従う
- 生成された記事の表示は[article-list/requirements.md](../article-list/requirements.md)・[article-detail/requirements.md](../article-detail/requirements.md)に従う

## スコープ外
- 手動でのタイミング指定実行・即時再実行機能
- 1日に複数回の実行
- 実行結果の詳細ログを訪問者向けに公開すること
