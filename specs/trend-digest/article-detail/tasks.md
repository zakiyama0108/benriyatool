# タスク分解: 記事詳細ページ

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## データ基盤

- Task 1: `trend_digest_feedback`テーブルのマイグレーション(design.md「データベース設計」のSQL、適用基盤: docs/adr/0003)
  - `supabase/migrations/<timestamp>_create_trend_digest_feedback.sql`を作成する(テーブル作成+authenticated INSERT専用ポリシー+benriyatool_readonly SELECT専用ポリシー)
  - マイグレーションファイル単独のPRとしてマージし、`deploy.yml`のmigrateジョブが成功したことを確認する
  - 以降のタスク(フィードバック保存の実装・動作確認)より前に適用が完了していることを確認する

- Task 2: 記事データの型定義(仕様: design.md「前提: 記事データの形式」)
  - 🔴 `GENRE_LABELS`が`GENRE_ORDER`の全ジャンル(19件、entertainment 9件+culture-lifestyle 10件)を過不足なくカバーしていること、`DURATION_LABELS`が継続度ラベルの全4段階を、`HEAT_LABELS`が注目度ラベルの全3段階を過不足なくカバーしていることを確認するテストを書く。他の型自体はTask 3のバリデーションテストから間接的に検証する
  - 🟢 `app/trend-digest/lib/types.ts`に`Edition`/`Genre`/`GENRE_ORDER`/`GENRE_LABELS`/`DURATION_LABELS`/`HEAT_LABELS`/`TopicTrend`/`Topic`/`Article`を定義する(`Genre`に`dev-trends`、`GENRE_ORDER['culture-lifestyle']`の末尾に`dev-trends`を追加する)。`TREND_STATUS_LABELS`は旧来の7段階の判定を廃止したため削除する

- Task 3: 記事データのバリデーション(仕様: design.md「バリデーション」)
  - 🔴 正常な記事データが検証を通ること、`topics`が0件で失敗すること、その編のジャンル数を超える件数で失敗すること、同一ジャンルのトピックが2件以上で失敗すること、`genre`が未定義値で失敗すること、`genre`は定義済みジャンルだが`article.edition`に対応するジャンル(`GENRE_ORDER[edition]`)に属さない場合(例: `edition: 'entertainment'`に`genre: 'gourmet'`)に失敗すること、`id`とファイル名不一致で失敗すること、`edition`が不正値で失敗すること、`sourceUrl`が`http`/`https`で始まらない場合に失敗すること、`heading`/`body`/`sourceTitle`/`sourceName`/`sourceUrl`が空文字で失敗することを確認するテストを書く
  - 🔴 **全ジャンルが網羅されていることの検証のテストを書く**: `topics`のジャンルと`unavailableGenres`を合わせて`GENRE_ORDER[edition]`と一致する記事が検証を通ること、どちらにも現れないジャンルがある記事で失敗すること、`unavailableGenres`に`topics`と重複するジャンル・その編に属さないジャンル・重複した要素がある場合に失敗すること、`unavailableGenres`を持たない過去の記事は網羅の検証をせずに通ること(この機能より前に公開した記事のため)
  - 🔴 `trend`がないトピックが検証を通ること(この機能より前に公開した記事のため)、`durationLabel`/`heatLabel`が定義外の値で失敗すること、`continuationDays`が負数で失敗すること、`continuationStartDate`が`YYYY-MM-DD`形式でない場合と記事の`date`より後の場合に失敗すること、`reportCount`が0以下で失敗すること、**`durationLabel`が`pre-trend`のトピックも検証を通ること**(各ジャンル1件を掲載する仕様のため「流行前」が記事に載りうることの回帰テスト)を確認するテストを書く
  - 🟢 `app/trend-digest/lib/articleSchema.ts`に`parseArticle(raw: unknown, filename: string): Article`を実装する(違反時は例外を投げる)
  - 🔵 エラーメッセージに違反内容(どのフィールドか)を含めて分かりやすくする

