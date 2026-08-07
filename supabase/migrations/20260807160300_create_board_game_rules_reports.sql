-- board_game_rules_reports テーブルの新設
-- (仕様: specs/board-game-rules/report/design.md「データベース設計」、
--  方針: docs/adr/0001-user-input-database.md)
--
-- 前提: board_game_rules_games(20260807160000)と、共用の admin_emails(ikukyu/adminで作成済み)が
--       適用時点で存在していること。
-- 匿名通報。誰でもINSERTでき、SELECTは運営者本人のみ。通報者を特定する情報は保存しない。

create table board_game_rules_reports (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references board_game_rules_games(id),
  reason text check (reason is null or char_length(reason) <= 1000), -- 上限1000(短い補足用途。design.md「通報を送信する処理」参照)
  created_at timestamptz not null default now()
);
alter table board_game_rules_reports enable row level security;

-- 送信: 誰でも(anon含む)INSERTできる。SELECTは付与しない(通報者・第三者は自分の通報も含め読めない)
grant insert on board_game_rules_reports to anon, authenticated;
create policy "anyone can insert report" on board_game_rules_reports
  for insert to anon, authenticated with check (true);

-- 確認: 運営者本人のみSELECTできる(admin/design.md)
grant select on board_game_rules_reports to authenticated;
create policy "admin can select reports" on board_game_rules_reports
  for select to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails));

-- benriyatool_readonly はSELECTのみ(docs/adr/0004)
grant select on board_game_rules_reports to benriyatool_readonly;
create policy "benriyatool_readonly can select reports" on board_game_rules_reports
  for select to benriyatool_readonly using (true);
