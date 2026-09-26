> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## T1: 出題パターンを選定する処理
- 🔴 `__tests__/e-tango/lib/pickQuizPattern.test.ts`: 通常出題では3パターンからランダムまたは順送りで選ばれること、セッション内リピートの再出題では前回と別パターンになることを検証するテストを書く
- 🟢 `app/e-tango/lib/pickQuizPattern.ts`を実装する
- 🔵 パターン選定ロジックをテストしやすい純粋関数に保つ

## T2: ChoiceGridコンポーネント
- 🔴 `__tests__/e-tango/components/ChoiceGrid.test.tsx`: `layout='image'`で2×2の画像グリッド、`layout='text'`で4つのボタンが表示されること、選択で`onSelect`が呼ばれることを検証するテストを書く
- 🟢 `app/e-tango/components/ChoiceGrid.tsx`を実装する
- 🔵 タップ領域のサイズ(44px以上)を確認する

## T3: QuizCardコンポーネント(3パターンのレイアウト出し分け)
- 🔴 `__tests__/e-tango/components/QuizCard.test.tsx`: 3パターンそれぞれでお題・選択肢が正しいレイアウトで表示されること、回答時に`onAnswer`へ正誤・回答時間・ヒント使用が渡ることを検証するテストを書く。加えて、「ヒント」操作で語の頭文字・日本語訳の一部が表示されること(design.md#ヒントを表示する処理)を検証するテストケースを追加する
- 🟢 `app/e-tango/components/QuizCard.tsx`を実装する(design.md#画面設計の出題画面レイアウト)
- 🔵 回答時間計測のロジック(表示開始〜選択までの経過時間)を切り出す

## T4: AnswerCardコンポーネント
- 🔴 `__tests__/e-tango/components/AnswerCard.test.tsx`: 見出し語・発音記号・訳・イラスト・例文・コアイメージが表示されること、習得済みトグルで`onToggleMastered`が呼ばれること、「次へ」で`onNext`が呼ばれることを検証するテストを書く。加えて、音声再生中に別の音声操作をした場合は前の再生を止めて新しい音声を再生すること(design.md#音声を再生する処理、多重再生防止)を検証するテストケースを追加する
- 🟢 `app/e-tango/components/AnswerCard.tsx`を実装する(design.md#画面設計の答え合わせカード)
- 🔵 音声再生ボタンの多重再生防止(前の再生を止める)を確認する

## T5: ProgressBarコンポーネント
- 🔴 `__tests__/e-tango/components/ProgressBar.test.tsx`: 現在の問題数/総問題数が表示されることを検証するテストを書く
- 🟢 `app/e-tango/components/ProgressBar.tsx`を実装する
- 🔵 homeのProgressRingとの見た目トークンの一貫性を確認する

## T6: セッション開始・再開の組み立て
- 🔴 `__tests__/e-tango/study-session/page.test.tsx`: 保存済みの未消化キューがあればそれを復元すること、なければ`buildDailyQueue`で新規に組み立てることを検証するテストを書く
- 🟢 `app/e-tango/study-session/page.tsx`にセッション開始・再開のロジックを実装する
- 🔵 キューが0件の場合に`home`へ戻す分岐を整理する

## T7: 出題〜回答〜保存の結合
- 🔴 `page.test.tsx`(追記): 回答すると`gradeAnswer`→`scheduleReview`→`saveAnswerResult`の順で呼ばれ、答え合わせカードが表示されることを検証するテストを書く(各lib関数はモック化)
- 🟢 `page.tsx`に回答処理を実装する(design.md#出題に回答する処理のシーケンス)
- 🔵 保存失敗時の日本語定型メッセージ表示・再試行導線を整理する

## T8: セッション内リピートの結合
- 🔴 `page.test.tsx`(追記): 新規語・「もう一度」判定の語が2問以上はさんで再出題されることを検証するテストを書く
- 🟢 `page.tsx`に`sessionRepeat`を組み込む
- 🔵 未消化キューの並び替えロジックを`sessionRepeat.ts`側に寄せ、`page.tsx`を薄く保つ

## T9: セッション完了・中断
- 🔴 `page.test.tsx`(追記): キューを消化しきると完了画面が表示され`e_tango_sessions`行が削除されること、途中で画面を離れても次回同じ未消化キューから再開できることを検証するテストを書く
- 🟢 `page.tsx`に完了処理を実装する
- 🔵 完了画面のコンポーネントを`AnswerCard`等と分離して整理する

## T10: 動作確認
- `npm run dev`で`home`から学習を開始し、3パターンの出題が表示されることを確認する
- 回答後に答え合わせカードが表示され、「次へ」で次の問題に進むことを確認する
- ヒントを使った回答が「むずかしい」判定になることを確認する(出題ログ・カード状態を確認)
- セッション途中でページを離れ、再度開くと続きから再開することを確認する
- キューを最後まで消化し、完了画面から`home`に戻れることを確認する
