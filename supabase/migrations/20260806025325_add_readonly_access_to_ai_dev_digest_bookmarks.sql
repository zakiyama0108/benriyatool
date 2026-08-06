-- ai_dev_digest_bookmarksへのbenriyatool_readonly向けSELECT権限を追加
-- (docs/adr/0004。20260805140000のマイグレーションでこの2行が漏れ、
--  data-check実行時までSELECT権限がないことに気づけなかったための追加対応)

grant select on ai_dev_digest_bookmarks to benriyatool_readonly;

create policy "benriyatool_readonly can select" on ai_dev_digest_bookmarks
  for select to benriyatool_readonly using (true);
