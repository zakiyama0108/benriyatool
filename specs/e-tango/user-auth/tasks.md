> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## T1: 認証ラッパー(auth.ts)
- 🔴 `__tests__/e-tango/lib/auth.test.ts`: `getSession()`がセッションの有無を返すこと、`onAuthChange()`がSupabaseの状態変化コールバックを購読・解除できること、`signInWithGoogle()`/`signOut()`がSupabase Authの対応メソッドを正しい引数で呼ぶことを検証するテストを書く(Supabaseクライアントはモック化)
- 🟢 `app/e-tango/lib/auth.ts`に4関数を実装する
- 🔵 `app/lib/adminAuth.ts`と重複する部分がないか確認し、コメントで役割の違い(許可リストなし)を明記する

## T2: LoginScreenコンポーネント
- 🔴 `__tests__/e-tango/components/LoginScreen.test.tsx`: ロゴ・キャッチコピー・「Googleでログイン」ボタン・ETS非提携の注記が表示されること、ボタン押下で`onLogin`が呼ばれることを検証するテストを書く
- 🟢 `app/e-tango/components/LoginScreen.tsx`を実装する(design.md#画面設計のレイアウト)
- 🔵 Stitchで確定したデザイントークン(セージグリーン基調・角丸大)をTailwindクラスに落とし込む

## T3: layout.tsxでのログイン状態判定・出し分け
- 🔴 `__tests__/e-tango/layout.test.tsx`: 判定中はローディング表示のみ、未ログインは`LoginScreen`のみ、ログイン中は子要素をそのまま表示することを検証するテストを書く
- 🟢 `app/e-tango/layout.tsx`に判定ロジックを実装する
- 🔵 判定中のちらつき防止(初期状態を「判定中」にする)を確認しコメントで根拠を残す

## T4: Headerコンポーネント(ログイン中表示・ログアウト)
- 🔴 `__tests__/e-tango/components/Header.test.tsx`: ユーザーアバター表示、タップでログアウトメニューが開き`onLogout`が呼ばれることを検証するテストを書く
- 🟢 `app/e-tango/components/Header.tsx`を実装する(homeの歯車アイコン表示切り替えを含む。design.md#共通chromeヘッダーhomestudy-sessionstudy-settingsで共用)
- 🔵 home/study-session/study-settingsの3画面から呼び出しやすいprops設計に整理する

## T5: 動作確認
- `npm run dev`で`/e-tango`を開き、未ログイン時はログイン画面のみが表示されることを確認する
- 「Googleでログイン」→Google側の許可→`/e-tango`に戻ってログイン中表示になることを確認する
- ヘッダーのアバターからログアウトし、ログイン画面に戻ることを確認する

## T6: プライバシーポリシー更新要否の確認
- `specs/legal/requirements.md`のプライバシーポリシー更新要否を確認する(requirements.md#依存関係)
