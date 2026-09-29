-- future_digest_bookmarks テーブルの新設
-- (仕様: specs/future-digest/bookmark/design.md「データベース設計」、
--  方針: docs/adr/0001-user-input-database.md、news-digestのnews_digest_bookmarksと同じ
--  本人行のみRLSパターン。architecture.md#3-設計方針)

create table future_digest_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id text not null,
  prediction_id text not null,
  memo text not null check (char_length(btrim(memo)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, article_id, prediction_id)
);
alter table future_digest_bookmarks enable row level security;

-- 本人の行のみSELECT/INSERT/UPDATE/DELETEできる(news_digest_bookmarksと同じ最小権限パターン)
grant select, insert, update, delete on future_digest_bookmarks to authenticated;

create policy "user can select own bookmarks" on future_digest_bookmarks
  for select to authenticated using (auth.uid() = user_id);

create policy "user can insert own bookmarks" on future_digest_bookmarks
  for insert to authenticated with check (auth.uid() = user_id);

create policy "user can update own bookmarks" on future_digest_bookmarks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user can delete own bookmarks" on future_digest_bookmarks
  for delete to authenticated using (auth.uid() = user_id);

-- benriyatool_readonlyはSELECTのみ許可(ADR-0004。data-checkでの集計に使う)
grant select on future_digest_bookmarks to benriyatool_readonly;

create policy "benriyatool_readonly can select" on future_digest_bookmarks
  for select to benriyatool_readonly using (true);
