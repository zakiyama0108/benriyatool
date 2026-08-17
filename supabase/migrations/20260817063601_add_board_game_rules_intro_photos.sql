-- ゲーム紹介画像(intro_photo_paths)の追加と、公開Storageバケットの新設
-- (仕様: specs/board-game-rules/game-registration/design.md「追加マイグレーション(ゲーム紹介画像、実装より先に単独PRで適用)」、
--       specs/board-game-rules/admin/design.md「ゲーム紹介画像の公開Storage(新規: 実装より先に単独PRで適用)」)
--
-- 元写真(非公開)とは別物の、一覧・詳細で公開表示するゲーム紹介画像を扱うための列・バケットを追加する。
-- 既存の create table 文は変更せず、ALTER TABLE / 新規バケット作成として追加する。

-- board_game_rules_game_requests へゲーム紹介画像のパス列を追加
alter table board_game_rules_game_requests
  add column intro_photo_paths text[] not null default '{}';

-- board_game_rules_games へゲーム紹介画像のパス列を追加
alter table board_game_rules_games
  add column intro_photo_paths text[] not null default '{}';

-- 閲覧: intro_photo_pathsはphoto_pathsと異なり公開列のため、既存のanon向け列単位GRANTに追加する
-- (既存GRANTを一度REVOKEしてから再GRANTする。列の追加GRANTのみを行うALTERは存在しないため)
revoke select on board_game_rules_games from anon;
grant select (
  id, name, min_players, max_players, min_minutes, max_minutes,
  genres, min_age, difficulty, publisher, author, has_japanese_rules,
  awards, release_year, rules_simple, rules_detailed, created_at, deleted_at,
  intro_photo_paths
) on board_game_rules_games to anon;

-- ゲーム紹介画像の公開Storageバケット(public=true)
-- 元写真バケット(非公開)とは公開範囲が異なるため別バケットとする。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'board-game-rules-game-photos',
  'board-game-rules-game-photos',
  true,
  10485760, -- 10 MiB(元写真バケットと同じ防御上限)
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
);

-- アップロード: 匿名の投稿者(登録依頼)を含め誰でもINSERTできる
create policy "anyone can upload game intro photos" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'board-game-rules-game-photos');

-- 差し替え・削除: 運営者本人のみ
create policy "admin can update game intro photos" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'board-game-rules-game-photos'
    and (auth.jwt() ->> 'email') in (select email from admin_emails)
  )
  with check (
    bucket_id = 'board-game-rules-game-photos'
    and (auth.jwt() ->> 'email') in (select email from admin_emails)
  );
create policy "admin can delete game intro photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'board-game-rules-game-photos'
    and (auth.jwt() ->> 'email') in (select email from admin_emails)
  );

-- ダウンロード: バケットがpublic=trueのため、SELECTポリシーは不要(誰でも公開URLで取得可能)
