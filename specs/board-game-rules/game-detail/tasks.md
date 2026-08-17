# タスク: ゲーム詳細

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

前提: [game-registration](../game-registration/tasks.md)のT0(テーブル・RLS)・T1(共通型・章立て)が先に必要。

## T1. 単一ゲーム取得(`lib/games.ts`に`fetchGameById`を追加)
- 🔴 指定IDの`deleted_at is null`ゲームを`photo_paths`を含めず(`intro_photo_paths`は含めて)取得すること、該当なし/取得失敗を区別して返すこと、不正なID形式は該当なし扱いになることをテストする(Supabaseクライアントをモック)
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

## 補足
- `FavoriteButton`([favorite](../favorite/tasks.md))・`CommentSection`([comment](../comment/tasks.md))・`ReportButton`([report](../report/tasks.md))は各specで実装したものを組み込む。並行開発時は依存先の完成を待つか仮プレースホルダで先行する
- 静的エクスポート下でクエリIDを扱う方式(単一ページ+クライアント取得)を採る。`[id]`動的ルートは使わない(design.md「詳細画面のルーティング」)
- `lib/gamePhotos.ts`(`getGamePhotoUrl`)は[game-list/tasks.md](../game-list/tasks.md)で先に実装されたものを共有する(重複実装しない)
