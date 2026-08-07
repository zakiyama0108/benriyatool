-- board_game_rules_games テーブルの新設
-- (仕様: specs/board-game-rules/game-registration/design.md「データベース設計」、
--  方針: docs/adr/0001-user-input-database.md)
--
-- 2026-08の見直し: 匿名投稿からのライブLLM解析(即時公開)を撤廃し、運営者がローカルツールで
-- まとめて登録する方式に変更した(docs/adr/0007「2026-08の見直し」参照)。これに伴い、
-- 運営者登録タグ(is_official)は全ゲームが運営者経由で登録される前提になり不要になった。
-- anon/authenticatedからの直接INSERTは行わず、書き込みは運営者のローカル登録ツール
-- (service_role相当の権限。RLSをバイパスする)のみが行う。
-- ジャンルは単一(genre)から複数選択可能(genres text[])に変更した。

create table board_game_rules_games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_players int not null,
  max_players int not null,
  min_minutes int not null,
  max_minutes int not null,
  genres text[] not null default '{}' check (genres <@ array[
    '協力', '対戦', '正体隠匿', '戦略', 'パーティー', 'ファミリー', 'カードゲーム', 'すごろく系',
    'ワーカープレイスメント', 'デッキ構築', '推理・デダクション', '拡大再生産', '陣取り・エリアマジョリティ',
    'タイル配置', 'ドラフト', 'セットコレクション', 'ハンドマネージメント', '競り・オークション',
    'ベッティング・予想', 'トリックテイキング', 'ダイスロール', 'ブラフ・心理戦', 'アブストラクト',
    'アクション', '表現・言葉遊び', 'レガシー', 'ウォーゲーム', 'その他'
  ]::text[]), -- <@ は「左辺の全要素が右辺の配列に含まれる」演算子。固定リスト外の値を1つでも含むと拒否される
  min_age int,
  difficulty text,
  publisher text,
  author text,
  has_japanese_rules boolean,
  awards text,
  release_year int,
  rules_simple text not null,
  rules_detailed jsonb not null,
  photo_paths text[] not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (min_players <= max_players),
  check (min_minutes <= max_minutes),
  -- ルール本文の防御上限(巨大データ投入対策)。
  check (char_length(rules_simple) <= 4000),
  check (char_length(rules_detailed::text) <= 40000) -- jsonbは::text化した全体長で担保
);
alter table board_game_rules_games enable row level security;

-- 閲覧: 公開中(削除されていない)の行は誰でもSELECTできる。
-- photo_paths(元写真パス)は列単位のSELECT権限から除外し、anon が直接
-- `select photo_paths ...` できないようにする(列単位の秘匿をDB側で担保する)。
-- 運営者は照合閲覧で photo_paths が必要なため authenticated には全列SELECTを付与し、
-- 行はRLSで制御する(specs/board-game-rules/admin/design.md)。
grant select (
  id, name, min_players, max_players, min_minutes, max_minutes,
  genres, min_age, difficulty, publisher, author, has_japanese_rules,
  awards, release_year, rules_simple, rules_detailed, created_at, deleted_at
) on board_game_rules_games to anon;
grant select on board_game_rules_games to authenticated;
create policy "anyone can select published games" on board_game_rules_games
  for select to anon, authenticated using (deleted_at is null);

-- 登録(INSERT)ポリシーは設けない。anon/authenticatedからの直接登録は撤廃し、
-- 運営者のローカル登録ツールがservice_role相当の権限でRLSをバイパスして書き込む
-- (specs/board-game-rules/admin/design.md「登録依頼からゲームを登録するローカルツール」)。

-- 管理: 運営者本人は全行SELECT(削除済み含む)・UPDATE(編集・論理削除)ができる(admin/design.md)
create policy "admin can select all games" on board_game_rules_games
  for select to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails));
grant update on board_game_rules_games to authenticated;
create policy "admin can update games" on board_game_rules_games
  for update to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails))
  with check ((auth.jwt() ->> 'email') in (select email from admin_emails));

-- benriyatool_readonly はSELECTのみ(docs/adr/0004)
grant select on board_game_rules_games to benriyatool_readonly;
create policy "benriyatool_readonly can select games" on board_game_rules_games
  for select to benriyatool_readonly using (true);
