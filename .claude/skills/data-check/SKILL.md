---
name: data-check
description: Supabaseに保存されたユーザー入力データ(<アプリ名>_resultsテーブル)の健全性を定期確認するときに使う(目安: 月1回)。確認用SQLの用意と結果の分析を扱う。
disable-model-invocation: true
---

> ワークフロー上の位置: 定期作業(開発ループ外)。異常が計算バグ・バリデーション漏れを示唆したら [/fix](../fix/SKILL.md) へ

# 前提(必ず踏まえる)

`docs/adr/0001-user-input-database.md`のとおり、anonキーは**INSERTのみ許可**でSELECTできない。集計・分析には別経路が要る。SQLに個人を特定する目的の抽出を入れない(集計・匿名の異常検知に限る)のはどちらの経路でも共通のルール。

- **`.env.local`に`SUPABASE_READONLY_DB_URL`が設定されている環境**(`docs/adr/0004-agent-readonly-db-access.md`): エージェントが`.claude/skills/data-check/query.mjs`でSELECT専用ロールを使い直接クエリを実行し、結果を分析する。初回のみ`.claude/skills/data-check/`で`npm install`が必要
- **未設定の環境**(接続情報を用意していないマシン・別セッション): 従来どおり、確認用SQLを用意してユーザーに渡し、**SupabaseダッシュボードのSQLエディタ(service_role権限)で実行してもらい**、貼ってもらった結果を分析する

# 実行タイミング

月1回を目安。DBを使う機能をリリースした直後(初回データが正しく入っているかの確認)にも実行する。

# Step1 確認用SQLを用意する

対象テーブルは`<アプリ名>_results`(現在は`ikukyu_results`)。specのデータベース設計(`specs/<アプリ名>/*/design.md`)でカラムを確認してからSQLを組む。集計にはテスト・動作確認データを含めないよう、必ず`is_test = false`で絞る(`docs/adr/0001-user-input-database.md`の共通カラム)。観点:

```sql
-- 件数の推移(直近90日・週別): 保存機能が動き続けているか、急増・急減がないか
select date_trunc('week', created_at) as week, count(*) from ikukyu_results
where is_test = false and created_at > now() - interval '90 days' group by 1 order by 1;

-- 入力値の分布: 極端な値(バリデーション漏れの疑い)がないか
select min(monthly_salary), max(monthly_salary), avg(monthly_salary) from ikukyu_results
where is_test = false;

-- NULL率: 任意項目が想定どおりの入り方をしているか
select count(*) as total, count(leave_start_date) as leave_start_filled from ikukyu_results
where is_test = false;
```

(カラム名は実際のテーブル定義に合わせて調整する)

接続情報がある環境では、上記SQLをそのまま実行できる:

```bash
node .claude/skills/data-check/query.mjs "select is_test, count(*) from ikukyu_results group by is_test order by is_test"
```

# Step2 結果を分析する

- 件数ゼロの週が続く → 保存機能の障害を疑い、本番でINSERT動線を確認([/release-check](../release-check/SKILL.md)のスモークチェック要領)
- 極端な入力値がある → バリデーションの仕様(requirements.mdのビジネスルール)と突き合わせ、漏れなら[/fix](../fix/SKILL.md)へ
- 想定外のNULL・重複 → 保存処理のバグの可能性。再現条件を推定して[/fix](../fix/SKILL.md)へ

# Step3 無料枠の確認

ダッシュボードでSupabase無料枠の使用量(DBサイズ・APIリクエスト)に余裕があるかも合わせて見てもらう。逼迫していたら対応方針(古いレコードの整理・プラン変更)をユーザーと相談する(アプリ横断の決定になるためADR化を検討)。

# 完了時の次ステップ案内

分析結果(件数傾向・異常の有無・無料枠の状況)をユーザーに報告する。異常が仕様・実装の問題なら[/fix](../fix/SKILL.md)へ進むことを案内する。