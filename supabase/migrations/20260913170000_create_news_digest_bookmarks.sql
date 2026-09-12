-- news_digest_bookmarks テーブルの新設
-- (仕様: specs/news-digest/bookmark/design.md「データベース設計」、
--  方針: docs/adr/0001-user-input-database.md、life-money-sim/saved-scenarioと同じRLSパターン)
--
-- ai-dev-digestのai_dev_digest_bookmarksが後日追加(20260806025325)したbenriyatool_readonly向け
-- SELECT権限を、news_digest_bookmarksでは最初から適用する。

create table news_digest_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  article_date date not null,
  topic_id text not null,
  memo text not null check (char_length(memo) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, article_date, topic_id)
);
alter table news_digest_bookmarks enable row level security;

-- 本人の行のみSELECT/INSERT/UPDATE/DELETEできる(saved-scenarioと同じ最小権限パターン)
grant select, insert, update, delete on news_digest_bookmarks to authenticated;

create policy "user can select own bookmarks" on news_digest_bookmarks
  for select to authenticated using (auth.uid() = user_id);

create policy "user can insert own bookmarks" on news_digest_bookmarks
  for insert to authenticated with check (auth.uid() = user_id);

create policy "user can update own bookmarks" on news_digest_bookmarks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user can delete own bookmarks" on news_digest_bookmarks
  for delete to authenticated using (auth.uid() = user_id);

-- benriyatool_readonlyはSELECTのみ許可(docs/adr/0004。data-checkでの集計に使う)
grant select on news_digest_bookmarks to benriyatool_readonly;

create policy "benriyatool_readonly can select" on news_digest_bookmarks
  for select to benriyatool_readonly using (true);
