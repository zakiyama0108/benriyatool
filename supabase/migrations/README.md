# DBマイグレーション

Supabaseのスキーマ変更SQLを置くフォルダ(背景・運用ルール: [docs/adr/0003](../../docs/adr/0003-db-schema-migration-ci.md))。

## ルール

- ファイル名は `<YYYYMMDDHHMMSS>_<変更内容>.sql`(例: `20260713120000_add_is_test_to_ikukyu_results.sql`)。タイムスタンプ順に適用される
- mainにマージされると`deploy.yml`のmigrateジョブが`supabase db push`で自動適用する(デプロイより先に実行される)
- 適用済みファイルはDB内の管理テーブルに記録され二重適用されないため、**一度mainにマージしたファイルは編集しない**(修正は新しいマイグレーションファイルで行う)
- ダッシュボードのSQLエディタでの手動スキーマ変更はしない(マイグレーションと実DBがずれるため)
