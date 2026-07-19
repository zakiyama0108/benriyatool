# 設計: 管理画面(保存データの閲覧・集計)

認証とDB読み取りの全体方針は[docs/adr/0006](../../../docs/adr/0006-admin-screen-oidc-rls.md)にあるため、ここでは重複させず、この画面固有の処理フロー・データの見せ方・セキュリティ上の具体策を書く。運営者アカウント・許可リストは`ikukyu/admin`と共用するため、認証まわりの処理フローは`ikukyu/admin/design.md`と同一のロジックを再利用する。

## 処理フロー

ログインから閲覧までの全体像は`ikukyu/admin/design.md#処理フロー`のシーケンス図と同一(閲覧対象のテーブルが`life_money_sim_results`に変わるのみ)。

### ログイン状態を判定して画面を出し分ける処理
- 対象: 管理画面を開いた時点のログインセッション
- 手順:
  1. ログインセッションがない場合は、ログインを促す画面を表示し、データの取得は一切行わない
  2. ログインセッションがある場合は、後述「閲覧権限を確認する処理」に進む
- 補足: ログインセッションは`ikukyu/admin`と同じSupabase Authのセッションを使う(同一Supabaseプロジェクト・同一運営者アカウントのため、`ikukyu/admin`で一度ログインしていれば`life-money-sim/admin`でも再ログイン不要)
- 関連するビジネスルール: requirements.md#ログイン・アクセス制御-1、requirements.md#アクセス制御・権限-1

### Googleでログインする処理
- 対象: ログイン画面の「Googleでログイン」操作
- 手順: `ikukyu/admin/design.md#Googleでログインする処理`と同一(戻り先URLがこの画面自身になる点のみ異なる)
- 関連するビジネスルール: requirements.md#ログイン・アクセス制御-2、requirements.md#認証手段とパスキー

### 閲覧権限を確認する処理
- 対象: ログイン済みユーザーのアカウント
- 手順:
  1. ログイン中のアカウントが、`ikukyu/admin`と共用の許可リスト(`admin_emails`)に登録されているかを問い合わせて確認する
  2. 登録されていれば、一覧・集計の表示に進む
  3. 登録されていなければ、データを一切取得せず「閲覧する権限がありません」旨とログアウト手段を表示する
- 関連するビジネスルール: requirements.md#ログイン・アクセス制御-3、requirements.md#アクセス制御・権限-1、requirements.md#アクセス制御・権限-2

### 保存データを絞り込んで取得する処理
- 対象: `life_money_sim_results`テーブルの保存レコード
- 手順:
  1. 現在の絞り込み条件(期間の開始・終了、テストデータを含めるかどうか)を組み立てる
  2. 期間が指定されていれば保存日時がその範囲に入るものだけを対象にする。指定がなければ全期間を対象にする
  3. テストデータを含めない設定なら、テストデータでないものだけを対象にする。含める設定なら区別せず対象にする
  4. 対象レコードを保存日時の新しい順で取得する
  5. 取得に失敗した場合は、一覧・集計を表示せずエラー表示にする
- 関連するビジネスルール: requirements.md#一覧表示-2、requirements.md#絞り込み-1、requirements.md#絞り込み-2、requirements.md#テストデータの扱い、requirements.md#表示の初期値・区切り-1

### 一覧を組み立てる処理
- 対象: 絞り込んで取得したレコード
- 手順:
  1. 各レコードを、保存日時・配偶者の有無・子どもの人数・開始資産額・運用モード・想定利回り・最終月時点の資産額・月次余剰資金(賞与抜き)・テストデータかどうか、の列に整形する
  2. 貯蓄のみモードで保存されたレコードは、想定利回りの列を空であることが分かる表示にする
  3. 表示している件数を添える
- 関連するビジネスルール: requirements.md#一覧表示-1、requirements.md#一覧表示-3

### 集計を組み立てる処理
- 対象: 絞り込んで取得したレコード(一覧と同じ対象)
- 手順:
  1. 利用件数の合計を数える。あわせて期間内の推移を、指定期間がおおむね2か月以内なら日別、それより長い場合や全期間なら月別の件数として数える
  2. 最終月時点の資産額の平均を出す。あわせて、100万円未満 / 100万円以上500万円未満 / 500万円以上1000万円未満 / 1000万円以上3000万円未満 / 3000万円以上 の5区分ごとの件数を数える
  3. 月次余剰資金(賞与抜き)の平均を出す
  4. 配偶者ありの件数・割合と、運用モード(貯蓄のみ/資産運用)ごとの件数・割合を出す
  5. 対象が0件のときは、平均や比率を割り算できないため、件数0・平均は算出対象なしと分かる表示にする
- 関連するビジネスルール: requirements.md#集計表示、requirements.md#表示の初期値・区切り-2、requirements.md#表示の初期値・区切り-3、requirements.md#表示の初期値・区切り-4

### ログアウトする処理
- 対象: ログイン中のセッション
- 手順: `ikukyu/admin/design.md#ログアウトする処理`と同一
- 関連するビジネスルール: requirements.md#ログイン・アクセス制御-4

