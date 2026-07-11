# .claude/settings.json の許可コマンド一覧

`permissions.allow` はJSON標準のためコメントを書けない(`//`を入れるとファイル全体が静かにパース失敗しデフォルト設定にフォールバックすることを確認済み)。そのため、各許可ルールの意味をここに記録する。

## permissions.allow

現在 `permissions.allow` は空。グローバル設定(`~/.claude/settings.json`)で `defaultMode: "auto"`(操作ごとにAIが安全性を判定し、安全なものは無確認で実行)を採用したため、個別コマンドのallowリストは2026-07-11に全削除した。シークレットファイル(.env・SSH鍵・AWS認証情報)の読み取り拒否もグローバル側の `permissions.deny` で管理している。

## ルール
`.claude/settings.json` の `permissions.allow` にコマンドを追加する際は、必ずこのファイルに台帳形式(`| ルール | 説明 |` のテーブル)で1行追記する(同じPR内で行う)。autoモード運用では基本的に追加不要のため、追加するのは「autoモードの判定を待たず常に許可したい頻出コマンド」がある場合のみ。