# 設計: 記事詳細ページ

## 前提: 記事データの形式(この機能が定義する共有スキーマ)

記事本文はDBではなく、ビルド時に取り込む静的コンテンツファイルとして管理する(`architecture.md#3-設計方針`)。この記事データの型・置き場所は本specで定義し、[article-list](../article-list/requirements.md)・[content-selection](../content-selection/requirements.md)・[content-generation](../content-generation/requirements.md)・[daily-publish](../daily-publish/requirements.md)・[watchlist-review](../watchlist-review/requirements.md)は共通してこの形式に従う。

- 格納場所: `content/ai-dev-digest/articles/<date>.json`(`<date>`は`YYYY-MM-DD`。URLの`[date]`と一致させる)
- 1ファイル=1日分の記事。日次のGitHub Actionsワークフロー([daily-publish](../daily-publish/requirements.md))がこのファイルを新規追加する
- なぜMarkdownでなくJSONか: トピックごとの見出し・要約・出典・情報源種別・基準未達フラグを構造化フィールドとして持つ必要があり、本文全体が地の文であるMarkdownより、フィールド単位で機械検証(バリデーション)しやすいJSONの方が、エージェントが生成する入力形式として事故が少ないと判断した(要件に形式指定はないため設計判断)

```ts
// app/ai-dev-digest/lib/types.ts
export type SourceType = 'official' | 'individual-youtube' | 'individual-blog' | 'qiita' | 'zenn'

// 【旧形式】要約の章立て1セクション分。2026-08以前に生成された既存記事データのみが使う
// (content-generation/requirements.md#著作権への配慮-9)。新規生成では使わない
export type SummarySection = {
  heading: string // セクション見出し
  teaser: string // 常時表示する導入文。60〜120字程度(目安)
  detail: string // 「詳細を見る」操作で展開表示する詳細文
}

// 【新形式】固定4観点1つ分(content-generation/requirements.md#要約-9〜12)
export type SummaryPerspective = {
  heading: string // 結論・メリット・変化を含む見出し(テーマ名にしない。requirements.md#要約-9)
  teaser: string // 常時表示する導入文。40〜140字(目安60〜120字。requirements.md#要約-3)
  detail: string // 「詳細を見る」操作で展開表示する詳細文(4観点合計800〜1700字。目安1000〜1500字。requirements.md#要約-4)
}

// 【新形式】固定4観点。この4キー・この順序で固定(requirements.md#要約-5・12)
export type TopicSummary = {
  benefit: SummaryPerspective // 🚀 自分にとって何が嬉しいか
  whatsNew: SummaryPerspective // 💡 何が新しいか
  how: SummaryPerspective // 🛠 どう実現しているか
  howToUse: SummaryPerspective // 🎯 自分はどう使えるか
}

export type Importance = 1 | 2 | 3 | 4 | 5 // 重要度(requirements.md#重要度-13〜14)

type TopicBase = {
  id: string // 記事内で一意。フィードバックの紐付けに使う(例: "topic-1")。表示順=配列順
  heading: string
  sourceType: SourceType
  sourceName: string // 発信者名(例: "Anthropic"、"Andrej Karpathy")
  sourceUrl: string // 出典の元URL
  sourcePublishedAt?: string // 元記事・動画のISO 8601形式の公開日時。content-selectionが収集したCandidate.publishedAtをそのまま引き継ぐ(エージェントが新たに調べ直す値ではない)。任意項目: 本フィールド導入前に生成された既存記事データには存在しないため、無い場合は投稿日時を表示しない(requirements.md#記事本文表示-11)
  youtubeVideoId?: string // YouTube動画を紹介する場合のみ。公式埋め込みプレーヤー表示に使う
  belowCriteria: boolean // 採用基準未達での掲載(content-selection/requirements.md#1日の掲載件数-10)
  belowCriteriaReason?: string // belowCriteriaがtrueの場合のみ必須。基準からの乖離内容(例: "いいね数18件(基準30件に12件不足)")
}

// 2026-08以前に生成された既存記事データ(可変長セクション・重要度なし)。無理な再生成・変換は行わない(requirements.md#記事本文表示-13)
export type LegacyTopic = TopicBase & {
  sections: SummarySection[] // 目安2〜4セクション、detail合計1000〜1500字程度
}

// 2026-08以降に生成される記事データ(固定4観点+重要度)
export type CurrentTopic = TopicBase & {
  summary: TopicSummary
  importance: Importance
}

export type Topic = LegacyTopic | CurrentTopic

export type Article = {
  date: string // YYYY-MM-DD。ファイル名と一致
  topics: Topic[] // 1〜5件(基準を満たす候補が不足する日は1〜2件になりうる。content-selection/requirements.md#1日の掲載件数-9〜10)
}

// TopicがLegacyTopic(2026-08以前生成)かどうかを判定する型ガード。`sections`キーの有無で判定する
// (CurrentTopicは`summary`キーを持ち`sections`キーを持たないため、互いに排他)
export function isLegacyTopic(topic: Topic): topic is LegacyTopic {
  return 'sections' in topic
}
```

