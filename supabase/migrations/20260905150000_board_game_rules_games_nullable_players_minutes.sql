-- board_game_rules_games: 対応人数・プレイ時間をNULL許容にする
-- 背景: specs/board-game-rules/admin/design.md「ローカル環境の定期処理」手順4、
--       specs/board-game-rules/admin/requirements.md#登録実行のローカル処理起動-13〜14。
-- ローカル生成(claude -p)は写真・Web検索で根拠(裏付け情報)が取れた値のみを埋める方針に変更し、
-- 分からない場合に架空の値を推定して埋めることをやめた。根拠不足で埋まらなかった項目を理由に
-- 運営者の「公開する」操作を妨げないため、NOT NULL制約を外す。
-- min_players <= max_players 等のCHECKはPostgresの三値論理により、NULLを含む比較の結果が
-- UNKNOWN(真でも偽でもない)となりCHECK自体は通過する(拒否されない)ため、変更不要。
alter table board_game_rules_games
  alter column min_players drop not null,
  alter column max_players drop not null,
  alter column min_minutes drop not null,
  alter column max_minutes drop not null;
