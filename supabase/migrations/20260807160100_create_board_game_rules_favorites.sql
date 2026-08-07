-- board_game_rules_favorites テーブルの新設
-- (仕様: specs/board-game-rules/favorite/design.md「データベース設計」、
--  方針: docs/adr/0001-user-input-database.md、ai-dev-digest/bookmark と同じ本人限定RLSパターン)
--
-- 前提: board_game_rules_games(20260807160000)が先に適用されていること。
-- ログイン中の本人のみ自分のお気に入りをSELECT/INSERT/DELETEできる。1ゲームにつき本人1件。

create table board_game_rules_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  game_id uuid not null references board_game_rules_games(id),
  created_at timestamptz not null default now(),
  unique (user_id, game_id)
);
alter table board_game_rules_favorites enable row level security;

-- 本人の行のみSELECT/INSERT/DELETEできる(saved-scenario/bookmarkと同じ最小権限)
grant select, insert, delete on board_game_rules_favorites to authenticated;

create policy "user can select own favorites" on board_game_rules_favorites
  for select to authenticated using (auth.uid() = user_id);

create policy "user can insert own favorites" on board_game_rules_favorites
  for insert to authenticated with check (auth.uid() = user_id);

create policy "user can delete own favorites" on board_game_rules_favorites
  for delete to authenticated using (auth.uid() = user_id);

-- benriyatool_readonly はSELECTのみ(docs/adr/0004)
grant select on board_game_rules_favorites to benriyatool_readonly;
create policy "benriyatool_readonly can select favorites" on board_game_rules_favorites
  for select to benriyatool_readonly using (true);
