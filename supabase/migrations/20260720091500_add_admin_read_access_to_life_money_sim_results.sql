-- life_money_sim_results の管理画面閲覧権限を追加する
-- (仕様: specs/life-money-sim/admin/design.md「データベース設計」、
--  方針: docs/adr/0006-admin-screen-oidc-rls.md。admin_emailsはikukyu/adminで作成済みのものを共用する)

grant select on life_money_sim_results to authenticated;

create policy "admin can select all" on life_money_sim_results
  for select to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails));
