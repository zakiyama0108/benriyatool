# タスク: ゲーム一覧・絞り込み

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

前提: [game-registration](../game-registration/tasks.md)のT0(テーブル・RLS)とT1(共通型)が先に必要。

## T1. 一覧取得関数(`lib/games.ts`に`fetchPublishedGames`を追加)
- 🔴 `deleted_at is null`の行だけを、登録日時の新しい順で、`photo_paths`を含めずに取得すること、失敗時にエラーを返すことをテストする(Supabaseクライアントをモック)
- 🟢 公開中ゲームの取得関数を実装する(必要列のみ選択)
- 🔵 取得列・並び順を整理する

## T2. 絞り込みロジック(`lib/filterGames.ts`)
- 🔴 各分類の絞り込み(対応人数の範囲内包/プレイ時間の重なり/ジャンル・対象年齢・難易度・メーカー一致/言語依存度/受賞歴あり/作者の部分一致)がAND条件で効くこと、未登録項目はその分類指定時に除外されること、選択肢の組み立てが取得データの値に基づくことをテストする
- 🟢 取得済みゲームへ絞り込み条件を適用する純粋関数と、選択肢組み立てを実装する
- 🔵 条件適用の分岐を整理する

## T3. 絞り込みパネル(`components/FilterPanel.tsx`)
- 🔴 各分類の操作・作者テキスト検索・リセットが、条件変更を親へ通知すること(送信ボタンを介さず即時に通知する)、リセットで全条件が解除されること、モバイル幅では開閉トグルで表示/非表示が切り替わることをテストする
- 🟢 絞り込みUIを実装する(選択肢はpropsで受ける)。デスクトップはStitch採用スクリーンに従い本文上部に常時表示、モバイルは検索欄横のアイコンボタンで開閉する(design.md「画面構成」)
- 🔵 レイアウト・操作性を整える

## T4. ゲームカード(`components/GameCard.tsx`)
- 🔴 ゲーム名・対応人数・プレイ時間・ジャンルが表示されること、カードから詳細へ遷移できること、ログイン中のみお気に入り操作(`FavoriteButton`)が出ることをテストする
- 🟢 一覧の1件カードを実装する
- 🔵 表示・遷移を整える

## T5. 一覧画面(`page.tsx`)
- 🔴 取得→絞り込み→一覧・件数表示が連動すること、条件変更で再取得せず取得済みデータへ適用されること、取得失敗時にエラー表示になること、絞り込み結果0件時にエラー表示とは異なる「見つかりませんでした」の案内になること、初期状態が全件・登録日時の新しい順であることをテストする
- 🟢 取得・状態管理・絞り込みパネル・カード一覧・件数表示を組み立てる
- 🔵 取得状態(読み込み中/表示中/エラー)の切り替えを整理する

## T6. 共通ナビ・パンくずの更新(既存画面への波及)
- 🔴 `BoardGameNav`に`list`キー(`/board-game-rules`)が追加され一覧項目が表示されること、register/favoritesのパンくずの「ボドゲのトリセツ」が`/board-game-rules`へのリンクになることをテストする(既存の`components/BoardGameNav.tsx`・`register/page.tsx`・`favorites/page.tsx`のテストを更新)
- 🟢 `BoardGameNavKey`に`list`を追加しナビ最上段に追加、register/favoritesのパンくずをリンク化する(design.md「ナビゲーション」)。あわせて`game-registration/design.md`「パンくず」の「game-list未実装のため非リンク」の一文をリンク化された旨に更新する(ドキュメントのみの修正、コード変更は伴わない)
- 🔵 表示順・ラベルを整える

## T7. トップページ掲載・メタ情報(hub-site)
- 🔴 `app/page.tsx`のツールカード一覧にboard-game-rules(`/board-game-rules`)へのリンクが表示されることをテストする(`__tests__/page.test.tsx`に追加)
- 🟢 hub-siteの既存カードと同じマークアップでboard-game-rulesカードを`app/page.tsx`に追加する。`/board-game-rules`のtitle/description自体は`app/board-game-rules/layout.tsx`に実装済みのため値の変更はせず、同ファイル先頭コメントの参照先を「hub-site暫定定義」からrequirements.md#メタ情報-10に更新する(コメントのみの修正、テスト対象の挙動変化なし)
- 🔵 表示順(既存3カードとの並び)を整える

## 補足
- お気に入り操作(`FavoriteButton`)は[favorite](../favorite/tasks.md)で実装したものを各カードに組み込む。並行開発時はfavoriteのボタン完成を待つか、仮のプレースホルダで先行する
- T6・T7は本画面(game-list)自体の実装ではなく、トップページ追加に伴う既存画面(register/favorites/hub-site/layout)側の更新。T5(一覧画面)と同じPRでまとめて実装する
