# タスク: 利用者ログイン(任意)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

既存の`app/lib/adminAuth.ts`(ログイン開始・ログアウト・セッション取得・運営者判定)をそのまま再利用するため、認証ロジック自体の新規実装はない。本specの実装は、それを画面へ配線する薄いフックとコンポーネントに限る。

## T1. セッション取得・購読フック(`app/board-game-rules/lib/useSession.ts`)
- 🔴 未ログイン時に`session`が`null`、ログイン中に`session`が入ること、`onAuthChange`購読の解除がアンマウント時に呼ばれることをテストする(`adminAuth`をモックする)
- 🟢 `getSession`で初期セッションを取得し、`onAuthChange`で変化を購読して`session`状態を更新するフックを実装する
- 🔵 ローディング状態(初期取得中)の扱いを整理する

## T2. ログイン状態表示コンポーネント(`app/board-game-rules/components/LoginStatus.tsx`)
- 🔴 未ログイン時に「Googleでログイン」操作が表示され、押下で`signInWithGoogle`が現在URLを戻り先に呼ばれること、ログイン中はアカウント名・「ログアウト」・「お気に入り一覧」導線が表示され、ログアウト操作で`signOut`が呼ばれることをテストする
- 🟢 `useSession`の結果で表示を出し分けるコンポーネントを実装する(未ログイン=ログイン操作のみ、ログイン中=アカウント表示+ログアウト+お気に入り一覧導線)
- 🔵 共通ヘッダーからの利用を想定した表示の整え(favorite/game-list/game-detailのヘッダーへ後続specで組み込む)

## T3. 運営者判定の提供の確認
- 🔴 `isAuthorizedAdmin`を利用する側(登録・管理・コメント)からの参照が、運営者=true/非運営者=false/問い合わせ失敗=安全側(false扱い)で解決されることを、各利用側specのテストで確認する(本specでは新規ロジックを持たないため、既存`adminAuth.isAuthorizedAdmin`のふるまいを前提として利用側テストに委ねる)
- 🟢 本specでの追加実装なし(既存`adminAuth.ts`を利用)
- 🔵 なし

## 補足(リリース前チェック)
- Google OIDCプロバイダ設定・Supabase AuthのRedirect URLs許可リストは、管理画面([admin/design.md](../admin/design.md))と共通のSupabase Auth設定を使う。
- **Redirect URLs 許可リストへの登録は本specの責務として明示する**: 利用者ログインの戻り先は操作元の画面自身のURL(一覧`/board-game-rules`・詳細`/board-game-rules/detail`・登録`/board-game-rules/register`・お気に入り一覧`/board-game-rules/favorites`など)であり、adminが登録する`/board-game-rules/admin/**`だけではこれらが許可リストから漏れる。そこで**本アプリの全戻り先をカバーする`https://benriyatool.com/board-game-rules/**`をSupabase AuthのRedirect URLs許可リストに本番公開前に登録する**(admin側の`/admin/**`登録だけに委譲しない。既存`life-money-sim/admin`の登録漏れの教訓と同じクラスの不具合を防ぐ。[admin/design.md](../admin/design.md)のリリース前チェックと合わせて確認する)
- **認証プロバイダのロックダウン(多層防御)**: 運営者判定はJWTの`email`クレームと`admin_emails`の突合に依存するため、`email`がGoogle検証済みであることが前提。プロジェクトのSupabase Authで有効化する認証手段はGoogle OIDCのみとし、メール/パスワード・マジックリンク等の別プロバイダで`email`を詐称する経路を作らない(ADR-0006の決定)。この設定をリリース前確認に含める
