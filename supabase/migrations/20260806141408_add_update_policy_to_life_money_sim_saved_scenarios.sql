-- life_money_sim_saved_scenarios: 上書き保存のためのUPDATE権限を追加
-- (仕様: specs/life-money-sim/saved-scenario/design.md「マイグレーション追加分」、
--  方針: docs/adr/0001-user-input-database.md)

grant update on life_money_sim_saved_scenarios to authenticated;

create policy "user can update own scenarios" on life_money_sim_saved_scenarios
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
