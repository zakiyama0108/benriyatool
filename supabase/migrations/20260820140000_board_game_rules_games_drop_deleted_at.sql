-- board-game-rules: 論理削除(deleted_at)を廃止し、物理削除へ統一する。
-- 背景: specs/board-game-rules/adr/0001-moderation-on-detail-and-physical-delete.md、
--       specs/board-game-rules/game-detail/design.md「物理削除のDB設計」3。
--
-- 注意: このマイグレーションは deleted_at を参照する稼働中コード(app/board-game-rules/lib/games.ts の
-- deleted_at 絞り込み・admin側の論理削除など)を deleted_at 非依存に改修するコード変更と
-- 同一デプロイで適用する(列だけ先行して落とすと稼働中のdeleted_atクエリが壊れるため)。
-- DELETEポリシー・子FKのカスケードは先行適用済み(20260820130000)。

-- これまで論理削除(deleted_at セット)されていた行は、物理削除への統一に伴い実際に削除する。
-- これをしないと、公開SELECTのRLSを using(true) にした時点で「削除済み」だった行が再び表示されてしまう。
-- 子レコード(コメント・お気に入り・通報)は子FKの ON DELETE CASCADE で連動削除される(20260820130000)。
delete from board_game_rules_games where deleted_at is not null;

-- 公開SELECTのRLSから deleted_at 条件を外す(物理削除に統一したため、存在する行はすべて公開対象)。
alter policy "anyone can select published games" on board_game_rules_games
  using (true);

-- 論理削除用の列を廃止する。anon への列単位SELECT付与に含まれていた deleted_at も、
-- 列削除に伴い自動的に権限対象から外れる。
alter table board_game_rules_games drop column deleted_at;
