-- trend_digest_feedback テーブルの新設
-- (仕様: specs/trend-digest/article-detail/design.md「データベース設計」、
--  方針: docs/adr/0001-user-input-database.md、docs/adr/0004-agent-readonly-db-access.md)
--
-- ai-dev-digestのai_dev_digest_feedbackで判明した教訓(20260805135824)を踏まえ、
-- この入力欄はGoogle OIDCでログイン中のみ表示されるため、当初からINSERT対象ロールを
-- authenticatedにする(anonへ誤って付与しない)

create table trend_digest_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  is_test boolean not null default false,
  article_id text not null,
  topic_id text not null,
  comment text not null
);

alter table trend_digest_feedback enable row level security;

-- authenticatedはINSERTのみ許可(この入力欄はログイン中のみ表示されるため)
grant insert on trend_digest_feedback to authenticated;
create policy "authenticated can insert" on trend_digest_feedback
  for insert to authenticated with check (true);

-- benriyatool_readonlyはSELECTのみ許可(ADR-0004。source-reviewの月次見直しが読む)
grant select on trend_digest_feedback to benriyatool_readonly;
create policy "benriyatool_readonly can select" on trend_digest_feedback
  for select to benriyatool_readonly using (true);
