-- board_game_rules_games テーブルの新設
-- (仕様: specs/board-game-rules/game-registration/design.md「データベース設計」、
--  方針: docs/adr/0001-user-input-database.md、docs/adr/0007-runtime-llm-server-and-writable-admin.md)
--
-- 誰でも(anon含む)登録・閲覧できる公開ゲーム情報。運営者は編集・論理削除・元写真照合ができる。
-- 元写真パス(photo_paths)は anon の列単位SELECT権限から除外し、一般には返さない。

create table board_game_rules_games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_players int not null,
  max_players int not null,
  min_minutes int not null,
  max_minutes int not null,
  genre text,
  min_age int,
  difficulty text,
  publisher text,
  author text,
  has_japanese_rules boolean,
  awards text,
  rules_simple text not null,
  rules_detailed jsonb not null,
  is_official boolean not null default false,
  photo_paths text[] not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (min_players <= max_players),
  check (min_minutes <= max_minutes),
  -- ルール本文の防御上限(巨大データ投入対策)。画面のmaxLength(UX上限)とは別のDB側防御。
  check (char_length(rules_simple) <= 4000),
  check (char_length(rules_detailed::text) <= 40000) -- jsonbは::text化した全体長で担保
);
alter table board_game_rules_games enable row level security;

-- 閲覧: 公開中(削除されていない)の行は誰でもSELECTできる。
-- photo_paths(元写真パス)は列単位のSELECT権限から除外し、anon が直接
-- `select photo_paths ...` できないようにする(列単位の秘匿をDB側で担保する)。
-- 運営者は照合閲覧で photo_paths が必要なため authenticated には全列SELECTを付与し、
-- 行はRLSで制御する(specs/board-game-rules/admin/design.md)。
grant select (
  id, name, min_players, max_players, min_minutes, max_minutes,
  genre, min_age, difficulty, publisher, author, has_japanese_rules,
  awards, rules_simple, rules_detailed, is_official, created_at, deleted_at
) on board_game_rules_games to anon;
grant select on board_game_rules_games to authenticated;
create policy "anyone can select published games" on board_game_rules_games
  for select to anon, authenticated using (deleted_at is null);

-- 登録: 未ログイン(anon)は is_official=false でのみINSERTできる
grant insert on board_game_rules_games to anon, authenticated;
create policy "anon can insert non-official games" on board_game_rules_games
  for insert to anon with check (is_official = false and deleted_at is null);

-- 登録: ログイン中は、運営者本人のときのみ is_official=true を許可。
-- 運営者以外のログインユーザーは is_official=false でのみINSERTできる
create policy "authenticated can insert games" on board_game_rules_games
  for insert to authenticated with check (
    deleted_at is null
    and (is_official = false
         or (auth.jwt() ->> 'email') in (select email from admin_emails))
  );

-- 管理: 運営者本人は全行SELECT(削除済み含む)・UPDATE(編集・論理削除)ができる(admin/design.md)
create policy "admin can select all games" on board_game_rules_games
  for select to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails));
grant update on board_game_rules_games to authenticated;
create policy "admin can update games" on board_game_rules_games
  for update to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails))
  with check ((auth.jwt() ->> 'email') in (select email from admin_emails));

-- benriyatool_readonly はSELECTのみ(docs/adr/0004)
grant select on board_game_rules_games to benriyatool_readonly;
create policy "benriyatool_readonly can select games" on board_game_rules_games
  for select to benriyatool_readonly using (true);