要約を単一の`summary: string`ではなく構造化フィールドにしたのは、章立て(小見出し+導入文+詳細文)を画面側で機械的に描画するため。改行区切りのMarkdown的な単一文字列だと、見出し・導入文・詳細文の境界をパースする処理が別途必要になり事故が起きやすいため、JSONの構造自体で章立てと二段表示を表現する設計とした(要件に構造の指定はないため設計判断)。

2026-08、要約の構成を可変長`sections`配列から固定4観点`summary`(`TopicSummary`)に変更した際、`Topic`型を`LegacyTopic`/`CurrentTopic`のユニオン型にした。既存記事データ(8件、2026-08-03〜12生成)を無理に新形式へ変換・再生成しないという方針(requirements.md#記事本文表示-13)のもと、型のレベルで新旧2形式が同じ`Article.topics`配列に混在できることを表現するための設計判断である。共通フィールド(`id`/`heading`/`sourceType`等)を`TopicBase`に切り出し、要約部分(`sections` or `summary`+`importance`)のみを判別可能なユニオンにすることで、表示側([article-detail](.)・[article-list](../article-list/design.md))は`isLegacyTopic()`で1箇所だけ分岐すればよい構造にした。

記事タイトルはJSONに保存せず、`date`から`buildArticleTitle(date)`(content-generation/design.md参照)で常に導出する。タイトルをエージェントに毎回生成させると表現が揺れたり誇張表現に流れたりするリスクがあるため、日付から一意に決まる決定的な処理にする(content-generation/requirements.md#記事の構成-8、content-generation/requirements.md#エージェントの逸脱防止-8と対になる設計判断)。

## 処理フロー

### 記事データを読み込む処理
- 対象: `content/ai-dev-digest/articles/`配下のJSONファイル
- 手順:
  1. 指定された日付のファイル(`<date>.json`)を読み込む
  2. JSONとしてパースできない、またはスキーマ(下記バリデーション参照)を満たさない場合は例外を投げる
  3. 該当日のファイルが存在しない場合は「記事なし」を表す`null`を返す(例外にしない。存在しない日付へのアクセスは異常系ではなく通常のnot found扱いのため)
- 関連するビジネスルール: requirements.md#記事本文表示-1〜2

### その日の記事本文を表示する処理
- 対象: 読み込んだ記事データ
- 手順:
  1. `buildArticleTitle(date)`で導出した記事タイトル・公開日(`date`)を見出しとして表示する
  2. `topics`配列の順に、各トピックの見出し・出典(発信者名・タイトル代わりの見出しへのリンク・元URL)を表示する。`sourcePublishedAt`が存在する場合のみ、`YYYY年M月D日`形式(時刻は表示しない。ダイジェスト自体が日次更新のため、出典の時刻まで表示する必要性が薄く、`buildArticleTitle`の日付粒度と合わせた)に整形して併記する。存在しない場合(本フィールド導入前に生成された既存記事データ)は投稿日時の表示を省略する(requirements.md#記事本文表示-11)
  3. `isLegacyTopic(topic)`が`false`(2026-08以降生成、`CurrentTopic`)の場合、見出しの近くに重要度(`importance`、★1〜★5)を表示する。`true`(2026-08以前生成、`LegacyTopic`)の場合は重要度の表示を省略する(欠落をエラーにしない。requirements.md#記事本文表示-12)
  4. `isLegacyTopic(topic)`が`false`の場合、`summary`の`benefit`→`whatsNew`→`how`→`howToUse`の順(この順序で固定)に、各観点の見出し(`h3`相当)と導入文(`teaser`)を常時表示する。`true`の場合は`sections`配列の順に、セクション見出しと導入文を常時表示する(いずれも表示のロジック自体は同じで、参照するフィールドが異なるだけ。content-generation/requirements.md#要約-3・5)
  5. 各観点(またはセクション)の導入文の下に、HTML標準の`<details><summary>詳細を見る</summary>…</details>`要素を配置し、`<summary>`を操作すると詳細文(`detail`)が展開表示されるようにする。ブラウザ標準機能で開閉できるため、開閉状態を保持するJavaScriptの状態管理を自前で持つ必要がない(要件「操作前は導入文のみ、操作後に詳細文」に対応。requirements.md#記事本文表示-4)
  6. 各トピックには情報源の種別(公式組織/個人YouTube/個人ブログ/Qiita/Zenn)が分かるバッジを表示する(表示位置・文言は「画面設計」参照)
  7. `youtubeVideoId`を持つトピックは、要約の下にYouTube公式の埋め込みプレーヤー(`<iframe>`、`youtube-nocookie.com`ドメイン)を表示する(content-generation/requirements.md#著作権への配慮-6)。持たない場合は表示しない
  8. `belowCriteria`が`true`のトピックには「採用基準未達」バッジと`belowCriteriaReason`の内容を小さく添える。1件以上該当がある記事では、記事冒頭にも「この日は基準を満たす候補が少なかったため、一部のトピックは基準に届いていない内容を含みます」という注記を1回だけ表示する(繰り返し表示による煩雑さを避けるため)
- 関連するビジネスルール: requirements.md#記事本文表示-1〜5、requirements.md#記事本文表示-11〜13、requirements.md#表示分量・著作権配慮-1〜2

### ログイン状態に応じてフィードバック入力欄の表示を切り替える処理(2026-08修正)
- 対象: Supabase Authのログインセッション
- 手順:
  1. ページ表示時に現在のログインセッションを取得する(`app/lib/adminAuth.ts`の`getSession`)
  2. セッションが存在する(ログイン中)場合、運営者本人かどうかを`isAuthorizedAdmin()`(`admin_emails`テーブルのSELECT。RLSにより自分の行のみ返る)で確認する。許可対象と判定された場合のみ、各トピックの下にフィードバック入力欄を表示する。セッションが存在しない場合、または許可対象でない場合は何も表示しない
  3. 確認中は入力欄を表示しない(確認が終わるまで「未許可」として扱う)。確認自体が失敗した場合も、画面にエラーを出さず「未許可」として扱う(フィードバック欄は運営者向けの副次的な機能であり、失敗によって主機能である記事の閲覧を妨げたくないため。失敗はコンソールにのみ出力する。後述ログ参照)
  4. ログイン状態の変化(ログイン完了・ログアウト)を購読し(`onAuthChange`)、変化のたびに1〜3を再実行する
  5. 未ログイン状態では、ページ下部に小さくログインボタンを表示する(Googleでのログインを開始する導線。文言は運営者限定を示す表現を使わない。requirements.md#画面共通のログイン導線-16は[bookmark/requirements.md](../bookmark/requirements.md)参照)
- **DBの読み取り(SELECT)は`admin_emails`に対してのみ行う**。`ai_dev_digest_feedback`自体へのSELECTポリシーは追加しない(従来どおり)。2026-08修正: [bookmark](../bookmark/requirements.md)機能により記事詳細ページへのログインが読者全員に開放されたため、当初の「セッションの有無だけで表示を切り替える」設計では、運営者向けの気づきメモという目的に対して入力欄の表示対象が広すぎる状態になっていた。`isAuthorizedAdmin()`は元々管理画面向けに用意された関数だが、`admin_emails`テーブルのRLSは「自分のメール行だけ見える」設計(ADR-0006)のため、読者全員から呼び出されても他人のメール一覧が漏れることはない
- 関連するビジネスルール: requirements.md#運営者向けフィードバック-7、requirements.md#フィードバックの保存・権限-4

### フィードバックを送信する処理
- 対象: フィードバック入力欄に入力された自由記述コメント
- 手順:
  1. 入力内容をトリムした結果が空文字の場合、送信ボタンを無効化する(押下自体をできなくする)(requirements.md#運営者向けフィードバック-10)
  2. 送信ボタン押下時、対象トピックの記事日付(`date`)とトピック識別子(`topic.id`)、入力内容を1件のレコードとしてまとめる
  3. `ai_dev_digest_feedback`テーブルへの保存を試みる(ログイン中のセッションによる`authenticated`ロールでのINSERT)
  4. 保存に成功した場合、入力欄を空にし「送信しました」という完了表示を数秒間出す
  5. 保存に失敗した場合、入力内容は消さずに残し、「送信に失敗しました。もう一度お試しください」と表示する(既存の`saveResult`系は分析用ベストエフォートのため失敗を握りつぶすが、本機能は運営者が能動的に書いた自由記述であり、消えたことに気づけない方が不親切なため、この機能に限り失敗を可視化する設計とする)
- シーケンス図(俯瞰用。正は上記の手順の文章):

```mermaid
sequenceDiagram
    actor admin as 運営者(ログイン中)
    participant screen as 記事詳細ページ(ブラウザ)
    participant db as Supabase(ai_dev_digest_feedback)

    admin ->> screen: フィードバックを入力し送信
    screen ->> db: 記事日付・トピックID・コメントをINSERT
    alt 保存に成功
        db -->> screen: 保存完了
        screen ->> screen: 入力欄を空にし「送信しました」を表示
    else 保存に失敗
        db -->> screen: エラー
        screen ->> screen: 入力内容を残し「送信に失敗しました」を表示
    end
```
- 関連するビジネスルール: requirements.md#運営者向けフィードバック-8〜10、requirements.md#フィードバックの保存・権限-3、requirements.md#フィードバックの保存・権限-5

## バリデーション

記事データ(JSONファイル)のスキーマ検証:
- `date`: `YYYY-MM-DD`形式で、ファイル名と一致すること
- `topics`: 配列長が1件以上5件以下であること(content-selection/requirements.md#1日の掲載件数-9〜10。基準を満たす候補が不足する日は1〜2件になりうる)
- 各`topic`: `id`が記事内で重複しないこと、`heading`/`sourceName`/`sourceUrl`が空文字でないこと、`sourceUrl`が`http`または`https`で始まる絶対URLであること、`sourcePublishedAt`は任意項目だが指定する場合はISO 8601形式としてパース可能な日時文字列であること、`sourceType`が定義済み種別のいずれかであること、`belowCriteria`が`true`の場合は`belowCriteriaReason`が必須(false時は無くてよい)
- 各`topic`は`sections`キー(`LegacyTopic`)または`summary`+`importance`キー(`CurrentTopic`)のどちらか一方を持つこと。両方持つ・どちらも持たない場合は不正とする(2026-08追加。`isLegacyTopic`の判定と対になる制約)
- `sections`(`LegacyTopic`の場合。2026-08以前に生成された既存記事データの検証ルールとしてそのまま維持する): 配列長が**2件以上**であること(要件「複数のセクションに分けて構成する」により1件は不正)。各セクションの`heading`/`teaser`/`detail`が空文字でないこと。各セクションの`teaser`が40〜140字の範囲であること(目安60〜120字)。全セクションの`detail`を連結した文字数が800〜1700字の範囲であること(目安1000〜1500字)
- `summary`+`importance`(`CurrentTopic`の場合。2026-08以降): `summary`が`benefit`/`whatsNew`/`how`/`howToUse`の4キーをすべて持つこと。各観点の`heading`/`teaser`/`detail`が空文字でないこと。各観点の`teaser`が40〜140字の範囲であること(目安60〜120字。content-generation/requirements.md#要約-3)。4観点の`detail`を連結した文字数が800〜1700字の範囲であること(目安1000〜1500字。content-generation/requirements.md#要約-4)。`importance`が1〜5の整数であること(content-generation/requirements.md#重要度-13)
- 上記を満たさない場合は例外を投げる(下記エラーハンドリング参照)。フィードバック送信の入力内容自体(自由記述テキスト)は長さ・文字種の制限を設けないが、空文字または空白文字のみの場合は送信できない(トリムした結果が空文字になる入力を拒否する)(requirements.md#運営者向けフィードバック-10)

## エラーハンドリング

- 記事データのスキーマ違反は**ビルド時(`next build`)に例外として検知させ、ビルドを失敗させる**。これにより[daily-publish](../daily-publish/requirements.md)のCIチェック(`npm run build`を含む)が壊れたデータのPRを弾き、不正な記事が公開される事故を防ぐ(daily-publish/requirements.md#エラーハンドリング-5と対になる設計)
- フィードバック送信の失敗(通信エラー・RLS拒否等)は上記処理フロー4.のとおり画面に失敗を表示する。原因の種類による出し分けは行わない(自由記述の再送を促せれば十分なため)

## 関連するファイル(抜粋)

```
app/ai-dev-digest/lib/types.ts (新規: Article/Topic/SourceTypeの型定義)
app/ai-dev-digest/lib/articleTitle.ts (新規: content-generation/design.mdで定義するbuildArticleTitle。article-listのカード表示からも参照される)
app/ai-dev-digest/lib/articleSchema.ts (新規: JSONのバリデーション・パース処理。article-listのページネーションからも参照される)
app/ai-dev-digest/lib/articles.ts (新規: content/ai-dev-digest/articles/ を読み込むgetAllArticles/getArticleByDate。article-listと共有)
app/ai-dev-digest/lib/saveFeedback.ts (新規: フィードバック保存処理)
app/ai-dev-digest/[date]/page.tsx (新規: 記事詳細ページ、generateStaticParamsで全日付を列挙)
app/ai-dev-digest/components/TopicSection.tsx (新規。2026-08修正: isAdmin propを追加。bookmark仕様のBookmarkPanel表示も同ファイルに追加される。2026-08第2次修正: isLegacyTopicによるsummary/sections出し分け、ImportanceStars表示を追加)
app/ai-dev-digest/components/ImportanceStars.tsx (新規: 2026-08。重要度★1〜★5の表示)
app/ai-dev-digest/components/SourceBadge.tsx (新規)
app/ai-dev-digest/components/YoutubeEmbed.tsx (新規)
app/ai-dev-digest/components/FeedbackForm.tsx (新規)
app/lib/adminAuth.ts (既存: getSession/onAuthChange/signInWithGoogle/signOut/isAuthorizedAdminを利用。2026-08修正: isAuthorizedAdminはフィードバック欄の表示切り替えに利用する)
app/lib/supabaseClient.ts (既存の共通クライアントを利用)
content/ai-dev-digest/articles/*.json (新規: 記事本文データ。コード資産ではないためapp/配下に置かない)
```

## データベース設計

### ai_dev_digest_feedback(新規テーブル)
| カラム | 型 | 補足 |
|---|---|---|
| id | uuid | 共通カラム(docs/adr/0001)。DB側で自動採番 |
| created_at | timestamptz | 共通カラム。DB側で自動設定 |
| is_test | boolean, not null, default false | 共通カラム(docs/adr/0001)。開発環境またはURLに`?test=1`が付いている場合にtrue |
| article_date | date, not null | 対象記事の日付(`content/ai-dev-digest/articles/<date>.json`の`date`と一致) |
| topic_id | text, not null | 対象トピックの`Topic.id` |
| comment | text, not null | 自由記述のフィードバック内容 |

RLSはINSERT専用の最小権限パターン(docs/adr/0001)を踏襲するが、この入力欄はログイン中のみ表示されるため対象ロールは`anon`ではなく`authenticated`にする(2026-08-05修正: ログイン中のブラウザはSupabaseへ`authenticated`としてリクエストするため、`anon`へのGRANTでは常にINSERTが失敗していた):
- `authenticated`: INSERTのみ許可(docs/adr/0001のINSERT専用パターンを、ログイン中アプリ向けに`authenticated`ロールへ適用)
- `benriyatool_readonly`: SELECTのみ許可(docs/adr/0004)。[watchlist-review](../watchlist-review/requirements.md)の月次見直しがこのロールでフィードバックを読む
- 運営者専用SELECTポリシー(docs/adr/0006のテンプレート)は**追加しない**。フィードバック入力欄の表示切り替えは画面側のログイン状態判定のみで行い、DBの読み取り権限を必要としないため(architecture.md#12-セキュリティ)

```sql
create table ai_dev_digest_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  is_test boolean not null default false,
  article_date date not null,
  topic_id text not null,
  comment text not null
);

alter table ai_dev_digest_feedback enable row level security;

-- authenticatedはINSERTのみ許可(この入力欄はログイン中のみ表示されるため。2026-08-05修正)
grant insert on ai_dev_digest_feedback to authenticated;
create policy "authenticated can insert" on ai_dev_digest_feedback
  for insert to authenticated with check (true);

-- benriyatool_readonlyはSELECTのみ許可(docs/adr/0004。watchlist-reviewの月次見直しが読む)
grant select on ai_dev_digest_feedback to benriyatool_readonly;
create policy "benriyatool_readonly can select" on ai_dev_digest_feedback
  for select to benriyatool_readonly using (true);
```

実際のマイグレーションファイル作成・適用は[daily-publish](../daily-publish/tasks.md)ではなく本specのtasks.mdで行う(記事の読み書きより先にテーブルが必要なため)。

## 画面設計

- パンくず(べんりやつーる › AI駆動開発ダイジェスト › 記事タイトル)
- デスクトップ幅(md以上、768px)では本文の右側に目次(各トピック見出しへのアンカーリンク)を表示する。モバイル幅では本文がそのまま縦に並ぶため目次は表示しない(`ikukyu/guide`の`ArticleSidebar`(`specs/ikukyu/guide/design.md#PC版レイアウト`)と同じ構造・ブレークポイント・スタイルを踏襲する)
- 記事タイトル・公開日
- トピックごとのカード: 情報源種別バッジ、(2026-08以降生成のみ)重要度(★1〜★5)、見出し、要約(2026-08以降生成: 固定4観点🚀メリット/💡新規性/🛠仕組み/🎯活用法をこの順に常時表示。2026-08以前生成: 従来通りセクション見出し+導入文を2〜4セクション程度常時表示。いずれも各観点/セクションに「詳細を見る」の開閉操作を配置し、展開すると詳細文(合計1000〜1500字程度)が表示される)、出典(発信者名・元URLへのリンク、新規タブで開く。(該当時)投稿日時を併記)、(該当時)YouTube埋め込みプレーヤー、(該当時)「採用基準未達」バッジ+理由の小さな注記
- 基準未達トピックが1件以上ある場合、記事冒頭に注記文を1回表示
- 各トピックの下: 運営者本人がログイン中の場合のみフィードバック入力欄(テキストエリア+送信ボタン)を表示する(2026-08修正: 従来はログイン中の読者全員に表示していたが、[bookmark](../bookmark/requirements.md)によりログインが読者全員に開放されたため運営者本人限定に変更)。送信後は「送信しました」、失敗時は「送信に失敗しました。もう一度お試しください」を表示
- ページ下部: ログイン状態表示(2026-08修正: 未ログイン時のボタン文言は「ログイン」。運営者限定を示す表現は使わない。詳細は[bookmark/design.md](../bookmark/design.md)「画面設計」)。ログイン中はログイン中メールアドレス+ログアウトボタン(`life-money-sim`の`LoginStatus`と同じ表示)

## コンポーネント設計

| コンポーネント | Props | 役割 |
|---|---|---|
| TopicSection | `topic: Topic`, `session: Session \| null`, `isAdmin: boolean`, `articleDate: string`, `bookmark: { id: string; memo: string } \| null` | 1トピック分の表示+配下にFeedbackFormを`isAdmin`で条件付き表示(2026-08修正)。bookmark仕様のBookmarkPanelを`session`で条件付き表示し、`bookmark`をその`initialBookmark`propへそのまま渡す([bookmark/design.md](../bookmark/design.md)「コンポーネント設計」参照)。2026-08修正: `isLegacyTopic(topic)`で`summary`(固定4観点)/`sections`(旧形式)を出し分け、`CurrentTopic`の場合のみImportanceStarsを表示 |
| ImportanceStars | `importance: Importance` | 重要度(★1〜★5)をアイコン表示する(2026-08新規) |
| SourceBadge | `sourceType: SourceType` | 情報源種別を日本語ラベルのバッジで表示 |
| YoutubeEmbed | `videoId: string` | YouTube公式埋め込みプレーヤー(`youtube-nocookie.com`)を表示 |
| FeedbackForm | `articleDate: string`, `topicId: string` | 自由記述の入力欄・送信・送信結果表示 |

## 状態管理

- ログインセッション(`Session \| null`): ページのトップレベルコンポーネントで`useState`保持し、`TopicSection`にpropsで渡す(`life-money-sim/page.tsx`と同じ方式)
- 各`FeedbackForm`の送信状態(`idle`/`sending`/`sent`/`failed`)はコンポーネント内の`useState`で完結させる(トピックをまたいで共有しない)

## セキュリティ

- フィードバックの`comment`はエスケープせずそのままDBに保存する(表示・一覧化を一切行わないため、XSS等の表示起因のリスクは発生しない。requirements.md#スコープ外を参照)
- `article_date`・`topic_id`はブラウザから送信される値をそのまま信頼する。存在しない日付・トピックIDが送られても、フィードバックとして意味を持たないだけで実害はない(authenticatedロールでもINSERTのみで他データへの影響がないため、厳密なサーバー側検証は行わない)
- 記事データ(JSONファイル)は開発者・エージェントが作成しリポジトリにコミットされるコンテンツであり、訪問者からの入力ではないため、XSS対策としてのサニタイズは不要(通常のReactレンダリングでエスケープされる)。ただし`sourceUrl`は`http`/`https`のみを許可し(バリデーション参照)、`javascript:`等のスキームを含むリンクが生成されないようにする
- 2026-08修正: フィードバック入力欄の表示切り替えに`isAuthorizedAdmin()`(`admin_emails`のSELECT)を使うようになったが、同テーブルのRLSは「自分のメール行だけ見える」設計(ADR-0006)のため、読者全員が呼び出せるようになっても他人のメールアドレス一覧が漏れることはない。運営者の許可リスト自体を変更するものではない

## ログ

- フィードバックの保存成功・失敗はコンソール等へのログ出力を行わない(既存の`saveResult`系と同じ方針。静的配信でサーバーを持たずコンソールログを運営者が収集できないため)
- 2026-08修正: `isAuthorizedAdmin()`の確認自体が失敗した場合は、ブラウザのコンソールにエラー内容を出す(画面には伝えず「未許可」として扱う。原因究明用)
- 記事データのスキーマ違反はビルド時に例外としてCIのログに出力される(`next build`の標準エラー出力。エラーハンドリング参照)
