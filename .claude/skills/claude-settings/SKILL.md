---
name: claude-settings
description: .claude/settings.jsonのpermissions.allowを追加・変更するときに使う。
---

# 許可コマンド追加時のルール

`.claude/settings.json` の `permissions.allow` に新しいコマンドを追加する時は、JSON標準はコメント不可のため(`//`を入れるとファイル全体が静かにパース失敗しデフォルト設定にフォールバックすることを確認済み)、`.claude/permissions.md` にそのルールの意味を1行追記する(同じPR内で行う)。

台帳の形式・既存エントリは `.claude/permissions.md` を参照する。