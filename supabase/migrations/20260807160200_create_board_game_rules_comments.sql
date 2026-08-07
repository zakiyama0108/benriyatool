-- board_game_rules_comments テーブルの新設
-- (仕様: specs/board-game-rules/comment/design.md「データベース設計」、
--  方針: docs/adr/0001-user-input-database.md)
--
-- 前提: board_game_rules_games(20260807160000)と、共用の admin_emails(ikukyu/adminで作成済み)が
--       適用時点で存在していること。
-- 閲覧は誰でも(anon含む)、投稿・編集は本人のみ、削除は本人+運営者。
-- 表示名(author_name)は公開表示のため投稿時に非正規化して保存する(anonはauth.usersを読めないため)。

create table board_game_rules_comments (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references board_game_rules_games(id),
  user_id uuid not null references auth.users(id),
  author_name text not null,
  body text not null check (char_length(body) <= 2000), -- 上限2000(助け合いの短文用途。design.md「バリデーション」参照)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table board_game_rules_comments enable row level security;

-- 閲覧: 誰でも(anon含む)SELECTできる(公開コメント)
grant select on board_game_rules_comments to anon, authenticated;
create policy "anyone can select comments" on board_game_rules_comments
  for select to anon, authenticated using (true);

-- 投稿: ログイン中の本人のuser_idでのみINSERTできる
grant insert on board_game_rules_comments to authenticated;
create policy "user can insert own comment" on board_game_rules_comments
  for insert to authenticated with check (auth.uid() = user_id);

-- 編集: 投稿者本人のみUPDATEできる(運営者でも他人のコメントは編集不可)
grant update on board_game_rules_comments to authenticated;
create policy "user can update own comment" on board_game_rules_comments
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 削除: 投稿者本人、または運営者本人がDELETEできる
grant delete on board_game_rules_comments to authenticated;
create policy "user or admin can delete comment" on board_game_rules_comments
  for delete to authenticated using (
    auth.uid() = user_id
    or (auth.jwt() ->> 'email') in (select email from admin_emails)
  );

-- benriyatool_readonly はSELECTのみ(docs/adr/0004)
grant select on board_game_rules_comments to benriyatool_readonly;
create policy "benriyatool_readonly can select comments" on board_game_rules_comments
  for select to benriyatool_readonly using (true);
