# 設計: ゲーム詳細

1つのゲームの分類情報・ルール本文(簡単版/詳しい版のタブ)・コメント欄・通報導線を表示する。データは`board_game_rules_games`から取得する。ゲーム型・共通章立ては`app/board-game-rules/lib/games.ts`・`rulesChapters.ts`を共有する。

## 詳細画面のルーティング(静的エクスポート下での設計判断)
本サイトは`output: "export"`の静的エクスポートで、ゲームは**ビルド後にランタイムで登録される**ため、`/[id]`のような動的ルートを各ゲーム分だけ事前生成できない(`generateStaticParams`はビルド時に既知のパスしか出せない)。そのため詳細画面は**単一の静的ページがURLのクエリからゲームIDを受け取り、ブラウザからDBを取得する**方式にする(例: `/board-game-rules/detail?id=<ゲームID>`。具体的なパス名は実装時に確定)。一覧([game-list/design.md](../game-list/design.md))の各カードはこのクエリ付きURLへリンクする。この方式は`ai-dev-digest/[date]`(ビルド時にコンテンツが確定)とは異なり、ランタイム生成データを扱うための選択である。

## 処理フロー

### 対象ゲームを取得して表示する処理
- 対象: URLのクエリで指定されたゲームID
- 手順:
  1. URLのクエリからゲームIDを読み取る。IDが無い/不正な場合は、対象が見つからない旨を表示する
  2. そのIDの公開中(`deleted_at is null`)ゲームを取得する。`photo_paths`(元写真パス)は取得しない(元写真は詳細に一切表示しない。requirements.md#表示対象-2、[game-registration/design.md#セキュリティ](../game-registration/design.md))
  3. 取得できた場合、分類情報・ルール本文・コメント欄・通報導線を表示する
  4. 該当が無い(存在しない、または運営者が削除した)場合は、対象が見つからない旨を表示する(requirements.md#表示対象-1)
  5. 取得に失敗した場合は、取得に失敗した旨と再試行手段を表示する(後述エラーハンドリング)
- 関連するビジネスルール: requirements.md#基本情報の表示、requirements.md#表示対象

### 分類情報を表示する処理
- 対象: 取得したゲームの分類情報
- 手順:
  1. ゲーム名・対応人数・プレイ時間・ジャンル・対象年齢・難易度・メーカー/出版社・作者・言語依存度・受賞歴を表示する(requirements.md#基本情報の表示-1)
  2. 空欄(未登録=NULL/空)の任意項目は、**その項目自体を表示しない**(「未登録」等のラベルも出さない)。項目が並ぶ中の空欄を減らし、登録済みの情報だけを簡潔に見せるため(requirements.md#基本情報の表示-1が設計に委ねた事項をここで確定)。必須項目(ゲーム名・対応人数・プレイ時間)は常に値があるため必ず表示する
- 関連するビジネスルール: requirements.md#基本情報の表示

### ルール本文をタブで表示する処理
- 対象: 取得したゲームの簡単版・詳しい版
- 手順:
  1. 「簡単版」「詳しい版」の2つのタブを表示し、初期表示は簡単版を選択状態にする(まず概要をつかむため。requirements.md#ルール本文の表示-5)
  2. 簡単版は要約テキストをそのまま表示する
  3. 詳しい版は、共通の章立て([game-registration/design.md#共通の章立て](../game-registration/design.md))の順に、各章の表示見出し(日本語)を付けて表示する。本文が空の章は表示しない(requirements.md#ルール本文の表示-3〜4)
- 補足: 章キー↔表示見出しの対応は`app/board-game-rules/lib/rulesChapters.ts`を使う。`rules_detailed`はanonが任意のjsonbを直接INSERTしうる列のため、`rulesChapters.ts`に定義のない未知の章キーは表示しない(共通章立てに定義された章のみを見出し付きで描画する。壊れた構造・想定外キーへの表示側の頑健性を担保する)
- 関連するビジネスルール: requirements.md#ルール本文の表示

### お気に入り・コメント・通報の導線を表示する処理
- 対象: 取得したゲーム
- 手順:
  1. ログイン中の利用者には、このゲームのお気に入り登録・解除操作を表示する([favorite/design.md](../favorite/design.md)の`FavoriteButton`)。このとき、[favorite/design.md#画面内のお気に入り状態をまとめて取得する処理](../favorite/design.md)に従い、自分のお気に入りgame_id集合を`fetchMyFavoriteGameIds`(favorite/design.mdが定義するインターフェース)で取得し、当該game_idが集合に含まれるかで登録済み/未登録を判定して`FavoriteButton`へ渡す(単独の登録有無確認関数は設けず、集合取得に一本化する)。取得完了まで・取得失敗時は一律「未登録」として扱う([favorite/requirements.md#お気に入りの登録・解除-3](../favorite/requirements.md))。未ログインには操作を表示しない([favorite/design.md](../favorite/design.md)に揃える。ログイン導線は共通ヘッダーの`LoginStatus`に集約)
  2. このゲームのコメント欄を表示する([comment/design.md](../comment/design.md))
  3. このゲームの通報導線を表示する([report/design.md](../report/design.md))
  4. 詳細画面の閲覧自体はログイン不要(お気に入り・コメント投稿にはログインが必要。requirements.md#操作-8)
- 関連するビジネスルール: requirements.md#操作

## エラーハンドリング
- 取得失敗と「該当なし(存在しない/削除済み)」は区別して表示する。取得失敗は再試行手段を出し、該当なしは「見つかりません」の趣旨を出す
- お気に入り・コメント・通報の各操作の失敗は、それぞれのspecのdesign.mdの方針に従う(詳細ページ全体の閲覧は止めない)

## 関連するファイル(抜粋)
```
app/board-game-rules/detail/page.tsx (新規: 詳細画面。クエリのIDでゲームを取得し表示するクライアント画面。パス名は実装時確定)
app/board-game-rules/lib/games.ts (既存: ゲーム型・取得関数を共有。単一ゲーム取得 fetchGameById を追加)
app/board-game-rules/lib/rulesChapters.ts (既存: 共通章立てのキー↔見出し対応)
app/board-game-rules/components/GameInfo.tsx (新規: 分類情報の表示)
app/board-game-rules/components/RuleTabs.tsx (新規: 簡単版/詳しい版のタブ切り替え表示)
app/board-game-rules/components/FavoriteButton.tsx (favorite/design.md)
app/board-game-rules/components/CommentSection.tsx (comment/design.md)
app/board-game-rules/components/ReportButton.tsx (report/design.md)
app/board-game-rules/components/LoginStatus.tsx (既存: user-authの共通ログイン導線)
app/lib/supabaseClient.ts (既存の共通クライアントを利用)
```

## 画面設計

**確定デザインの出所**: Google Stitchプロジェクト「ボドゲのトリセツ 登録依頼フォーム」(project ID `10756296516233709248`)の既存デザインシステム「Analog Hearth」(asset `assets/4c563e385f3f480d813033cba0bd22b7`)を土台に、本画面(分類情報・簡単版/詳しい版タブ・コメント欄・通報導線)固有のスクリーンを新規生成して確定した(共通chrome・トークンはgame-registration/game-listと同じくこのシステムを踏襲。コンテンツ構成はこの画面固有のためStitchで検討)。レイアウトの方向性は、クックパッドのようなレシピアプリ型(材料/作り方タブに相当する「簡単版/詳しい版」タブを画面中央で大きく強調する構成)を採用した(ボドゲーマ型・ECサイト商品ページ型と比較検討の上で選定)。

- **採用スクリーン(デスクトップ)**: 「ゲーム詳細 (共通ナビ適用) - ボドゲのトリセツ」(`projects/10756296516233709248/screens/ac8329d8796346e9abc32ccf8268d160`)。生成HTML(Tailwind)を実装の参照素材とする(register/game-listと同方針)
- **採用スクリーン(モバイル)**: 「ゲーム詳細 (Mobile) - ボドゲのトリセツ」(`projects/10756296516233709248/screens/c5477da5a3da4b088d7bb0a81327a361`)。同様に実装の参照素材とする
- 共通chrome(左サイドバー)はStitch生成のたびに見た目がズレるため、実装は生成結果のナビ表現ではなく既存の`BoardGameNav.tsx`をそのまま使う([DESIGN.md#2-共通chromeルール](../DESIGN.md)の方針どおり)

### デザイントークン(Analog Hearth)
配色・フォント・角丸・階層表現(影を使わず1px罫線で階層を出す方針)・アクセシビリティの各トークンの定義は、アプリ共通の一元管理先 [DESIGN.md](../DESIGN.md) を参照する(値をここに書き写すと二重管理になるため)。

### 画面構成
- 共通ヘッダー: パンくず(べんりやつーる › ボドゲのトリセツ › 一覧 › ゲーム名)、`LoginStatus`
- 上部: ゲーム名見出し+分類情報を1〜2行のチップ群で表示(`GameInfo`。値がある項目だけチップとして並べる)
- 分類情報の下: お気に入り登録・解除(ログイン中のみ、`FavoriteButton`)と、控えめな小さいテキストリンクの通報導線(`ReportButton`。目立たせない扱いをStitchで確定)を横並びに配置
- ルール本文: 「簡単版」「詳しい版」の2つのタブを画面中央で大きく強調(`RuleTabs`)。初期は簡単版。詳しい版は章見出し付き
- ページ下部: コメント欄(投稿フォーム+コメント一覧、`CommentSection`、[comment/design.md](../comment/design.md))
- 元写真は一切表示しない(requirements.md#表示対象-2)

## 状態管理
- 詳細画面(`detail/page.tsx`)は「取得したゲーム」「取得状態(読み込み中/表示中/該当なし/取得エラー)」「選択中のルールタブ(簡単版/詳しい版、初期=簡単版)」「ログインセッション(お気に入り・コメントの操作可否)」「このゲームのお気に入り登録状態(取得中・未ログイン・取得失敗時は未登録扱い)」をローカル状態として持つ
- コメント欄の状態は`CommentSection`が自身で持つ([comment/design.md](../comment/design.md))

## セキュリティ
- 取得は公開中(`deleted_at is null`)のゲームに限られ、削除済みは表示しない(RLSでも担保。requirements.md#表示対象-1)
- `photo_paths`は取得も表示もしない。加えて`anon`は列単位のSELECT権限から`photo_paths`が除外され直接読み取りもDBで拒否される(列秘匿のDB担保は[game-registration/design.md#データベース設計](../game-registration/design.md)を正とする)。元写真は詳細に一切出さない(requirements.md#表示対象-2)
- 分類情報・ルール本文は投稿者が修正しうる値だが、表示時にHTMLとして解釈しない形で描画する(`dangerouslySetInnerHTML`を使わない。[game-registration/design.md#セキュリティ](../game-registration/design.md)と同方針)。詳しい版の章本文も同様
- URLのクエリで受け取るゲームIDは、そのままパラメータ化した問い合わせに使い、文字列としてクエリに埋め込まない。不正なID形式は「見つかりません」で処理を終える

## ログ
- ゲーム取得が想定外に失敗した場合のみ、原因究明のためコンソールにエラーを出す(画面には定型のエラー表示)。通常閲覧・タブ切り替えではログを出さない

## 依存関係
- 表示する分類情報・ルール本文の内容は[game-registration/design.md](../game-registration/design.md)で登録される内容・共通章立てに従う
- お気に入りは[favorite/design.md](../favorite/design.md)、コメントは[comment/design.md](../comment/design.md)、通報は[report/design.md](../report/design.md)
- 一覧からの遷移元は[game-list/design.md](../game-list/design.md)(クエリ付きURLでリンク)
