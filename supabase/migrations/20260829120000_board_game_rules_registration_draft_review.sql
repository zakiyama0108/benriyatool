-- board-game-rules: 登録実行のローカルトリガー化・下書きレビュー・再調整ループのための
-- 状態管理カラムと、公開時の board_game_rules_games への運営者本人限定 INSERT ポリシーを追加する。
-- 背景: specs/board-game-rules/game-registration/design.md「追加マイグレーション(登録実行・下書きレビュー)」、
--       specs/board-game-rules/admin/design.md「登録実行・下書きレビューの処理」、
--       specs/board-game-rules/adr/0002-operator-publish-insert.md。
--
-- 既存の create table 文(20260807160500_create_board_game_rules_game_requests.sql)は変更せず、
-- ALTER TABLE / INSERT ポリシー追加として積む(supabase/migrations/README.md のルール)。
-- draft_content・revision_note・revision_history には board_game_rules_games の rules_simple/
-- rules_detailed のような文字数上限 CHECK を設けない(書き込み主体が service_role 相当のローカル処理・
-- 運営者本人に限られ、匿名からの巨大データ投入という脅威が構造的にないため。公開時に INSERT される
-- board_game_rules_games 側には既存の上限 CHECK が引き続き適用される)。

-- board_game_rules_game_requests へ登録実行・下書きレビュー用のカラムを追加
alter table board_game_rules_game_requests
  add column status text not null default 'pending'
    check (status in ('pending', 'queued', 'running', 'draft', 'published', 'failed')),
  add column draft_content jsonb,
  add column revision_note text,
  add column revision_round int not null default 0,
  add column revision_history jsonb not null default '[]',
  add column error_message text,
  -- on delete set null にする理由: デフォルト(no action)のままだと、依頼経由で公開したゲームを
  -- 運営者が物理削除しようとした際に FK 違反で失敗し、既存の物理削除機能(game-detail/design.md
  -- 「物理削除のDB設計」)を壊す。games 行が消えても依頼レコード自体は残したいため cascade ではなく set null にする
  add column published_game_id uuid references board_game_rules_games(id) on delete set null;

-- 登録: 運営者本人による公開操作(下書きの内容でゲームを INSERT)を認める。
-- anon/authenticated への一般 INSERT 許可は行わず、admin_emails に載る運営者本人のみに限定する
-- (根拠: specs/board-game-rules/adr/0002-operator-publish-insert.md)
grant insert on board_game_rules_games to authenticated;
create policy "admin can insert games" on board_game_rules_games
  for insert to authenticated
  with check ((auth.jwt() ->> 'email') in (select email from admin_emails));

-- status/draft_content 等の新規カラムは、既存の
-- "admin can update game requests"(grant update on board_game_rules_game_requests to authenticated、
-- テーブル単位の UPDATE)がそのまま適用されるため、追加の GRANT・ポリシーは不要
