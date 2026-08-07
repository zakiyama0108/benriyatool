-- 元写真の非公開Storageバケットとアクセスポリシーの新設
-- (仕様: specs/board-game-rules/admin/design.md「元写真の非公開Storage」、
--       specs/board-game-rules/game-registration/design.md「元写真のStorage」、
--  方針: docs/adr/0007-runtime-llm-server-and-writable-admin.md)
--
-- 前提: 共用の admin_emails(ikukyu/adminで作成済み)が適用時点で存在していること。
--
-- 投稿された元写真は原本の複製にあたるため一般公開しない。誰でもアップロード(登録フローの確定保存)
-- できるが、ダウンロード(SELECT)は運営者本人のみに絞る(照合用)。
--
-- 実装時に確定した具体値:
--   - バケット名: board-game-rules-photos(public=false)
--   - パス設計: <アップロード単位のUUID>/<連番>.<拡張子>(確定保存時にクライアントが採番。
--     ゲームIDはDB採番のためアップロード時点で未確定。photo_paths に保存する)
--   - サイズ上限(file_size_limit): 10MiB/ファイル(スマホ写真を許容しつつ濫用を抑える防御上限)
--   - 許可MIME(allowed_mime_types): 一般的な写真形式に限定(iPhoneのHEIC/HEIFを含む)
--   - 1ゲームあたりの枚数上限: 登録画面(クライアント)側で担保する。Storage RLSでの
--     フォルダ内件数カウントはレース・性能面で脆いため、量的制約はサイズ・MIMEをバケット設定で
--     担保し、枚数は画面側で制限する(admin/design.md の「両面で担保」のうちStorage側はサイズ・MIME)。

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'board-game-rules-photos',
  'board-game-rules-photos',
  false,
  10485760, -- 10 MiB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
);

-- アップロード: 匿名投稿を許すため anon/authenticated からのINSERTを許可する。
-- サイズ・MIMEはバケット設定(file_size_limit / allowed_mime_types)で担保する。
create policy "anyone can upload board game photos" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'board-game-rules-photos');

-- ダウンロード(照合閲覧): 運営者本人のみSELECTできる。
-- anon・運営者以外のログインユーザーは元写真を取得できない(バケットは public=false)。
create policy "admin can read board game photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'board-game-rules-photos'
    and (auth.jwt() ->> 'email') in (select email from admin_emails)
  );
