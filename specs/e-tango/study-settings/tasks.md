> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## T1: 復習頻度の目安を算出する処理
- 🔴 `__tests__/e-tango/lib/retentionGuide.test.ts`: 保持率80/85/90/95%それぞれに対応する目安表現が返ることを検証するテストを書く
- 🟢 `app/e-tango/lib/retentionGuide.ts`を実装する
- 🔵 表現の閾値・文言を定数化する

## T2: Stepperコンポーネント
- 🔴 `__tests__/e-tango/components/Stepper.test.tsx`: −/＋操作で値が1ずつ増減すること、下限(5)・上限(30)で止まることを検証するテストを書く
- 🟢 `app/e-tango/components/Stepper.tsx`を実装する
- 🔵 上下限をprops化し、他機能でも再利用できる形にする

## T3: SegmentedControlコンポーネント
- 🔴 `__tests__/e-tango/components/SegmentedControl.test.tsx`: 4値(80/85/90/95)から選択でき、選択中の値がハイライトされることを検証するテストを書く
- 🟢 `app/e-tango/components/SegmentedControl.tsx`を実装する
- 🔵 選択肢を汎用的な`options: number[]`propsにし、他機能でも再利用できる形にする

## T4: study-settings画面本体(page.tsx)
- 🔴 `__tests__/e-tango/study-settings/page.test.tsx`: 初期表示時に保存済み設定(またはなければ既定値)が表示されること、操作直後に保存処理が呼ばれること、保存失敗時に日本語の定型メッセージが表示されることを検証するテストを書く
- 🟢 `app/e-tango/study-settings/page.tsx`を実装し、`progressStore`・`retentionGuide`と組み合わせる
- 🔵 保存失敗時のメッセージ表示を共通コンポーネント化できないか確認する

## T5: 動作確認
- `npm run dev`で`study-settings`を開き、既定値(新規10語・保持率90%)が表示されることを確認する
- ステッパーで新規単語数を変更し、5〜30の範囲でしか動かないことを確認する
- セグメントで目標保持率を変更し、復習頻度の目安表示が変わることを確認する
- 変更後に別画面へ移動し戻ってきても、変更後の値が保持されていることを確認する(保存の反映確認)
