# 0004. エージェントによるDB読み取り専用アクセス

## ステータス
提案中

## コンテキスト
- [ADR-0001](0001-user-input-database.md)の設計上、`anon`キー(アプリ・エージェントの両方が持つ)はRLSでINSERT専用に絞られており、SELECTできない。集計・分析は`service_role`キーを使いユーザーがSupabaseダッシュボードのSQLエディタで実行する運用だった([data-check](../../.claude/skills/data-check/SKILL.md))
- `is_test`導入([specs/ikukyu/save-result](../../specs/ikukyu/save-result/requirements.md))の直後、保存されたデータが意図どおり(導入前レコードが`true`、新規の実利用が`false`)になっているかをエージェント自身が確認したい場面が発生した。従来の運用では、確認のたびにユーザーがSQLを手動実行し結果を貼り付ける必要があり、往復のコストが大きい
- `service_role`キーは全テーブル・全操作(SELECT/INSERT/UPDATE/DELETE)に対する無制限の権限を持つため、これをそのままエージェントに渡すのはADR-0001が意図的に避けてきた「クライアント側に強い権限を持たせない」という設計方針に反する

## 決定
**`service_role`キーではなく、SELECTのみに限定した専用のPostgresロールを作成し、そのロールの接続文字列をエージェントの実行環境(対話セッションの`.env.local`、gitignore対象。またはClaude Routines実行環境のシークレット管理機能)にのみ配置する。本番デプロイには含めない。**(2026-08第2次改定: `benriyatool_readonly`ロールに限り、GitHub Actionsの月次ワークフロー実行に必要な範囲でこのリポジトリのActions Secretsへの保持も例外的に許容する。`service_role`キー等の強い権限を持つキーは引き続きこのリポジトリ・CI Secretsに一切含めない。詳細は下記「GitHub Actions実行環境への対象拡大」参照)