## エラーハンドリング
- 画面の状態は「未ログイン」「ログイン済みだが権限なし」「権限あり」「取得エラー」の4つに切り分ける(`ikukyu/admin`と同一方針)
- 保存機能(save-result)は失敗を握りつぶす方針だが、管理画面は運営者自身が結果を見るための画面なので、データ取得の失敗は握りつぶさず画面に伝える

## 関連するファイル(抜粋)
```
app/life-money-sim/admin/page.tsx (新規: 管理画面本体。ログイン状態で表示を出し分けるクライアント画面)
app/life-money-sim/admin/lib/fetchResults.ts (新規: 絞り込み条件からlife_money_sim_resultsを取得する)
app/life-money-sim/admin/lib/aggregate.ts (新規: 取得レコードから集計値を組み立てる純粋関数)
app/life-money-sim/admin/lib/format.ts (新規: 一覧の各列の整形)
app/life-money-sim/admin/components/LoginScreen.tsx (新規: ログイン/権限なしの案内画面。ikukyu/admin/components/LoginScreen.tsxと同等のロジック)
app/life-money-sim/admin/components/FilterBar.tsx (新規: 期間・テストデータ切替の操作)
app/life-money-sim/admin/components/ResultsTable.tsx (新規: 一覧表)
app/life-money-sim/admin/components/SummaryStats.tsx (新規: 集計表示)
app/ikukyu/admin/lib/auth.ts (既存: ログイン開始・ログアウト・セッション取得・閲覧権限の確認。admin_emailsを共用するため、アプリ共通のlibへ切り出して再利用する)
app/lib/supabaseClient.ts (既存の共通クライアントを利用)
```

## データベース設計
閲覧権限の判定に使う許可リスト(`admin_emails`)は`ikukyu/admin`で作成済みのものをそのまま使い回す(新規テーブルは作らない)。`life_money_sim_results`に対して、同じ許可リストを参照するRLSポリシーを追加する。

### マイグレーション(実装より先に単独PRで適用)
```sql
-- life_money_sim_results の管理画面閲覧権限を追加する
-- (仕様: specs/life-money-sim/admin/design.md「データベース設計」、
--  方針: docs/adr/0006-admin-screen-oidc-rls.md。admin_emailsはikukyu/adminで作成済みのものを共用する)

grant select on life_money_sim_results to authenticated;

create policy "admin can select all" on life_money_sim_results
  for select to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails));
```

T0(マイグレーション適用)の実機確認として、次を必ず確かめる(`ikukyu/admin/design.md`のT0確認事項と同様):
- 許可リストに登録した本人のログインで`life_money_sim_results`が全行SELECTできること
- 許可リストにないアカウント・未ログイン(anon)では0件/SELECT不可であること

## 画面設計
1画面に以下を縦に並べる(`ikukyu/admin`と同じくPC中心・スマホでも破綻しない範囲でよい)。
- 上部: ログイン中のアカウント表示とログアウト操作
- 絞り込み: 期間の開始・終了の指定、テストデータを含めるかの切替
- 集計: 利用件数の合計と推移、最終月時点資産額の平均と5区分の分布、月次余剰資金の平均、配偶者あり割合、運用モードの割合
- 一覧: 保存日時・配偶者の有無・子どもの人数・開始資産額・運用モード・想定利回り・最終月時点の資産額・月次余剰資金・テストデータかどうか の表と、表示件数

未ログイン時・権限なし時は上記を出さず、案内だけを表示する。

## 状態管理
- ログインセッションと閲覧権限の判定結果、現在の絞り込み条件、取得したレコードを画面(`page.tsx`)のローカル状態として持つ(`ikukyu/admin/design.md#状態管理`と同一方針)
- 絞り込み条件の初期値は、期間=全期間(未指定)、テストデータ=含めない(除外)とする
- 画面の4状態の遷移は`ikukyu/admin/design.md#状態管理`の状態遷移図と同一構造(対象データが`life_money_sim_results`に変わるのみ)

## セキュリティ
- 実際の閲覧制御はDB側のRLSで担保する(`docs/adr/0006`)。画面側の権限確認・出し分けは案内のためのもの
- 運営者のメールアドレスは`admin_emails`にのみ持ち、gitにもクライアントのJSバンドルにも置かない(`ikukyu/admin`と共用のため新たな露出経路は増えない)
- 管理画面が読むのは`life_money_sim_results`の全レコード(開始資産額・月次余剰資金などの機微な集計値を含む)。閲覧できるのは許可リストの本人のみ

## ログ
- データ取得が想定外の理由で失敗した場合は、ブラウザのコンソールにエラー内容を出す(`ikukyu/admin`と同一方針)。ログには`life_money_sim_results`の中身を含めず、失敗の事実と種別にとどめる

## 依存関係
- 表示・集計の対象データの内容は`save-result/design.md#データベース設計`のカラム定義に従う
- 認証・許可リスト(`admin_emails`)は`ikukyu/admin/design.md#データベース設計`で作成済みのものを共用する
