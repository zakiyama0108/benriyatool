-- news_digest_feedback テーブルの新設
-- (仕様: specs/news-digest/article-detail/design.md「データベース設計」、
--  方針: docs/adr/0001-user-input-database.md、docs/adr/0004-agent-readonly-db-access.md)
--
-- ai-dev-digestのai_dev_digest_feedbackが後日修正(20260805135824)でauthenticated INSERT専用に
-- 直した最終形を、news_digest_feedbackでは最初から適用する(この入力欄はログイン中のみ画面に
-- 表示されるため、anonへのGRANTは対応しない)。

create table news_digest_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  is_test boolean not null default false,
  article_date date not null,
  topic_id text not null,
  comment text not null
);

alter table news_digest_feedback enable row level security;

-- authenticatedはINSERTのみ許可(この入力欄はログイン中のみ表示される。docs/adr/0001の共通方針)
grant insert on news_digest_feedback to authenticated;
create policy "authenticated can insert" on news_digest_feedback
  for insert to authenticated with check (true);

-- benriyatool_readonlyはSELECTのみ許可(docs/adr/0004。monthly-reviewの月次見直しが読む)
grant select on news_digest_feedback to benriyatool_readonly;
create policy "benriyatool_readonly can select" on news_digest_feedback
  for select to benriyatool_readonly using (true);
