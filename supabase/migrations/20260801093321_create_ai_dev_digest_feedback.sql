-- ai_dev_digest_feedback テーブルの新設
-- (仕様: specs/ai-dev-digest/article-detail/design.md「データベース設計」、
--  方針: docs/adr/0001-user-input-database.md、docs/adr/0004-agent-readonly-db-access.md)

create table ai_dev_digest_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  is_test boolean not null default false,
  article_date date not null,
  topic_id text not null,
  comment text not null
);

alter table ai_dev_digest_feedback enable row level security;

-- anonはINSERTのみ許可(閲覧・改ざんはできない。docs/adr/0001の共通方針)
grant insert on ai_dev_digest_feedback to anon;
create policy "anon can insert" on ai_dev_digest_feedback
  for insert to anon with check (true);

-- benriyatool_readonlyはSELECTのみ許可(docs/adr/0004。watchlist-reviewの月次見直しが読む)
grant select on ai_dev_digest_feedback to benriyatool_readonly;
create policy "benriyatool_readonly can select" on ai_dev_digest_feedback
  for select to benriyatool_readonly using (true);
