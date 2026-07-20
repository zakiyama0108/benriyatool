-- life_money_sim_results テーブルの新設
-- (仕様: specs/life-money-sim/save-result/design.md「データベース設計」、
--  方針: docs/adr/0001-user-input-database.md)

create table life_money_sim_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  has_spouse boolean not null,
  children_count integer not null,
  monthly_salary numeric not null,
  personal_expense_monthly numeric not null,
  household_expense_total numeric,
  my_household_share numeric,
  starting_asset numeric not null,
  investment_mode boolean not null,
  expected_annual_rate numeric,
  event_count integer not null,
  final_month_asset numeric not null,
  monthly_surplus numeric not null,
  is_test boolean not null default false
);

alter table life_money_sim_results enable row level security;

-- anonはINSERTのみ許可(閲覧・改ざんはできない。docs/adr/0001の共通方針)
grant insert on life_money_sim_results to anon;
create policy "anon can insert" on life_money_sim_results
  for insert to anon with check (true);
