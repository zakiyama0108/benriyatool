> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## T1. usageGuideContent.ts(コンテキストヘルプ・バナー・用語集の文言定義)
- 対象ファイル: `app/life-money-sim/lib/usageGuideContent.ts`、`__tests__/life-money-sim/lib/usageGuideContent.test.ts`
- 内容:
  - `HelpCardId`型(`'income' | 'personalExpense' | 'household' | 'balanceSummary' | 'startingAsset' | 'familyProfile' | 'investmentMode' | 'eventBonus' | 'assetProjection'`の9種)
  - `CONTEXT_HELP_TEXT: Record<HelpCardId, string>` — requirements.md「コンテキストヘルプの文言」の9件をそのまま定義する
  - `USAGE_BANNER_STEPS: { title: string; text: string }[]` — requirements.md「使い方バナーの文言」の3ステップを順番どおり定義する
  - `GLOSSARY_TERMS: { term: string; text: string }[]` — requirements.md「用語集の文言」の4用語を定義する
  - テストでは各定数の件数(9/3/4)と、`HelpCardId`の全キーが`CONTEXT_HELP_TEXT`に揃っていることを検証する(文言の対応漏れを防ぐ)
- 関連: design.md#処理フロー、requirements.md#コンテキストヘルプの文言、requirements.md#使い方バナーの文言、requirements.md#用語集の文言

