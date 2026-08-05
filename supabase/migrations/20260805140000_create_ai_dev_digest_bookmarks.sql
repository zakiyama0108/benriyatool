-- ai_dev_digest_bookmarks テーブルの新設
-- (仕様: specs/ai-dev-digest/bookmark/design.md「データベース設計」、
--  方針: docs/adr/0001-user-input-database.md、life-money-sim/saved-scenarioと同じRLSパターン)

create table ai_dev_digest_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  article_date date not null,
  topic_id text not null,
  memo text not null check (char_length(memo) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, article_date, topic_id)
);
alter table ai_dev_digest_bookmarks enable row level security;

-- 本人の行のみSELECT/INSERT/UPDATE/DELETEできる(saved-scenarioと同じ最小権限パターン)
grant select, insert, update, delete on ai_dev_digest_bookmarks to authenticated;

create policy "user can select own bookmarks" on ai_dev_digest_bookmarks
  for select to authenticated using (auth.uid() = user_id);

create policy "user can insert own bookmarks" on ai_dev_digest_bookmarks
  for insert to authenticated with check (auth.uid() = user_id);

create policy "user can update own bookmarks" on ai_dev_digest_bookmarks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user can delete own bookmarks" on ai_dev_digest_bookmarks
  for delete to authenticated using (auth.uid() = user_id);
