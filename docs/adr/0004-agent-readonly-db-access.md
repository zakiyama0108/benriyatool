# 0004. エージェントによるDB読み取り専用アクセス

## ステータス
提案中

## コンテキスト
- [ADR-0001](0001-user-input-database.md)の設計上、`anon`キー(アプリ・エージェントの両方が持つ)はRLSでINSERT専用に絞られており、SELECTできない。集計・分析は`service_role`キーを使いユーザーがSupabaseダッシュボードのSQLエディタで実行する運用だった([data-check](../../.claude/skills/data-check/SKILL.md))
- `is_test`導入([specs/ikukyu/save-result](../../specs/ikukyu/save-result/requirements.md))の直後、保存されたデータが意図どおり(導入前レコードが`true`、新規の実利用が`false`)になっているかをエージェント自身が確認したい場面が発生した。従来の運用では、確認のたびにユーザーがSQLを手動実行し結果を貼り付ける必要があり、往復のコストが大きい
- `service_role`キーは全テーブル・全操作(SELECT/INSERT/UPDATE/DELETE)に対する無制限の権限を持つため、これをそのままエージェントに渡すのはADR-0001が意図的に避けてきた「クライアント側に強い権限を持たせない」という設計方針に反する

## 決定
**`service_role`キーではなく、SELECTのみに限定した専用のPostgresロールを作成し、そのロールの接続文字列をエージェントのローカル実行環境(`.env.local`、gitignore対象・CIには含めない)にのみ配置する。**

- ロール名: `benriyatool_readonly`。`login`属性のみ持ち、`BYPASSRLS`は付与しない(RLSは有効なまま)
- 各`<アプリ名>_results`テーブルに、このロール向けの`SELECT`専用RLSポリシーを個別に追加する(`anon`のINSERT専用ポリシーとは別物)。新しいアプリのテーブルを作る際は、このポリシーもテンプレートとして追加する([ADR-0001](0001-user-input-database.md)の「テーブル作成+定型RLSポリシー適用」の一部に組み込む)
- 接続は[ADR-0003](0003-db-schema-migration-ci.md)のマイグレーションと同じくSession Pooler(IPv4対応・ポート5432)を使う。GitHub Secretsには追加せず、ローカルの`.env.local`にのみ`SUPABASE_READONLY_DB_URL`として置く(CI・本番デプロイでは使わない、エージェントの対話セッション専用)
- クエリ実行は`.claude/skills/data-check/query.mjs`(`pg`パッケージを使う薄いスクリプト。依存は本体`package.json`から隔離し、[run-benriyatool](../../.claude/skills/run-benriyatool/SKILL.md)と同じパターンに揃える)で行う
- [data-check](../../.claude/skills/data-check/SKILL.md)の運用を更新: 接続情報が設定済みの環境では、エージェントがこのスクリプトで直接クエリを実行し結果を分析する。未設定の環境(接続情報を用意していないマシン・別セッション)では、従来どおりユーザーにSQLを渡して代行実行してもらう
- 集計にとどまらない個人特定目的のクエリ(特定ユーザーの追跡など)は行わない方針は維持する(data-check SKILL.mdの既存ルール)

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
- ローカル環境(このマシン)以外のセッション・エージェント実行環境では接続情報が無いため、従来どおりユーザー代行のフローにフォールバックする必要がある
