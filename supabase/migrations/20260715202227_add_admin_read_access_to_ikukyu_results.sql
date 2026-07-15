-- 管理画面(admin)の閲覧権限を追加する
-- (仕様: specs/ikukyu/admin/design.md「データベース設計 > マイグレーション」、
--  方針: docs/adr/0006-admin-screen-oidc-rls.md)
--
-- ・運営者本人だけが ikukyu_results を閲覧できるようにする
-- ・許可する運営者のメールアドレスは admin_emails テーブル(DB内)にだけ持ち、
--   git・クライアントのJSバンドルには置かない(本リポジトリは公開のため)。
--   メールの実データはこのマイグレーションには含めず、適用後にSupabaseダッシュボードで手入れする

-- 1. 閲覧許可リストのテーブル(中身のメールはここに書かず、後からダッシュボードで登録する)
create table admin_emails (email text primary key);
alter table admin_emails enable row level security;

-- 2. テーブルレベルのSELECT権限を authenticated に付与する(GRANT)。
--    行の絞り込みは下記3・4のRLSポリシーが行うため、GRANTを与えても
--    許可リストにないユーザーには1行も返らない。anonには付与しない
grant select on admin_emails to authenticated;
grant select on ikukyu_results to authenticated;

-- 3. ログイン中の本人が「自分が許可リストにいるか」だけを確認できるポリシー
--    (他人のメールの列挙はできない。管理画面の閲覧権限確認処理が使う)
create policy "authenticated can check own email" on admin_emails
  for select to authenticated using ((auth.jwt() ->> 'email') = email);

-- 4. ikukyu_results を、許可リストに載っているログインユーザーだけが全行SELECTできるポリシー
--    (anonのINSERT専用ポリシー・readonlyロールのSELECTポリシー(ADR-0004)とは別物。追加のみ)
create policy "admin can select all" on ikukyu_results
  for select to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails));
