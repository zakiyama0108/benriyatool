# 設計: 記事詳細ページ

## サマリ
その回の記事本文を、対象9ジャンルのうち動きがあったジャンルだけを見出しとして、トピック(最大2件/ジャンル)・本文・出典をジャンル見出しの下に表示する。運営者本人がログイン中の場合のみ、各トピック下にフィードバック入力欄を表示し、`trend_digest_feedback`テーブルへINSERT専用で保存する(ai-dev-digestと同じ`authenticated`ロールのINSERT専用パターン)。記事データの型・置き場所は本specが定義し、他specが共通して従う(下記「前提: 記事データの形式」)。UI方針は「画面設計」参照(Step0は簡易実施)。

## 前提: 記事データの形式(この機能が定義する共有スキーマ)

記事本文はDBではなく、ビルド時に取り込む静的コンテンツファイルとして管理する(architecture.md#3-設計方針)。この記事データの型・置き場所は本specで定義し、[article-list](../article-list/requirements.md)・[content-selection](../content-selection/requirements.md)・[content-generation](../content-generation/requirements.md)・[weekly-publish](../weekly-publish/requirements.md)・[line-broadcast](../line-broadcast/requirements.md)・[source-review](../source-review/requirements.md)は共通してこの形式に従う。

- 格納場所: `content/trend-digest/articles/<id>.json`(`<id>`は`<date>-<edition>`。例: `2026-09-15-entertainment`、`2026-09-18-culture-lifestyle`。`<date>`は発行日`YYYY-MM-DD`。URLの`[id]`と一致させる)【推測】
- 1ファイル=1回分の記事(エンタメ編・カルチャー編それぞれ週1ファイル、合計週2ファイル)。週次のGitHub Actionsワークフロー([weekly-publish](../weekly-publish/requirements.md))がこのファイルを新規追加する
- なぜMarkdownでなくJSONか: ジャンルごとのトピック(見出し・本文・出典・原題)を構造化フィールドとして持つ必要があり、本文全体が地の文であるMarkdownより、フィールド単位で機械検証(バリデーション)しやすいJSONの方が、エージェントが生成する入力形式として事故が少ないと判断した(要件に形式指定はないため設計判断。ai-dev-digestと同じ考え方)

```ts
// app/trend-digest/lib/types.ts
export type Edition = 'entertainment' | 'culture-lifestyle'

export type Genre =
  | 'music' | 'japanese-movie' | 'foreign-movie' | 'japanese-drama' | 'foreign-drama'
  | 'anime' | 'variety' | 'streaming-video' | 'books-comics'
  | 'sns-buzz' | 'buzzwords' | 'gourmet' | 'hobby' | 'fashion'
  | 'gadgets' | 'games' | 'travel' | 'economy-money'

// ジャンルの表示順・日本語ラベル(edition内の見出し表示順として使う。requirements.md#グループとジャンル)
export const GENRE_ORDER: Record<Edition, Genre[]> = {
  entertainment: ['music', 'japanese-movie', 'foreign-movie', 'japanese-drama', 'foreign-drama', 'anime', 'variety', 'streaming-video', 'books-comics'],
  'culture-lifestyle': ['sns-buzz', 'buzzwords', 'gourmet', 'hobby', 'fashion', 'gadgets', 'games', 'travel', 'economy-money'],
}

export type Topic = {
  id: string // 記事内で一意。フィードバックの紐付けに使う(例: "topic-1")
  genre: Genre
  heading: string // content-generationが生成する見出し
  body: string // content-generationが生成する本文(160〜480字、目安200〜400字)
  sourceTitle: string // 対象作品・話題の原題(content-selectionのCandidate.titleをそのまま引き継ぐ。掲載済み話題の再掲抑制の突合キーとして使う。表示はしない)
  sourceName: string // 出典の情報源名
  sourceUrl: string // 出典の元URL
}

export type Article = {
  id: string // ファイル名と一致
  edition: Edition
  date: string // YYYY-MM-DD。発行日
  topics: Topic[] // ジャンルの定義順(GENRE_ORDER)に並ぶ。1〜10件
}
```

記事タイトルはJSONに保存せず、`edition`・`date`から常に`buildArticleTitle(edition, date)`(content-generation/design.md参照)で導出する(タイトルをエージェントに毎回生成させると表現が揺れたり誇張表現に流れたりするリスクがあるため。content-generation/requirements.md#記事の構成-6・#エージェントの逸脱防止-5と対になる設計判断)。

## 処理フロー

### 記事データを読み込む処理
- 対象: `content/trend-digest/articles/`配下のJSONファイル
- 手順:
  1. 指定されたIDのファイル(`<id>.json`)を読み込む
  2. JSONとしてパースできない、またはスキーマ(下記バリデーション参照)を満たさない場合は例外を投げる
  3. 該当IDのファイルが存在しない場合は「記事なし」を表す`null`を返す(例外にしない)
- 関連するビジネスルール: requirements.md#記事本文表示-1〜2

### その回の記事本文を表示する処理
- 対象: 読み込んだ記事データ
- 手順:
  1. `buildArticleTitle(edition, date)`で導出した記事タイトル・公開日(`date`)を見出しとして表示する
  2. `GENRE_ORDER[edition]`の順に、`topics`に該当ジャンルのトピックが1件以上あるジャンルだけを見出しとして表示する(動きがなかったジャンルは見出し自体を表示しない。requirements.md#記事本文表示-2)
  3. 各ジャンル見出しの下に、そのジャンルの`topics`(最大2件)を、見出し・本文・出典(情報源名・元URLへのリンク、新規タブで開く)とセットで表示する(requirements.md#記事本文表示-3)
  4. 全ジャンル合計で最大10件のトピックを表示する(content-selectionの絞り込みにより`topics`配列自体が既に10件以内のため、追加の絞り込みは行わない。requirements.md#記事本文表示-4)
- 関連するビジネスルール: requirements.md#記事本文表示-1〜4

### ログイン状態に応じてフィードバック入力欄の表示を切り替える処理
- 対象: Supabase Authのログインセッション
- 手順:
  1. ページ表示時に現在のログインセッションを取得する(`app/lib/adminAuth.ts`の`getSession`)
  2. セッションが存在する(ログイン中)場合、運営者本人かどうかを`isAuthorizedAdmin()`(`admin_emails`テーブルのSELECT。RLSにより自分の行のみ返る)で確認する。許可対象と判定された場合のみ、各トピックの下にフィードバック入力欄を表示する。セッションが存在しない場合、または許可対象でない場合は何も表示しない(requirements.md#運営者向けフィードバック-6)
  3. 確認中は入力欄を表示しない(確認が終わるまで「未許可」として扱う)。確認自体が失敗した場合も、画面にエラーを出さず「未許可」として扱う(フィードバック欄は運営者向けの副次的な機能であり、失敗によって主機能である記事の閲覧を妨げたくないため。失敗はコンソールにのみ出力する)
  4. ログイン状態の変化(ログイン完了・ログアウト)を購読し(`onAuthChange`)、変化のたびに1〜3を再実行する
- **DBの読み取り(SELECT)は`admin_emails`に対してのみ行う**。`trend_digest_feedback`自体へのSELECTポリシーは、`benriyatool_readonly`向け([ADR-0004](../../../docs/adr/0004-agent-readonly-db-access.md))以外は追加しない
- 関連するビジネスルール: requirements.md#運営者向けフィードバック-6、requirements.md#フィードバックの保存・権限-4

### フィードバックを送信する処理
- 対象: フィードバック入力欄に入力された自由記述コメント
- 手順:
  1. 入力内容をトリムした結果が空文字の場合、送信ボタンを無効化する(押下自体をできなくする)(requirements.md#運営者向けフィードバック-9)
  2. 送信ボタン押下時、対象トピックの記事ID(`article.id`)とトピック識別子(`topic.id`)、入力内容を1件のレコードとしてまとめる
  3. `trend_digest_feedback`テーブルへの保存を試みる(ログイン中のセッションによる`authenticated`ロールでのINSERT)
  4. 保存に成功した場合、入力欄を空にし「送信しました」という完了表示を数秒間出す(requirements.md#運営者向けフィードバック-8)
  5. 保存に失敗した場合、入力内容は消さずに残し、「送信に失敗しました。もう一度お試しください」と表示する(運営者が能動的に書いた自由記述であり、消えたことに気づけない方が不親切なため、この機能に限り失敗を可視化する。ai-dev-digestと同じ考え方)
- シーケンス図(俯瞰用。正は上記の手順の文章):

```mermaid
sequenceDiagram
    actor admin as 運営者(ログイン中)
    participant screen as 記事詳細ページ(ブラウザ)
    participant db as Supabase(trend_digest_feedback)

    admin ->> screen: フィードバックを入力し送信
    screen ->> db: 記事ID・トピックID・コメントをINSERT
    alt 保存に成功
        db -->> screen: 保存完了
        screen ->> screen: 入力欄を空にし「送信しました」を表示
    else 保存に失敗
        db -->> screen: エラー
        screen ->> screen: 入力内容を残し「送信に失敗しました」を表示
    end
```
- 関連するビジネスルール: requirements.md#運営者向けフィードバック-7〜9、requirements.md#フィードバックの保存・権限-3

## バリデーション

記事データ(JSONファイル)のスキーマ検証:
- `id`: ファイル名と一致すること。`<date>-<edition>`の形式であること
- `edition`: `entertainment`または`culture-lifestyle`であること
- `date`: `YYYY-MM-DD`形式であること
- `topics`: 配列長が1件以上10件以下であること(content-selection/requirements.md#機能要件-5)
- 各`topic`: `id`が記事内で重複しないこと、`genre`が定義済みジャンルのいずれかであること、かつ`article.edition`に対応する9ジャンル(`GENRE_ORDER[article.edition]`)に含まれること(エンタメ編の記事にカルチャー編のジャンルが混入するような不整合をビルド時に検知するため)、`heading`/`body`/`sourceTitle`/`sourceName`/`sourceUrl`が空文字でないこと、`sourceUrl`が`http`または`https`で始まる絶対URLであること、同一ジャンルのトピックが3件以上存在しないこと(content-selection/requirements.md#機能要件-4)
- `body`の文字数が160〜480字の範囲であること(content-generation/requirements.md#要約-2、content-generation/design.md「本文の分量を検証する処理」)
- 上記を満たさない場合は例外を投げる(下記エラーハンドリング参照)。フィードバック送信の入力内容自体(自由記述テキスト)は長さ・文字種の制限を設けないが、空文字または空白文字のみの場合は送信できない(requirements.md#運営者向けフィードバック-9)

## エラーハンドリング

- 記事データのスキーマ違反は**ビルド時(`next build`)に例外として検知させ、ビルドを失敗させる**。これにより[weekly-publish](../weekly-publish/requirements.md)のCIチェック(`npm run build`を含む)が壊れたデータのPRを弾き、不正な記事が公開される事故を防ぐ
- フィードバック送信の失敗(通信エラー・RLS拒否等)は上記処理フロー「フィードバックを送信する処理」手順5のとおり画面に失敗を表示する。原因の種類による出し分けは行わない

## 関連するファイル(抜粋)

```
app/trend-digest/lib/types.ts (新規: Edition/Genre/GENRE_ORDER/Topic/Articleの型定義)
app/trend-digest/lib/articleTitle.ts (content-generationで新規作成: buildArticleTitleを利用)
app/trend-digest/lib/articleSchema.ts (新規: JSONのバリデーション・パース処理。article-listのページネーションからも参照される)
app/trend-digest/lib/articles.ts (新規: content/trend-digest/articles/ を読み込むgetAllArticles/getArticleById。article-listと共有)
app/trend-digest/lib/saveFeedback.ts (新規: フィードバック保存処理)
app/trend-digest/[id]/page.tsx (新規: 記事詳細ページ、generateStaticParamsで全IDを列挙)
app/trend-digest/components/GenreSection.tsx (新規: ジャンル見出し+配下トピックの表示)
app/trend-digest/components/TopicCard.tsx (新規: 1トピック分の表示+FeedbackFormの条件付き表示)
app/trend-digest/components/FeedbackForm.tsx (新規)
app/lib/adminAuth.ts (既存: getSession/onAuthChange/signInWithGoogle/signOut/isAuthorizedAdminを利用)
app/lib/supabaseClient.ts (既存の共通クライアントを利用)
content/trend-digest/articles/*.json (新規: 記事本文データ。コード資産ではないためapp/配下に置かない)
```

## データベース設計

### trend_digest_feedback(新規テーブル)
| カラム | 型 | 補足 |
|---|---|---|
| id | uuid | 共通カラム(docs/adr/0001)。DB側で自動採番 |
| created_at | timestamptz | 共通カラム。DB側で自動設定 |
| is_test | boolean, not null, default false | 共通カラム(docs/adr/0001)。開発環境またはURLに`?test=1`が付いている場合にtrue |
| article_id | text, not null | 対象記事の`Article.id`(`content/trend-digest/articles/<id>.json`のid) |
| topic_id | text, not null | 対象トピックの`Topic.id` |
| comment | text, not null | 自由記述のフィードバック内容 |

RLSはINSERT専用の最小権限パターン(docs/adr/0001)を踏襲する。この入力欄はログイン中のみ表示されるため対象ロールは`authenticated`にする(ai-dev-digestの`ai_dev_digest_feedback`と同じ方針。当初から`authenticated`ロールで作成し、ai-dev-digestで発生した`anon`向けの誤設定は繰り返さない):
- `authenticated`: INSERTのみ許可
- `benriyatool_readonly`: SELECTのみ許可([ADR-0004](../../../docs/adr/0004-agent-readonly-db-access.md))。[source-review](../source-review/requirements.md)の月次見直しがこのロールでフィードバックを読む
- 運営者専用SELECTポリシー([ADR-0006](../../../docs/adr/0006-admin-screen-oidc-rls.md)のテンプレート)は追加しない。フィードバック入力欄の表示切り替えは画面側のログイン状態判定のみで行い、DBの読み取り権限を必要としないため(architecture.md#12-セキュリティ)

```sql
create table trend_digest_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  is_test boolean not null default false,
  article_id text not null,
  topic_id text not null,
  comment text not null
);

alter table trend_digest_feedback enable row level security;

-- authenticatedはINSERTのみ許可(この入力欄はログイン中のみ表示されるため)
grant insert on trend_digest_feedback to authenticated;
create policy "authenticated can insert" on trend_digest_feedback
  for insert to authenticated with check (true);

-- benriyatool_readonlyはSELECTのみ許可(ADR-0004。source-reviewの月次見直しが読む)
grant select on trend_digest_feedback to benriyatool_readonly;
create policy "benriyatool_readonly can select" on trend_digest_feedback
  for select to benriyatool_readonly using (true);
```

## 画面設計

Step0: 簡易実施(既存ai-dev-digestの`app/ai-dev-digest/[date]/page.tsx`の配色・レイアウトパターンを踏襲し、最終的な見た目の確定はautopilotの画面レビュー(実装後のlocalhost確認)で行う)。ジャンル見出しで区切るレイアウトはrequirements.mdで確定済み([article-list/requirements.md](../article-list/requirements.md)と対になる方針)。既存画面からの見分けが付くよう、アクセントカラーのみトレンド系トピックらしい配色(暖色系。例: アンバー/オレンジ系のアクセント)に変更する。具体的な色コードは実装時にTailwindの既存パレットから選ぶ【推測】。

- パンくず(べんりやつーる › 週刊トレンド › 記事タイトル)
- 記事タイトル(`buildArticleTitle(edition, date)`)・公開日
- ジャンル見出し(動きがあったジャンルのみ、GENRE_ORDER順)+配下にそのジャンルのトピックカード(最大2件): 見出し、本文、出典(情報源名・元URLへのリンク、新規タブで開く)
- 各トピックの下: 運営者本人がログイン中の場合のみフィードバック入力欄(テキストエリア+送信ボタン)を表示する。送信後は「送信しました」、失敗時は「送信に失敗しました。もう一度お試しください」を表示
- ページ下部: ログイン状態表示(未ログイン時は「ログイン」ボタン。ログイン中はメールアドレス+ログアウトボタン、`ai-dev-digest`の表示パターンと同じ)

## コンポーネント設計

| コンポーネント | Props | 役割 |
|---|---|---|
| GenreSection | `genre: Genre`, `topics: Topic[]`, `session: Session \| null`, `isAdmin: boolean`, `articleId: string` | 1ジャンル分の見出し+配下トピックカードの表示 |
| TopicCard | `topic: Topic`, `isAdmin: boolean`, `articleId: string` | 1トピック分の表示+配下にFeedbackFormを`isAdmin`で条件付き表示 |
| FeedbackForm | `articleId: string`, `topicId: string` | 自由記述の入力欄・送信・送信結果表示 |

## 状態管理

- ログインセッション(`Session \| null`): ページのトップレベルコンポーネントで`useState`保持し、`GenreSection`にpropsで渡す
- 各`FeedbackForm`の送信状態(`idle`/`sending`/`sent`/`failed`)はコンポーネント内の`useState`で完結させる(トピックをまたいで共有しない)

## セキュリティ

- フィードバックの`comment`はエスケープせずそのままDBに保存する(表示・一覧化を一切行わないため、XSS等の表示起因のリスクは発生しない。requirements.md#スコープ外を参照)
- `article_id`・`topic_id`はブラウザから送信される値をそのまま信頼する。存在しない記事ID・トピックIDが送られても、フィードバックとして意味を持たないだけで実害はない(authenticatedロールでもINSERTのみで他データへの影響がないため、厳密なサーバー側検証は行わない)
- 記事データ(JSONファイル)は開発者・エージェントが作成しリポジトリにコミットされるコンテンツであり、訪問者からの入力ではないため、XSS対策としてのサニタイズは不要(通常のReactレンダリングでエスケープされる)。ただし`sourceUrl`は`http`/`https`のみを許可し(バリデーション参照)、`javascript:`等のスキームを含むリンクが生成されないようにする
- `isAuthorizedAdmin()`(`admin_emails`のSELECT)は同テーブルのRLS(「自分のメール行だけ見える」設計、ADR-0006)により、読者全員が呼び出しても他人のメールアドレス一覧が漏れることはない

## ログ

- フィードバックの保存成功・失敗はコンソール等へのログ出力を行わない(静的配信でサーバーを持たずコンソールログを運営者が収集できないため、ai-dev-digestと同じ方針)
- `isAuthorizedAdmin()`の確認自体が失敗した場合は、ブラウザのコンソールにエラー内容を出す(画面には伝えず「未許可」として扱う。原因究明用)
- 記事データのスキーマ違反はビルド時に例外としてCIのログに出力される(`next build`の標準エラー出力)
