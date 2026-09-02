# タスク: ボードゲームの新規登録(写真からのルール生成)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## T0. マイグレーション適用(実装より先に単独PRで適用)
- `board_game_rules_game_requests`テーブルとRLS(誰でもINSERT・運営者のみSELECT/UPDATE/DELETE)、下限≤上限のCHECK制約、ジャンル(複数選択、text[])の固定リストCHECK制約を`supabase/migrations/`に追加しCI適用する
- `board_game_rules_games`の変更(`is_official`列の削除、`release_year`列の追加、`genre`→`genres`(text[])への変更・固定リストCHECK制約、anon/authenticatedのINSERTポリシー撤廃)を同じ単独PRに含める
- design.md「データベース設計」T0の実機確認(anonの依頼INSERT可・運営者以外のSELECT/UPDATE/DELETE不可・下限>上限のCHECK拒否・ジャンル固定リスト外の値を含む配列の拒否)を行う
- Supabaseダッシュボードで Database Webhooks(INSERT on board_game_rules_game_requests → ntfyのMessage Templating URL)を手動設定する(TDD対象外。design.md「運営者への通知」参照。タイトル・本文・クリックURL(管理画面へのリンク)が正しく届くことを実機確認する)
- (TDD対象外: マイグレーションの適用と手動確認)

## T0b. 追加マイグレーション適用(ゲーム紹介画像、実装より先に単独PRで適用)
- `board_game_rules_game_requests`・`board_game_rules_games`へ`intro_photo_paths text[] not null default '{}'`を追加する`ALTER TABLE`マイグレーションを追加しCI適用する(design.md「追加マイグレーション」)
- `board_game_rules_games`のanon向け列単位GRANTに`intro_photo_paths`を追加する(既存GRANTのREVOKE→再GRANT)
- ゲーム紹介画像の公開Storageバケット(`board-game-rules-game-photos`)は[admin/tasks.md](../admin/tasks.md)のT0bで作成される(本specの依頼送信・T0bはテーブル側の列追加のみ担当)
- design.md「追加マイグレーション」T0の実機確認(anonが`intro_photo_paths`を含めてSELECTできること・`photo_paths`は引き続き拒否されること、依頼INSERTで`intro_photo_paths`を渡せること)を行う
- (TDD対象外: マイグレーションの適用と手動確認)

## T0c. 追加マイグレーション適用(登録実行・下書きレビュー)
- `board_game_rules_game_requests`へ`status`/`draft_content`/`revision_note`/`revision_round`/`revision_history`/`error_message`/`published_game_id`を追加する`ALTER TABLE`マイグレーションを追加しCI適用する(design.md「追加マイグレーション(登録実行・下書きレビュー)」)
- `board_game_rules_games`へ運営者本人限定のINSERTポリシー(`admin can insert games`)を追加する
- マイグレーションは`deploy.yml`のmigrateジョブがデプロイに先行して適用するため、実装(T2b・T4b)と同じPRに含めてよい
- マージ後、design.md「追加マイグレーション(登録実行・下書きレビュー)」T0の実機確認(`status`のデフォルト・CHECK制約、運営者本人のgames INSERT可・anon/authenticatedのINSERT不可、運営者本人による新カラムのUPDATE可)を行う
- (TDD対象外: マイグレーションの適用と手動確認)

## T1. ジャンルの固定選択肢(`lib/genres.ts`)
- 🔴 固定リストの値・順序・各項目の説明が仕様どおりであることをテストする
- 🟢 ジャンルの選択肢定数(値+説明)を実装する(game-list/adminと共有)
- 🔵 型・命名を整理する

