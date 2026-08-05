-- ai_dev_digest_feedback のINSERT権限をanonからauthenticatedへ修正する
-- (仕様: specs/ai-dev-digest/article-detail/requirements.md#フィードバックの保存・権限-3)
--
-- 背景: この入力欄はGoogle OIDCでログインしている場合のみ画面に表示される
-- (requirements.md#運営者向けフィードバック-7)。ログイン中のブラウザはSupabaseへ
-- authenticatedロールとしてリクエストするため、anonへのGRANTはこのINSERTに一致せず
-- 常に失敗していた(RLSによる拒否)。ログイン不要なアプリ(life_money_sim_results等)
-- とは異なるパターンであるにもかかわらず、そちらのanon INSERTパターンを誤って踏襲していた。

drop policy "anon can insert" on ai_dev_digest_feedback;
revoke insert on ai_dev_digest_feedback from anon;

grant insert on ai_dev_digest_feedback to authenticated;
create policy "authenticated can insert" on ai_dev_digest_feedback
  for insert to authenticated with check (true);