- Task 4: 記事データの読み込み(仕様: requirements.md#記事本文表示-1〜2)
  - 🔴 フィクスチャ用ディレクトリ(`__tests__`配下にテスト用JSONを配置)を対象に、`getArticleById`が該当IDを返すこと・存在しないIDは`null`を返すこと・不正なJSONを含むディレクトリでは例外が伝播することを確認するテストを書く
  - 🟢 `app/trend-digest/lib/articles.ts`に`getAllArticles(dir?)`/`getArticleById(id, dir?)`を実装する(`dir`省略時は`content/trend-digest/articles/`)

## 記事表示

- Task 5: ジャンル見出し+トピックカードの表示(仕様: requirements.md#記事本文表示-2〜4、requirements.md#継続度・注目度の表示-17)
  - 🔴 その編の全ジャンルが`GENRE_ORDER`の順で見出し表示されること、ジャンル見出しの文言が`GENRE_LABELS`の日本語ラベルと一致すること、各トピックの見出し・本文・出典(発信者名・元URLリンク、新規タブで開く`target="_blank"`)が表示されることを確認するテストを書く
  - 🔴 **話題を取得できなかったジャンルのテストを書く**: `unavailableGenres`に含まれるジャンルも見出しが表示されること、その下に取得できなかった旨が表示されること、トピックカードが描画されないこと、見出しだけが残る状態にならないこと
  - 🟢 `app/trend-digest/components/GenreSection.tsx`・`app/trend-digest/components/TopicCard.tsx`を実装する

- Task 6: 継続度・注目度の表示(仕様: requirements.md#継続度・注目度の表示-10〜16・-18、requirements.md#継続度・注目度の表示の扱い-6〜8、design.md「画面設計」「コンポーネント設計」)
  - 🔴 `trend`があるトピックに継続度ラベルのバッジと注目度ラベルのバッジが**両方**表示され、それぞれ`DURATION_LABELS`(流行前/注目され始め/話題/非常に話題)・`HEAT_LABELS`(注目度 高い/普通/低い)の日本語ラベルが含まれること、英語の識別子が画面に出ないこと、`trend`がないトピックにはバッジもトレンド情報の行も表示されないことを確認するテストを書く
  - 🔴 **「流行前」の表記のテストを書く**: `durationLabel`が`pre-trend`のとき、半月以上続いている話題という目安に達していないことが分かる文言が表示されること(requirements.md#継続度・注目度の表示-11)
  - 🔴 **2つのバッジが見分けられることのテストを書く**: 継続度ラベルのバッジと注目度ラベルのバッジに異なるスタイルの系統が当たること(requirements.md#継続度・注目度の表示の扱い-8)
  - 🔴 トレンド情報の行に継続期間が表示されること、`reportCount`が1のときは報告回数が表示されず2以上のときだけ表示されること、`originRegion`が`null`のときは発祥地域の項目ごと表示されないこと(「不明」という文字列を出さないこと)、`currentRegions`が空配列のときは主な流行地域の項目ごと表示されないことを確認するテストを書く
  - 🟢 `app/trend-digest/components/DurationBadge.tsx`・`app/trend-digest/components/HeatBadge.tsx`・`app/trend-digest/components/TrendMeta.tsx`を実装し、`TopicCard`から`topic.trend`がある場合のみ描画する
  - 🔵 継続度のバッジは段階が進むほど濃くなる暖色系、注目度のバッジは寒色系の枠線主体をTailwindの既存パレットから選び、色だけに意味を持たせない(文字ラベルを必ず併記する)

- Task 7: styleguideページへの追加(仕様: design.md「画面設計」、[/implementation](../../../.claude/skills/implementation/SKILL.md)の共通部品の運用)
  - `app/trend-digest/styleguide/page.tsx`に継続度ラベルのバッジの全4段階・注目度ラベルのバッジの全3段階と、トレンド情報の行(地域あり・地域なし・初掲載・続報)、話題を取得できなかったジャンルの表示を並べる
  - 同じコミットで`app/trend-digest/styleguide/styleguide.png`を撮り直す

## フィードバック機能

- Task 8: フィードバック保存処理(仕様: requirements.md#運営者向けフィードバック-7、requirements.md#フィードバックの保存・権限-3)
  - 🔴 Supabaseクライアントをモックし、`article_id`・`topic_id`・`comment`・`is_test`が正しいカラム名でinsertされることを確認するテストを書く(成功/失敗の両方で戻り値が正しいことも確認)
  - 🟢 `app/trend-digest/lib/saveFeedback.ts`に`saveFeedback`を実装する(`isTestData`判定を含む。ロジックは`ai-dev-digest/lib/saveFeedback.ts`のテストデータ判定を踏襲)

- Task 9: フィードバック入力欄(仕様: requirements.md#運営者向けフィードバック-8〜9、design.md「フィードバックを送信する処理」)
  - 🔴 送信成功時に入力欄が空になり「送信しました」が表示されること、失敗時に入力内容が残り「送信に失敗しました。もう一度お試しください」が表示されること、入力欄が空文字または空白文字のみの場合は送信ボタンが無効化され送信されないことを確認するテストを書く
  - 🟢 `app/trend-digest/components/FeedbackForm.tsx`を実装する

- Task 10: ログイン状態によるフィードバック入力欄の表示切り替え(仕様: requirements.md#運営者向けフィードバック-6、design.md「ログイン状態に応じてフィードバック入力欄の表示を切り替える処理」)
  - 🔴 セッションがあっても`isAuthorizedAdmin()`が`false`を返す場合はFeedbackFormが描画されないこと、`true`を返す場合のみ描画されること、セッションがない場合は`isAuthorizedAdmin()`自体が呼び出されないこと、`isAuthorizedAdmin()`が例外を投げた場合はFeedbackFormを描画せずコンソールにエラーを出力することを確認するテストを書く
  - 🟢 `TopicCard`に`isAdmin: boolean`propを追加し、`{isAdmin && <FeedbackForm .../>}`にする。ページ本体にセッション確立後`isAuthorizedAdmin()`を呼び出す処理を追加し、結果を`isAdmin`として`GenreSection`経由で`TopicCard`へ渡す(失敗時は`false`のまま維持しコンソールにエラー出力)。話題を取得できなかったジャンルにはトピックがないためフィードバック入力欄も出さない

## ページ組み立て

- Task 11: 記事詳細ページ(仕様: requirements.md#記事本文表示-1、design.md「関連するファイル」)
  - `app/trend-digest/[id]/page.tsx`を実装する。`generateStaticParams`で`getAllArticles()`の全IDを列挙し、`getArticleById`で本文を取得して`GenreSection`を並べる
  - ページ下部にログイン状態表示を配置し、`getSession`/`onAuthChange`/`signInWithGoogle`/`signOut`を配線する
  - page.tsx自体はNext.jsのルーティング用ファイルのためカバレッジ計測対象外(vitest.config.mtsの既存除外設定に従う)。新規テストは追加せず、Task 4〜10のユニットテストで担保する
