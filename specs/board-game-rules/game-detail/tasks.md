# タスク: ゲーム詳細

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

前提: [game-registration](../game-registration/tasks.md)のT0(テーブル・RLS)が先に必要。`lib/games.ts`(Game型)・`lib/rulesChapters.ts`(共通章立て。[admin/design.md#詳しい版の共通章立て(生成時の構造)](../admin/design.md))は実装済みのため新規タスクとしては挙げない。

## T1. 単一ゲーム取得(`lib/games.ts`に`fetchGameById`を追加)
- 🔴 指定IDのゲームを`photo_paths`を含めず(`intro_photo_paths`は含めて)取得すること、該当なし(存在しない)/取得失敗を区別して返すこと、不正なID形式は該当なし扱いになることをテストする(Supabaseクライアントをモック)
- 🟢 クエリのIDで単一ゲームを取得する関数を実装する
- 🔵 該当なし・失敗の返し方を整理する

## T2. 分類情報表示(`components/GameInfo.tsx`)
- 🔴 必須項目(ゲーム名・対応人数・プレイ時間)は常に表示され、空欄(未登録)の任意項目(発売年を含む)はその項目自体が非表示(「未登録」ラベルを出さない)ことをテストする(design.md#分類情報を表示する処理-2で確定)。発売年が登録されている場合は「2018年」のように西暦+「年」で表示されることもテストする(design.md#分類情報を表示する処理-3)
- 🟢 分類情報の表示を実装する(空欄の任意項目は表示しない。発売年は「年」を付けて表示する)
- 🔵 項目レイアウトを整える

## T3. ルールタブ(`components/RuleTabs.tsx`)
- 🔴 初期表示が簡単版であること、タブ切り替えで詳しい版が章見出し付き・空章非表示で表示されること、章キー↔見出し対応が使われることをテストする
- 🟢 簡単版/詳しい版のタブ切り替え表示を実装する(`rulesChapters`を使う)
- 🔵 タブUI・章表示を整える

## T4. ゲーム紹介画像ギャラリー(`components/PhotoGallery.tsx`)
- 🔴 `intro_photo_paths`が1枚以上あれば登録順に画像を表示すること、0枚(空配列)なら何も描画しない(ギャラリー領域自体が出ない)ことをテストする(design.md#ゲーム紹介画像をギャラリー表示する処理)
- 🟢 `getGamePhotoUrl`([game-list](../game-list/tasks.md)で実装する`lib/gamePhotos.ts`を利用)で公開URLへ変換し、順序どおりに並べて表示する
- 🔵 レイアウト(1枚目を大きく、残りを並べる)を整える

## T5. 詳細画面(`detail/page.tsx`)
- 🔴 クエリのIDで取得→表示、該当なし/取得エラーの出し分け、お気に入り・コメント・通報導線の配置、ギャラリーの配置(画像0枚では非表示)、閲覧はログイン不要であることをテストする
- 🟢 クエリのIDで取得し、`PhotoGallery`・`GameInfo`・`RuleTabs`・`FavoriteButton`・`CommentSection`・`ReportButton`を組み立てる
- 🔵 取得状態(読み込み中/表示中/該当なし/エラー)の切り替えを整理する

## 運営者向けの操作(管理者ログイン時)

> 前提: 元写真の非公開Storage・紹介画像の公開Storage([admin/tasks.md](../admin/tasks.md)のT0/T0b、適用済み)。

## T6. 物理削除のマイグレーション(実装より先に単独PRで適用)
- `board_game_rules_games`に運営者本人のみの`admin can delete games` DELETEポリシー(+`grant delete`)を追加する(design.md「物理削除のDB設計」)
- 子テーブル`board_game_rules_comments`・`board_game_rules_favorites`・`board_game_rules_reports`の`game_id`外部キーを`ON DELETE CASCADE`に付け替える(既存FKをDROP→再作成)
- `board_game_rules_games`から`deleted_at`列を削除し、公開SELECTのRLS`anyone can select published games`の条件を`deleted_at is null`から`true`に変更する
- 実機確認: 運営者本人でgames行をDELETEでき、紐づくコメント・お気に入り・通報が連動削除されること/運営者以外・未ログインはDELETE不可/一般利用者が引き続き全ゲームをSELECTできること/削除後もStorage実ファイル(元写真・紹介画像)は残ること
- (TDD対象外・マイグレーション)

## T7. 管理者判定(`detail/page.tsx`に組み込み、`app/lib/adminAuth.ts`利用)
- 🔴 管理者ログイン時のみ管理者導線を表示すること、未ログイン・一般ログイン利用者・運営者以外では一切表示しないことをテストする(`isAuthorizedAdmin`をモック)
- 🟢 セッション+`isAuthorizedAdmin`で管理者判定し、`AdminControls`・各操作導線の表示可否に渡す
- 🔵 判定タイミング・取得中の扱いを整理する

## T8. ゲーム編集・物理削除・コメント削除(`lib/gameModeration.ts`)
- 🔴 編集(登録時と同じ検証を通したUPDATE)、**物理削除(games行のDELETE)**、コメント削除(comments.deleteComment利用)が実行され、失敗時にエラーを返すことをテストする(Supabaseクライアントをモック)。削除はDELETEであることを明示的にテストする
- 🟢 編集・物理削除・コメント削除を実装する
- 🔵 検証再利用・失敗表示を整理する

## T9. 元写真照合・紹介画像差し替え(`lib/originalPhotos.ts`, `lib/introPhotos.ts`)
- 🔴 元写真: `photo_paths`から非公開Storageの元写真を運営者として取得できること、失敗時の扱いをテストする(Storageクライアントをモック)
- 🔴 紹介画像: 新規画像を公開バケットへアップロードし`intro_photo_paths`末尾に追加(上限20枚の切り捨て含む)・指定パスの削除(Storage実体は消さない)・メイン画像への並び替え・UPDATE保存が実行され、失敗時にエラーを返すことをテストする
- 🟢 元写真取得・紹介画像の追加/削除/並び替えを実装する
- 🔵 取得・失敗の扱いを整理する

## T10. 管理者導線コンポーネント(`components/AdminControls.tsx`、`CommentSection`の削除導線)
- 🔴 管理者時のみ、編集フォーム展開→上書き保存、物理削除(確認ステップ付き)、元写真照合の表示、紹介画像の差し替え/削除/並び替え、コメント各行の削除導線が出ること、非管理者では出ないことをテストする
- 🟢 `AdminControls`と各導線を実装する
- 🔵 配置・確認ステップ・二重操作防止を整える

## 補足
- `FavoriteButton`([favorite](../favorite/tasks.md))・`CommentSection`([comment](../comment/tasks.md))・`ReportButton`([report](../report/tasks.md))は各specで実装したものを組み込む。並行開発時は依存先の完成を待つか仮プレースホルダで先行する
- 静的エクスポート下でクエリIDを扱う方式(単一ページ+クライアント取得)を採る。`[id]`動的ルートは使わない(design.md「詳細画面のルーティング」)
- `lib/gamePhotos.ts`(`getGamePhotoUrl`)は[game-list/tasks.md](../game-list/tasks.md)で先に実装されたものを共有する(重複実装しない)
