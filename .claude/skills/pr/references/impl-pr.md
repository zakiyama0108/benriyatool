# 実装PRの手順・テンプレート

「実装PR」を作成する(実装完了・[/implementation-review](../../implementation-review/SKILL.md)通過後)ときに読むファイル。仕様承認PR(早期仕様PR・仕様承認ゲート)の作成では読まない(トークン節約のため[SKILL.md](../SKILL.md)本体から分離している)。

PR作成前にimpl-pr-reviewerエージェント(`.claude/agents/impl-pr-reviewer.md`)でチェックし、❌を解消してから作成する(承認ステータスマーカーの削除漏れ・spec-coverage・CIの横断チェック)。

**UI変更がある場合の自問(`gh pr create`の直前に必ず行う):** 「このセッションで、devサーバーを起動したままlocalhostの生きたURL(`http://localhost:3000/<パス>`)をユーザーに提示し、ユーザー自身の明示的なOKを得たか?」。得ていなければ、コードレビューでのスクリーンショット確認(code-reviewer/ui-checkerによる自己検証)が済んでいても`gh pr create`に進まず、まずURLを提示してユーザーの確認を待つ([/implementation-review](../../implementation-review/SKILL.md)の「完了時の次ステップ案内」参照)。

`npm run check:spec-coverage`でrequirements.md/design.mdの各仕様項目にテストが紐づいているかを確認する(CIでも同じチェックが走り、❌が残っていると失敗する)。テストが不要な項目は`scripts/spec-coverage-skip.json`に理由を添えて登録する([/implementation](../../implementation/SKILL.md)参照)。

本文テンプレート:

```markdown
## 概要
(何を実装・修正したか1〜2行)

## 関連spec
- specs/<アプリ名>/<機能名>/requirements.md

## 変更内容
- (主な変更点の箇条書き)

## テスト
- npm test: ✅ n件パス
- npm run check:spec-coverage: ✅ ❌なし

## 動作確認
- (UI変更がある場合: ユーザーがlocalhostの生きたURLで確認しOKを得た旨を明記。UI変更がない場合: npm run dev で確認した内容)
```
