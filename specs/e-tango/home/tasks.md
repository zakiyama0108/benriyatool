> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## T1: 連続学習日数を計算する処理
- 🔴 `__tests__/e-tango/lib/streak.test.ts`: 学習日が連続している場合に正しい日数を返すこと、今日未学習でも前日までの連続日数を返すこと、途切れている場合は0またはそこまでの日数を返すことを検証するテストを書く
- 🟢 `app/e-tango/lib/streak.ts`を実装する
- 🔵 ローカル日付の扱い(タイムゾーン)をコメントで明記する

## T2: ProgressRingコンポーネント
- 🔴 `__tests__/e-tango/components/ProgressRing.test.tsx`: 学習済み語数/総語数・割合が表示されること、色だけでなく数値でも進捗が分かることを検証するテストを書く
- 🟢 `app/e-tango/components/ProgressRing.tsx`を実装する(design.md#画面設計のセージグリーンリング)
- 🔵 SVGでのリング描画をヘルパー関数に整理する

## T3: TodayCountCardコンポーネント
- 🔴 `__tests__/e-tango/components/TodayCountCard.test.tsx`: 今日の新規/復習語数が表示されることを検証するテストを書く
- 🟢 `app/e-tango/components/TodayCountCard.tsx`を実装する
- 🔵 2枚のカードを配列propsで受け取れる形に整理する

## T4: home画面本体(page.tsx)
- 🔴 `__tests__/e-tango/page.test.tsx`: 今日のキューが0件のとき完了表示になること、0件でないとき「学習を始める」ボタンが表示され押下で`study-session`へ遷移することを検証するテストを書く
- 🟢 `app/e-tango/page.tsx`を実装し、`buildDailyQueue`・`progressStore`・`streak`を組み合わせる
- 🔵 データ取得の失敗時に日本語の定型メッセージを表示する分岐を整理する

## T5: Headerの歯車アイコン(学習設定への導線)
- 🔴 `__tests__/e-tango/components/Header.test.tsx`(追記): home画面のHeaderにのみ歯車アイコンが表示され、押下で`study-settings`へ遷移することを検証するテストを書く
- 🟢 `Header.tsx`にvariant propsを追加する
- 🔵 study-session/study-settingsでの表示(戻る矢印+画面名)との出し分けを整理する

## T6: styleguideページ(e-tango共通部品の一覧確認用)
- 対象ファイル: `app/e-tango/styleguide/page.tsx`、`app/e-tango/styleguide/styleguide.png`
- 内容: Header・ProgressRing・TodayCountCard・Stepper・SegmentedControl等、このアプリの共通部品を1画面に並べて確認できるページを作る(フォルダ名にアンダースコアを付けない)。`npm run dev`で表示し、`styleguide.png`としてキャプチャを保存する

## T7: hub-siteトップページへのツールカード追加(本番公開する実装PRで実施)
- 対象ファイル: `app/page.tsx`
- 内容: e-tangoを初めて本番公開する実装PRで、他アプリと同じ形式のツールカードを追加する(`specs/hub-site/requirements.md#機能要件-2`)。design/tasks.mdの本コミット時点では実施しない(実装・公開のタイミングで行う)

## T8: 動作確認
- `npm run dev`でログイン後、進捗リング・今日の新規/復習語数・連続日数が表示されることを確認する
- その日の学習をすべて終えた状態で完了表示に切り替わることを確認する
- 「学習を始める」から`study-session`に遷移することを確認する
- 歯車アイコンから`study-settings`に遷移することを確認する
