-- board_game_rules_game_requests テーブルの新設
-- (仕様: specs/board-game-rules/game-registration/design.md「データベース設計」、
--  方針: docs/adr/0001-user-input-database.md)
--
-- 2026-08の見直しで導入(docs/adr/0007「2026-08の見直し」参照)。利用者からの登録依頼
-- (写真+任意の分類情報)を保存する。この時点ではゲームは公開されず、運営者がローカル
-- 登録ツールで確認・登録して初めて board_game_rules_games に反映される。匿名投稿のため
-- auth.users とのリレーションは持たない(board_game_rules_reportsと同様)。

create table board_game_rules_game_requests (
  id uuid primary key default gen_random_uuid(),
  photo_paths text[] not null,
  name text,
  min_players int,
  max_players int,
  min_minutes int,
  max_minutes int,
  genres text[] not null default '{}' check (genres <@ array[
    '協力', '対戦', '正体隠匿', '戦略', 'パーティー', 'ファミリー',
    'カードゲーム', 'すごろく系', 'ワーカープレイスメント', 'デッキ構築', '推理・デダクション', 'その他'
  ]::text[]),
  min_age int,
  difficulty text,
  publisher text,
  author text,
  has_japanese_rules boolean,
  awards text,
  release_year int,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  check (min_players is null or max_players is null or min_players <= max_players),
  check (min_minutes is null or max_minutes is null or min_minutes <= max_minutes)
);
alter table board_game_rules_game_requests enable row level security;

-- 送信: 誰でも(anon含む)INSERTできる
grant insert on board_game_rules_game_requests to anon, authenticated;
create policy "anyone can insert game request" on board_game_rules_game_requests
  for insert to anon, authenticated with check (true);

-- 確認・処理済みマーク・削除: 運営者本人のみ
grant select, update, delete on board_game_rules_game_requests to authenticated;
create policy "admin can select game requests" on board_game_rules_game_requests
  for select to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails));
create policy "admin can update game requests" on board_game_rules_game_requests
  for update to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails))
  with check ((auth.jwt() ->> 'email') in (select email from admin_emails));
create policy "admin can delete game requests" on board_game_rules_game_requests
  for delete to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails));

-- benriyatool_readonly はSELECTのみ(docs/adr/0004)
grant select on board_game_rules_game_requests to benriyatool_readonly;
create policy "benriyatool_readonly can select game requests" on board_game_rules_game_requests
  for select to benriyatool_readonly using (true);
