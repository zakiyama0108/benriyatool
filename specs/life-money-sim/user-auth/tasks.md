> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## T1. LoginStatusコンポーネント(表示の出し分け)
- 対象ファイル: `app/life-money-sim/components/LoginStatus.tsx`、`__tests__/life-money-sim/components/LoginStatus.test.tsx`
- 内容:
  - props: `session: Session | null`, `onLoginClick: () => void`, `onLogoutClick: () => void`
  - `session`が`null`の場合は「Googleでログイン」ボタンを表示し、クリックで`onLoginClick`を呼ぶ
  - `session`がある場合はアカウント名(またはメールアドレス)とログアウトボタンを表示し、クリックで`onLogoutClick`を呼ぶ
- 関連: design.md#ログイン状態を判定して表示を出し分ける処理

## T2. page.tsxへの組み込み(ログインセッションの状態管理)
- 対象ファイル: `app/life-money-sim/page.tsx`
- 内容:
  - `app/lib/adminAuth.ts`の`getSession`/`onAuthChange`/`signInWithGoogle`/`signOut`を使い、ログインセッションをローカル状態として持つ
  - マウント時に`getSession`で初期状態を取得し、`onAuthChange`で変化を購読する(アンマウント時に購読解除)
  - `LoginStatus`を画面に配置し、ログイン開始・ログアウトの操作を配線する
  - 戻り先URL(`redirectTo`)はシミュレーター画面自身のURL(`window.location.href`)を渡す
- 関連: design.md#Googleでログインする処理、design.md#ログアウトする処理、design.md#状態管理
- 備考: ユニットテストが書きにくい結線部分(useEffectでの購読・DOM統合)は`scripts/spec-coverage-skip.json`への登録要否をT1完了時点で判断する(LoginStatus自体のロジックはT1でテスト済みのため)

## T3. プライバシーポリシー更新要否の確認
- `specs/legal/requirements.md`のプライバシーポリシー更新要否を確認する(requirements.md#依存関係)

## T4. 動作確認
- `npm run dev`でシミュレーター画面を開き、未ログイン状態で計算・匿名保存(save-result)が引き続き利用できることを確認する
- 「Googleでログイン」→ Google認証 → 画面に戻ってログイン中表示になることを確認する
- ログアウト操作でログイン前の表示に戻ることを確認する
