-- board-game-rules: ゲームの物理削除に必要なDELETEポリシーと、子テーブルの連動削除(カスケード)を追加する。
-- 背景: specs/board-game-rules/adr/0001-moderation-on-detail-and-physical-delete.md、
--       specs/board-game-rules/game-detail/design.md「物理削除のDB設計」。
--
-- 注意: deleted_at列の削除・公開SELECT RLSのtrue化は本マイグレーションに含めない。
-- deleted_atを参照する稼働中コード(app/board-game-rules/lib/games.ts 等)の改修と同時に
-- デプロイする必要があり、列だけ先に削除すると稼働中のdeleted_atクエリが壊れるため。
-- 列削除はgame-detail/adminの実装(deleted_atを参照しないコードへの改修)と同じPRで行う。

-- 運営者本人のみゲームを物理削除(DELETE)できる。書き込みの場は詳細画面の管理者導線。
grant delete on board_game_rules_games to authenticated;
create policy "admin can delete games" on board_game_rules_games
  for delete to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails));

-- ゲームを物理削除したとき、紐づく子レコード(コメント・お気に入り・通報)を連動削除する。
-- 既存の外部キー(カスケードなし)をDROPし、on delete cascade付きで再作成する。
-- カスケードは参照アクションのため子テーブルのRLSに関係なく削除される(運営者が
-- 通報・お気に入りのDELETE RLSを持たなくても、ゲーム削除に伴い子行が消える)。
alter table board_game_rules_comments
  drop constraint board_game_rules_comments_game_id_fkey,
  add constraint board_game_rules_comments_game_id_fkey
    foreign key (game_id) references board_game_rules_games(id) on delete cascade;

alter table board_game_rules_favorites
  drop constraint board_game_rules_favorites_game_id_fkey,
  add constraint board_game_rules_favorites_game_id_fkey
    foreign key (game_id) references board_game_rules_games(id) on delete cascade;

alter table board_game_rules_reports
  drop constraint board_game_rules_reports_game_id_fkey,
  add constraint board_game_rules_reports_game_id_fkey
    foreign key (game_id) references board_game_rules_games(id) on delete cascade;