## T2. 依頼データ操作(`lib/gameRequests.ts`)
- 🔴 写真1枚以上+分類情報(すべて任意)で依頼を作成できること、写真0枚では作成できないこと(画面側バリデーション)、対応人数・プレイ時間は片方のみの入力でも作成できること(design.md#バリデーション)、下限>上限は送信できないこと、写真保存/INSERT失敗時にエラーを返すことをテストする(Supabaseクライアントをモック)
- 🟢 createGameRequest(写真Storage保存→INSERT)を実装する
- 🔵 失敗時の握り方(入力保持・二重送信防止)を整理する

## T3. 写真アップローダー(`components/PhotoUploader.tsx`)
- 🔴 複数枚の写真選択・プレビュー表示・削除ができることをテストする
- 🟢 写真選択・プレビューを実装する
- 🔵 表示を整える

## T4. 登録依頼画面(`register/page.tsx`)
- 🔴 写真必須(0枚では送信不可)・分類情報は全項目任意であること、送信中の表示、成功時の完了表示(「受け付けました。運営者確認後に追加されます」)、失敗時の失敗表示・再送可能であることをテストする
- 🟢 写真アップロード+分類情報入力+送信の画面を組み立てる
- 🔵 待機表示・エラー表示・二重送信防止を整理する

## T5. 利用規約への追記(`app/legal/page.tsx`)
- 🔴 利用規約に、運営者が独自再構成したルール解説を掲載していること・権利者の申し出に速やかに対応する旨の条項が含まれることをテストする(表示テスト)
- 🟢 利用規約(知的財産の条項)に該当条項を追記する(requirements.md#利用規約への反映-8)
- 🔵 文言を整える

## T6. 登録依頼画面のUI作り替え(Step0デザインの反映)
> design.md「画面設計(登録依頼フォームのUI)」に沿って、実装済みの素朴版UI(灰色ベース・ジャンル常時表示・説明常時表示)を「Analog Hearth」の見た目へ作り替える。ロジック(createGameRequest・バリデーション・状態遷移)は流用する。参照素材はStitch生成HTML(project 10756296516233709248)。既存のT4テスト(写真必須・全項目任意・送信中/完了/失敗表示)は引き続き通す。

- **T6-1 デザイントークン・全体の見た目の適用(TDD対象外)**: 配色(生成り背景・モスグリーン主要ボタン・テラコッタの控えめな強調・1px罫線)、フォント(見出しPlus Jakarta Sans+本文Work Sans、日本語丸ゴシック)、角丸、影なしのトーン設計を `register/page.tsx`・`PhotoUploader`・ヘッダーへ適用する。見た目の作り替えのため🔴🟢🔵は付けず、localhost実機での画面レビューで担保する
- **T6-2 ジャンルのアコーディオン化**
  - 🔴 既定で折りたたまれていること、開閉操作で28種の選択UIが現れる/隠れることをテストする
  - 🟢 アコーディオン開閉を実装する(チェックボックス格子→チップ選択UI)
  - 🔵 キーボード操作・aria属性(`aria-expanded`など)を整える
- **T6-3 説明文を選択チップの下だけに表示**
  - 🔴 未選択のジャンルには説明文が出ず、選択したジャンルの直下にのみ説明が表示されることをテストする
  - 🟢 選択中ジャンルの説明のみ表示するよう変更する(常時表示を廃止)
  - 🔵 表示位置・折り返しを整える
- **T6-4 写真アップロードの主役化・詳細情報の区切り**
  - 🔴 写真セクションが最上部かつ必須である旨・枚数表示があること、任意項目が「詳細情報」セクションにまとまることをテストする(表示テスト)
  - 🟢 レイアウトを組み替える(写真=主役、基本情報→ジャンル→詳細情報の順)
  - 🔵 レスポンシブ(モバイル1カラム/デスクトップ最大720px中央寄せ)を整える
- localhostでの画面レビューで、design.mdの見た目・確定デザインと一致することを確認する(UI変更のためStep0確定物との突き合わせ)

## T7. ゲーム紹介画像アップローダー(`components/GamePhotoUploader.tsx`)
- 🔴 複数枚選択・プレビュー・削除に加え、各画像の「メイン画像にする」操作でその画像が選択済み画像の先頭へ移動すること、先頭の画像に「メイン」表示が出ることをテストする(design.md「ゲーム紹介画像を選択・並び替える処理」)
- 🟢 `PhotoUploader`と同様の選択・プレビュー・削除に、メイン画像指定(先頭へ移動)の操作を追加して実装する
- 🔵 表示・操作性を整える

## T8. 依頼データ操作の拡張(`lib/gameRequests.ts`)
- 🔴 ゲーム紹介画像0〜20枚を公開Storageバケット(`board-game-rules-game-photos`)へ選択順どおりに保存し`intro_photo_paths`としてINSERTできること、0枚のままでも依頼を送信できること(必須のルールブック写真とは異なる)、紹介画像の保存に失敗した場合にエラーを返すことをテストする(Supabaseクライアントをモック)
- 🟢 `createGameRequest`を拡張し、ゲーム紹介画像の公開Storage保存+`intro_photo_paths`のINSERTを行う
- 🔵 失敗時の握り方を整理する

## T9. 登録依頼画面へのゲーム紹介画像アップロード組み込み(`register/page.tsx`)
- 🔴 ゲーム紹介画像セクションが写真アップロードの直後に表示されること、未選択のまま送信できること(送信ボタンが無効化されないこと)、選択・並び替え・削除がT7の`GamePhotoUploader`で行えることをテストする
- 🟢 `GamePhotoUploader`を組み込み、送信時に`createGameRequest`(T8)へ渡す
- 🔵 レイアウト・見出しの強弱(必須の写真アップロードより控えめ)を整える

## 補足
- 運営者側の「まとめて登録する処理」(ローカルツール・Skill)は本specのスコープ外。[admin/tasks.md](../admin/tasks.md)を参照
- 依頼テーブルの一覧表示・削除操作、および登録実行・下書きレビューに伴う`status`等の更新(管理画面での確認)も[admin/tasks.md](../admin/tasks.md)側のタスク
- ゲーム紹介画像の公開URL変換(`lib/gamePhotos.ts`の`getGamePhotoUrl`)は[game-list/tasks.md](../game-list/tasks.md)で実装したものを、一覧・詳細・管理画面の各specが共有する(本specでは実装しない。登録依頼画面はアップロード前のプレビューのみのため不要)
