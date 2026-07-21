-- life_money_sim_saved_scenarios: ログイン中の利用者本人のマイシナリオ保存
-- (仕様: specs/life-money-sim/saved-scenario/design.md「データベース設計」、
--  方針: docs/adr/0001-user-input-database.md の「ログインが必要なアプリ」の想定パターン)

create table life_money_sim_saved_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  input_state jsonb not null,
  created_at timestamptz not null default now()
);
alter table life_money_sim_saved_scenarios enable row level security;

-- 現時点の機能(保存=新規INSERT・一覧SELECT・DELETE)にUPDATEは含まないため、
-- 最小権限の原則に沿ってGRANT/ポリシーもSELECT/INSERT/DELETEのみ付与する
-- (仕様変更で上書き保存・リネーム等を追加する際にUPDATEを追加する)
grant select, insert, delete on life_money_sim_saved_scenarios to authenticated;

create policy "user can select own scenarios" on life_money_sim_saved_scenarios
  for select to authenticated using (auth.uid() = user_id);

create policy "user can insert own scenarios" on life_money_sim_saved_scenarios
  for insert to authenticated with check (auth.uid() = user_id);

create policy "user can delete own scenarios" on life_money_sim_saved_scenarios
  for delete to authenticated using (auth.uid() = user_id);