- ロール名: `benriyatool_readonly`。`login`属性のみ持ち、`BYPASSRLS`は付与しない(RLSは有効なまま)
- 各`<アプリ名>_results`テーブルに、このロール向けの`SELECT`専用RLSポリシーを個別に追加する(`anon`のINSERT専用ポリシーとは別物)。新しいアプリのテーブルを作る際は、このポリシーもテンプレートとして追加する([ADR-0001](0001-user-input-database.md)の「テーブル作成+定型RLSポリシー適用」の一部に組み込む)
- 接続は[ADR-0003](0003-db-schema-migration-ci.md)のマイグレーションと同じくSession Pooler(IPv4対応・ポート5432)を使う。本番デプロイには含めない。接続情報を保持してよい実行環境は、エージェントの対話セッション(ローカルの`.env.local`に`SUPABASE_READONLY_DB_URL`として保持)、Claude Routines実行環境(当該実行環境のシークレット管理機能に同名の環境変数として保持)、[ai-dev-digest](../../specs/ai-dev-digest/architecture.md)の月次GitHub Actionsワークフローに限りこのリポジトリのGitHub Actions Secrets、の3つとする(2026-08改定・2026-08第2次改定。当初は対話セッション専用だったが、月次実行のClaude Routineでの利用が必要になったため対象を拡大し、その後Routine実行環境にシークレットを追加する手段が確認できなかったためGitHub Actionsワークフローも対象に加えた。詳細は下記「[Claude Routines実行環境への対象拡大](#claude-routines実行環境への対象拡大2026-08改定)」「[GitHub Actions実行環境への対象拡大](#github-actions実行環境への対象拡大2026-08第2次改定)」参照)
- クエリ実行は`.claude/skills/data-check/query.mjs`(`pg`パッケージを使う薄いスクリプト。依存は本体`package.json`から隔離し、[run-benriyatool](../../.claude/skills/run-benriyatool/SKILL.md)と同じパターンに揃える)で行う。TLS証明書検証はデフォルト(有効)のまま接続でき、無効化する必要はなかった
- ロール作成・GRANT・RLSポリシー追加のSQLは、[ADR-0003](0003-db-schema-migration-ci.md)の`supabase/migrations/`には含めない。ロール作成にはパスワードが伴い、git管理下のファイルに残せないため、初回のみSupabaseダッシュボードのSQLエディタで手動実行する(下記「作業手順」参照)。この基盤はアプリの実行時スキーマ(INSERT時に使われるカラム等)に影響しない運用ツールであり、ADR-0003が対象とする「アプリの前提となるスキーマ変更」とは性質が異なるため、コード管理・CI自動適用の対象外とする

### 作業手順(初回のみ・手動)

```sql
-- 1. 読み取り専用ロールを作成(パスワードは強力なものを個別に設定する。このファイルには残さない)
create role benriyatool_readonly with login password '<強力なパスワード>';
grant usage on schema public to benriyatool_readonly;

-- 2. ikukyu_resultsへのSELECT専用アクセスを許可(anonのINSERT専用ポリシーとは別物)
grant select on ikukyu_results to benriyatool_readonly;
create policy "benriyatool_readonly can select" on ikukyu_results
  for select to benriyatool_readonly using (true);
```

接続はSession Pooler([ADR-0003](0003-db-schema-migration-ci.md)と同じ経路)のURIのユーザー名部分を`benriyatool_readonly.<プロジェクトref>`に置き換え、`.env.local`に`SUPABASE_READONLY_DB_URL`として設定する。新しいアプリのテーブルを追加する際は、上記2.と同じ2行をそのテーブルにも追加する。
- [data-check](../../.claude/skills/data-check/SKILL.md)の運用を更新: 接続情報が設定済みの環境では、エージェントがこのスクリプトで直接クエリを実行し結果を分析する。未設定の環境(接続情報を用意していないマシン・別セッション)では、従来どおりユーザーにSQLを渡して代行実行してもらう
- 集計にとどまらない個人特定目的のクエリ(特定ユーザーの追跡など)は行わない方針は維持する(data-check SKILL.mdの既存ルール)

### Claude Routines実行環境への対象拡大(2026-08改定)

[ai-dev-digest/watchlist-review](../../specs/ai-dev-digest/watchlist-review/design.md)の月次Claude Routineが、フィードバック・掲載実績の集計のために`ai_dev_digest_feedback`テーブルを`benriyatool_readonly`ロールで読み取る必要が生じた。当初の本ADRは接続情報の保持対象をエージェントの対話セッション(ローカル`.env.local`)専用としており、それ以外の実行環境では接続情報が無い前提だった。月次実行のたびに人手を介するユーザー代行フローにフォールバックする運用は、月1回とはいえ自動化の意図に反するため、対象範囲を見直した。

- **変更**: 接続情報を保持してよい対象に、エージェントの対話セッションに加えてClaude Routines実行環境を正式に含める。Routine実行環境側では、当該実行環境が提供するシークレット管理機能に`SUPABASE_READONLY_DB_URL`として保持し、このリポジトリ・GitHub Actions Secretsには追加しない(対話セッション向けの`.env.local`と同じ「CI・本番デプロイでは使わない」方針は維持する)
- **変更しない点**: `benriyatool_readonly`ロールの権限(SELECT専用・BYPASSRLSなし)、RLSポリシーの追加手順、`service_role`キーを使わない方針はいずれも変更しない
- **新たな懸念**: Claude Routines実行環境のシークレット管理方法(接続文字列の登録・ローテーション手順)は本プロジェクトで前例がなく、運用実績による検証が済んでいない(下記「懸念点」に追記)

### GitHub Actions実行環境への対象拡大(2026-08第2次改定)

[ai-dev-digest/daily-publish](../../specs/ai-dev-digest/daily-publish/design.md)の実行環境を実際にテスト用Claude Routineで検証したところ、Routine実行環境に独自の環境変数・シークレットを追加するUI・APIが確認できなかった(上記「新たな懸念」が実際に運用開始前の確認で顕在化した形)。[watchlist-review](../../specs/ai-dev-digest/watchlist-review/design.md)の月次実行もこの制約の影響を受けるため、実行主体をGitHub Actionsに変更することとした。

- **変更**: `benriyatool_readonly`ロールの接続文字列(`SUPABASE_READONLY_DB_URL`)に限り、このリポジトリのGitHub Actions Secretsへの保持を許容する。上記「決定」で定めた「CI・本番デプロイには含めない」という原則の、本ロール専用の例外である
- **例外を認める根拠**: `benriyatool_readonly`は元々SELECT専用・`BYPASSRLS`なし・RLSでスコープが絞られた低権限ロールであり、`service_role`キーのような無制限権限のキーとは影響範囲が本質的に異なる。GitHub Actions Secretsは暗号化保存され、ワークフロー実行時以外は値を参照できないGitHubの標準機能であり、対話セッションの`.env.local`と同等以上の保護がある
- **変更しない点**: `benriyatool_readonly`ロールの権限(SELECT専用・BYPASSRLSなし)、RLSポリシーの追加手順は変更しない。`service_role`キーやGitHub書き込み用PAT等、他の強い権限を持つ認証情報をこのリポジトリのSecretsに含めない方針も変更しない(本例外は`benriyatool_readonly`ロールの接続文字列に限定される)
- **新たな懸念**: GitHub Actions Secretsに追加したことで、このリポジトリのワークフロー定義ファイル(`.github/workflows/*.yml`)を変更できる権限を持つ者(mainへのマージ権限を持つ者)が実質的に接続情報を参照できるようになる。ただし本プロジェクトは現状mainへのマージ権限を持つのが運営者本人のみのため、当面は実質的なリスク増加は小さいと判断する(将来複数人での開発体制になった場合は本項目を再検討する)

## 検討した代替案

| 候補 | 見送り理由 |
| --- | --- |
| `service_role`キーをそのまま`.env.local`に追加 | 全テーブル・全操作に対する無制限の権限。読み取り以外の操作(UPDATE/DELETE)も可能になり、ADR-0001の「クライアントに含めない」方針と真っ向から矛盾する |
| PostgRESTのカスタムJWTロール(APIキー経由) | `anon`/`service_role`同様にJWT発行・検証の仕組みが必要で、直接Postgres接続(ADR-0003で確立済みの経路)より複雑になる。得られる利点(REST経由のアクセス)は今回の用途(SQLでの集計)には不要 |
| 現状維持(常にユーザーがSQLエディタで実行) | 確認のたびに人手を介する往復コストが残る。`is_test`のような導入直後の確認や、定期のdata-checkを迅速に回せない |

## 影響

**良い点**
- エージェントが集計・異常検知をその場で実行でき、data-checkの往復コストがなくなる
- 権限がSELECTのみ(かつRLSポリシーで許可したテーブルのみ)に限定されており、`service_role`キーの漏洩リスクと比べて影響範囲が小さい
- 既存のSession Pooler接続の仕組み(ADR-0003)を再利用でき、新しい接続方式を増やさない

**懸念点**
- `.env.local`に新しい機微情報(DBパスワードを含む接続文字列)が増える。既存の`NEXT_PUBLIC_*`と異なりサーバー専用の秘匿情報であるため、`.gitignore`対象であることを維持し、絶対にコミット・ログ出力しないよう注意する(`query.mjs`は接続文字列自体を出力しない設計にしている)
- 新しいアプリのテーブルを追加するたびに、`benriyatool_readonly`向けのSELECTポリシー追加を忘れると、そのテーブルだけdata-checkの直接クエリ対象から漏れる(手順に組み込み済みだが、レビューで見落とし得る)
- 接続情報を用意していない環境(未設定のローカルマシン・別セッション)では、従来どおりユーザー代行のフローにフォールバックする必要がある(2026-08改定: Claude Routines実行環境・GitHub Actions実行環境は接続情報を保持できる対象に追加されたため、フォールバックが必要なのはそれ以外の未設定環境に限られる)
- Claude Routines実行環境のシークレット管理方法は本プロジェクトで前例がなく、運用実績による検証が済んでいない(2026-08追記。設定ミス・漏洩経路の想定が、確立済みの`.env.local`運用ほど固まっていない点に留意する)
- GitHub Actions Secretsへの保持は、`benriyatool_readonly`という低権限ロールに限定しているとはいえ、このリポジトリへのマージ権限を持つ者の範囲がそのまま接続情報の実質的な参照範囲になる(2026-08第2次改定追記。現状は運営者本人のみのため影響は小さいが、開発体制が変わる場合は本ADRの再検討が必要)