## T2. usageBannerStorage.ts(開閉状態のlocalStorage読み書き)
- 対象ファイル: `app/life-money-sim/lib/usageBannerStorage.ts`、`__tests__/life-money-sim/lib/usageBannerStorage.test.ts`
- 内容:
  - `loadUsageBannerOpen(): boolean` — 保存値が無ければ`true`(開いた状態)を返す。保存値があればそれを返す。`localStorage`アクセスが例外を投げた場合も`true`を返す(design.md#使い方バナーの開閉状態を初期化・保存する処理-3)
  - `saveUsageBannerOpen(isOpen: boolean): void` — 開閉状態を保存する。例外が発生しても呼び出し元に伝播させず、`console.error`でログのみ出す(design.md#ログ)
  - テストは`localStorage`をモックし、正常系(保存済みtrue/false・未保存)と異常系(getItem/setItemが例外を投げるケース)を網羅する
- 関連: design.md#使い方バナーの開閉状態を初期化・保存する処理、design.md#エラーハンドリング

## T3. HelpIconコンポーネント(「？」アイコン+ポップオーバー)
- 対象ファイル: `app/life-money-sim/components/HelpIcon.tsx`、`__tests__/life-money-sim/components/HelpIcon.test.tsx`
- 内容:
  - props: `id: string`, `text: string`, `openId: string | null`, `onToggle: (id: string) => void`, `onClose: () => void`
  - `openId === id`のときのみポップオーバー(`text`)を表示する
  - 「？」ボタンのクリックで`onToggle(id)`を呼ぶ(開閉自体の状態遷移はopenIdを持つ呼び出し元が担う。design.md#コンテキストヘルプの開閉を制御する処理-2)
  - ポップオーバー表示中に自身の外側をクリックすると`onClose()`を呼ぶ
- 関連: design.md#コンテキストヘルプの開閉を制御する処理、design.md#コンポーネント設計

## T4. UsageBannerコンポーネント(使い方バナー)
- 対象ファイル: `app/life-money-sim/components/UsageBanner.tsx`、`__tests__/life-money-sim/components/UsageBanner.test.tsx`
- 内容:
  - props無し。マウント時に`loadUsageBannerOpen()`で開閉状態を反映する(初回描画は開いた状態。design.md#使い方バナーの開閉状態を初期化・保存する処理-1,2)
  - `USAGE_BANNER_STEPS`の3ステップをタイトル+説明文言で表示する(開いているときのみ)
  - クリックで開閉を切り替え、そのたびに`saveUsageBannerOpen()`を呼ぶ
- 関連: design.md#使い方バナーの開閉状態を初期化・保存する処理、design.md#画面設計

## T5. GlossaryButtonコンポーネント(用語集ボタン+モーダル)
- 対象ファイル: `app/life-money-sim/components/GlossaryButton.tsx`、`__tests__/life-money-sim/components/GlossaryButton.test.tsx`
- 内容:
  - props無し。ローカル状態で開閉を管理する
  - 「用語集」ボタン押下でモーダルを開き、`GLOSSARY_TERMS`の4用語を一覧表示する
  - モーダル内の閉じるボタン、またはモーダル外側(背景)のクリックで閉じる
- 関連: design.md#用語集モーダルを開閉する処理、design.md#画面設計

## T6. 9カードへの組み込み(page.tsx・各カードコンポーネント)
- 対象ファイル: `app/life-money-sim/page.tsx`、`app/life-money-sim/components/IncomeForm.tsx`、`app/life-money-sim/components/HouseholdShareInput.tsx`、`app/life-money-sim/components/BalanceSummary.tsx`、`app/life-money-sim/components/FamilyProfileForm.tsx`、`app/life-money-sim/components/ModeToggle.tsx`、`app/life-money-sim/components/EventListInput.tsx`
- 内容:
  - `page.tsx`に`openHelpId: string | null`の状態を追加し、`toggleHelp(id)`/`closeHelp()`を定義する(design.md#状態管理)
  - IncomeForm・HouseholdShareInput・BalanceSummary・FamilyProfileFormは、それぞれ既存タイトル行に`HelpIcon`を追加するpropsを増やす(`openId`/`onToggle`/`onClose`を`page.tsx`から受け取る)
  - ModeToggle・EventListInputはカード全体を束ねるタイトル行が無いため、他カードと同じ見た目のタイトル(「貯蓄/運用切替」「賞与・イベント」)を新設し、`HelpIcon`を追加する(ModeToggleは他カードと違いカード自体の背景・角丸・シャドウ(`rounded-[18px] bg-lms-card p-5 shadow-...`)も持たないため、これも他カードに揃えて新設する。EventListInputは既存のカード装飾はそのまま使う)
  - `page.tsx`内の「個人支出」「前提入力」「資産推移グラフ・テーブル」の3ブロックは、既存または新設のタイトル行に直接`HelpIcon`を設置する(「資産推移グラフ・テーブル」はタイトル行自体が無いため新設し、そこに`GlossaryButton`も併設する)
  - `UsageBanner`を画面タイトル(`h1`)の直下に設置する
- 関連: design.md#コンテキストヘルプの開閉を制御する処理、design.md#画面設計、design.md#関連するファイル(抜粋)

## T7. 動作確認
- `npm run dev`で起動し、9カードすべてに「？」アイコンが表示されることを確認する
- 1つの「？」を開いた状態で別の「？」を押すと、前者が閉じて後者が開くことを確認する(同時に1つまで)
- ポップオーバー外側のクリックで閉じることを確認する
- 使い方バナーが初回は開いた状態で表示され、クリックで閉じられること、リロード後も閉じた状態が維持されることを確認する(ブラウザのプライベートウィンドウでも初期状態(開いた状態)で表示されエラーが出ないことを確認する)
- 「用語集」ボタンでモーダルが開き、4用語が表示されること、閉じるボタン/外側クリックで閉じることを確認する
- スマホ幅(375px程度)でもポップオーバー・バナー・モーダルが画面からはみ出さないことを確認する

## T8. プライバシーポリシー更新要否の確認
- design.md#セキュリティの通り、この機能でlocalStorageに保存するのは使い方バナーの開閉状態を表す真偽値1つのみで、個人情報・入力値(収入・支出等)は一切保存しない
- 上記を踏まえ`specs/legal/requirements.md`を確認し、プライバシーポリシーの更新が不要であることを確かめて判断結果を記録する
- 確認結果: 更新不要と判断。理由は以下の通り。
  - localStorageに保存するのは使い方バナーの開閉状態を表す真偽値1つのみで、個人情報・入力値(収入・支出等)・Googleアカウント情報等は一切含まない
  - ブラウザ内で完結し外部送信・第三者提供が発生しない(design.md#セキュリティ)
  - 既存の`app/legal/page.tsx`が定める「取得する情報」(マイシナリオのGoogleアカウントメールアドレス・保存内容)や「Cookieおよびアクセス解析」(アクセス解析目的)のいずれの対象にも該当しない、純粋なUI表示補助のための保存
