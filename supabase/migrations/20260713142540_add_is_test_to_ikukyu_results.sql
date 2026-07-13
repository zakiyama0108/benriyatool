-- テスト・動作確認データの判別フラグを追加する(仕様: specs/ikukyu/save-result/design.md「データベース設計 > マイグレーション」)

-- 1. テストフラグカラムの追加(既定はfalse=実データ。旧コードからのINSERTにはis_testが含まれないため、既定値で実データ扱いになる)
alter table ikukyu_results add column is_test boolean not null default false;

-- 2. 既存レコードの一括更新(specs/ikukyu/save-result/requirements.md#テストデータの判定-4: 導入前のデータはすべてテストデータ扱い)
update ikukyu_results set is_test = true;
