-- research_digest_feedback テーブルの新設
-- (仕様: specs/research-digest/article-detail/design.md「データベース設計」、
--  方針: docs/adr/0001-user-input-database.md、docs/adr/0004-agent-readonly-db-access.md)
--
-- trend_digest_feedbackと異なり、INSERTできるのは運営者本人(admin_emails)に限定する
-- (画面の表示切り替えだけに頼らずDB側(RLS)でも守るため。
--  前例: supabase/migrations/20260807160000_create_board_game_rules_games.sql)

create table research_digest_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  is_test boolean not null default false,
  article_id text not null,
  finding_id text not null,
  comment text not null check (char_length(comment) between 1 and 1000) -- 1000字は入力欄の上限(requirements.md#運営者向けフィードバック-13)と揃える
);

alter table research_digest_feedback enable row level security;

-- authenticatedは運営者本人(admin_emails)のみINSERT可(入力欄もログイン中の運営者本人にのみ表示される)
grant insert on research_digest_feedback to authenticated;
create policy "admin can insert feedback" on research_digest_feedback
  for insert to authenticated
  with check ((auth.jwt() ->> 'email') in (select email from admin_emails));

-- benriyatool_readonlyはSELECTのみ許可(ADR-0004。source-reviewの月次見直しが読む)
grant select on research_digest_feedback to benriyatool_readonly;
create policy "benriyatool_readonly can select" on research_digest_feedback
  for select to benriyatool_readonly using (true);
