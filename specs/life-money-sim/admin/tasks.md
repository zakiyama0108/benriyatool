# タスク: 管理画面(保存データの閲覧・集計)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## 事前作業(実装より先に単独PRで適用)

- [x] T0. `life_money_sim_results`への管理者閲覧用RLSポリシーのマイグレーションを作成し、単独PRでmainにマージして適用する(design.md#マイグレーション)。`admin_emails`は`ikukyu/admin`で作成済みのものを共用するため、新規のメール登録作業は不要
  - このタスクはスキーマ・ポリシー変更のみで、TDDのテスト対象外(spec-coverage-skip.jsonに登録)
  - [x] Supabase AuthのRedirect URLsの検証(requirements.md#認証手段とパスキー-2)。本番公開後、実際にログイン後`localhost`へ誤ってリダイレクトされる不具合が発生し、`ikukyu/admin`用のURLとは別に`https://benriyatool.com/life-money-sim/admin/**`の登録が必要と判明。Supabaseダッシュボードで登録し、正常にログインできることを確認済み

## 認証共通化(既存コードの整理)

- [ ] T1. `app/ikukyu/admin/lib/auth.ts`のログイン開始・ログアウト・セッション取得・閲覧権限確認のロジックを、`admin_emails`テーブル名に依存しない形で確認し、`life-money-sim/admin`から呼べるように共通化する(共通化の置き場所は実装時に判断してよい: 例えば`app/lib/adminAuth.ts`に切り出すか、対象テーブル名を引数化した関数として両アプリから呼ぶか)。既存の`ikukyu/admin`のテストが引き続き通ることを確認する

## 集計・整形ロジック(純粋関数・TDDの中心)

- [ ] T2. 絞り込み条件を組み立てる(`fetchResults.ts`) — 期間の有無・テストデータを含めるかで、取得条件がどう変わるかをテストする(design.md#保存データを絞り込んで取得する処理、requirements.md#絞り込み、requirements.md#テストデータの扱い)
- [ ] T3. 一覧の各列を整形する(`format.ts`) — 日付・金額の表示、貯蓄のみモードで想定利回りが未設定のときの空表示をテストする(requirements.md#一覧表示-1)
- [ ] T4. 利用件数の合計と期間推移(日別/月別)を集計する(`aggregate.ts`) — 複数レコードから件数と推移の区切りが正しく出ることをテストする(requirements.md#集計表示-1)
- [ ] T5. 最終月時点の資産額の平均と5区分の分布を集計する(`aggregate.ts`) — 各区分の境界値がどちらに入るかを含めてテストする(requirements.md#集計表示-2)
- [ ] T6. 月次余剰資金の平均を集計する(`aggregate.ts`) — 平均の算出と、0件時に算出対象なしとなることをテストする(requirements.md#集計表示-3)
- [ ] T7. 配偶者あり割合・運用モード別割合を集計する(`aggregate.ts`) — 件数・比率の算出、0件時の扱いをテストする(requirements.md#集計表示-4)

## データ取得(外部依存あり)

- [ ] T8. 絞り込み条件でレコードを取得する(`fetchResults.ts`) — Supabaseクライアントをモックし、T2の条件が取得呼び出しに反映されること・取得失敗時にエラーを呼び出し元へ伝えることをテストする(design.md#保存データを絞り込んで取得する処理、design.md#エラーハンドリング)

## 画面(コンポーネント)

- [ ] T9. ログイン/権限なしの案内画面(`LoginScreen.tsx`) — `ikukyu/admin`の同等コンポーネントと同じ仕様でテストする(requirements.md#ログイン・アクセス制御-1、requirements.md#ログイン・アクセス制御-3)
- [ ] T10. 絞り込み操作(`FilterBar.tsx`) — 期間・テストデータ切替の操作で、変更が呼び出し元に伝わることをテストする(requirements.md#絞り込み)
- [ ] T11. 一覧表(`ResultsTable.tsx`) — レコード配列を渡すと各列と件数が表示されることをテストする(requirements.md#一覧表示)
- [ ] T12. 集計表示(`SummaryStats.tsx`) — 集計結果を渡すと件数・比率・分布・平均が表示されることをテストする(requirements.md#集計表示)
- [ ] T13. 管理画面本体(`page.tsx`)で状態を組み立てる — ログイン状態・権限・絞り込み条件に応じて、案内/エラー/一覧+集計を出し分ける。絞り込み変更で取得し直すつなぎ込み(design.md#状態管理、design.md#エラーハンドリング)

## 仕上げ

- [ ] T14. `specs/life-money-sim/architecture.md`の機能マップ・図に変更があれば反映を確認する(design.md作成時に反映済みなら確認のみ)
- [ ] T15. `specs/legal/requirements.md`のプライバシーポリシー更新要否を確認する(requirements.md#依存関係)
- [ ] T16. requirements.md冒頭の`> ステータス: 仕様確認中(未実装)`行を削除する(実装のテストが仕様項目に紐づいた段階で)
- [ ] T17. `scripts/spec-coverage-skip.json`にスキップ項目を登録する。`check:spec-coverage`はrequirements.md/design.mdの**全項目**を「✅テスト対応 or ⏭スキップ」にすることを要求するため、テストで担保しない項目をすべて登録しないと、T16のWIPマーカー削除後にCIが多数❌で落ちる。登録範囲は`ikukyu/admin`の登録運用に倣う(design.mdの処理フロー・メタ見出し全般、requirements.mdのメタ見出し・OIDC/RLS/運用前提で単体テスト不可の項目)。登録後に`npm run check:spec-coverage`を実行し、❌が0件であることを確認する
