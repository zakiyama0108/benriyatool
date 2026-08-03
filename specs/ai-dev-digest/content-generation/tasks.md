# タスク分解: 翻訳・要約・記事執筆のルール

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 導入文(teaser)の分量検証(仕様: requirements.md#要約-3、design.md「要約の分量を検証する処理」手順2)
  - 🔴 teaserの文字数が40字未満・140字超で`false`、40〜140字(境界値含む)で`true`になることを確認するテストを書く
  - 🟢 `app/ai-dev-digest/lib/summaryValidation.ts`に`TEASER_MIN_LENGTH`/`TEASER_MAX_LENGTH`/`isValidTeaserLength`を実装する

- Task 2: 詳細文(detail)合計の分量検証(仕様: requirements.md#要約-4、design.md「要約の分量を検証する処理」手順3)
  - 🔴 sectionsのdetail合計文字数が800字未満・1700字超で`false`、800〜1700字(境界値含む)で`true`になることを確認するテストを書く。あわせてsections配列が1件(2件未満)の場合、または各セクションのheading/teaser/detailが空文字の場合に不正となることを確認するテストを書く
  - 🟢 `app/ai-dev-digest/lib/summaryValidation.ts`に`DETAIL_TOTAL_MIN_LENGTH`/`DETAIL_TOTAL_MAX_LENGTH`/`isValidDetailLength(sections)`を実装する

- Task 3: 記事タイトルの導出(仕様: requirements.md#記事の構成-8、design.md「記事タイトルを導出する処理」)
  - 🔴 `2026-08-01`から`2026年8月1日のAIニュース`が生成されることを確認するテストを書く(日付フォーマットの境界: 1桁月日でゼロ埋めしないこと等)
  - 🟢 `app/ai-dev-digest/lib/articleTitle.ts`に`buildArticleTitle(date: string): string`を実装する

- Task 4: YouTube動画IDの抽出(仕様: requirements.md#著作権への配慮-6、design.md「YouTube動画IDを抽出する処理」)
  - 🔴 `youtube.com/watch?v=xxx`・`youtu.be/xxx`の両形式からIDを抽出できること、対応しない形式では`undefined`を返すことを確認するテストを書く
  - 🟢 `app/ai-dev-digest/lib/youtubeUrl.ts`に`extractYoutubeVideoId(url: string): string | undefined`を実装する

- Task 5: 記事スキーマへの分量検証の組み込み(仕様: article-detail/design.md「バリデーション」)
  - 🔴 `parseArticle`が、teaserが40〜140字の範囲外、またはdetail合計が800〜1700字の範囲外のトピックを含む記事データを拒否することを確認するテストを追加する(article-detailのTask 3のテストに追加する形でよい)
  - 🟢 `app/ai-dev-digest/lib/articleSchema.ts`から`isValidTeaserLength`/`isValidDetailLength`を呼び出す

- Task 6: 利用規約への条項追記(仕様: requirements.md#利用規約への反映-7)(TDD対象外。静的な文言追加のみのため)
  - `specs/legal/requirements.md`の知的財産の項目に、design.md「利用規約への反映」の条項を追記する(既存の条項があれば新しい文言に置き換える)
  - `app/legal/page.tsx`の「4. 知的財産」セクションに同じ条項本文を追記する(既存の条項があれば新しい文言に置き換える)

- Task 7: 要約生成CLIの実装(仕様: design.md「要約を書く処理」)(TDD対象外。Claude Code CLIのヘッドレス起動を伴い、プロンプトの組み立て自体に検証可能な決定的ロジックがないため。生成結果の分量検証はTask 1・2で担保する)
  - `scripts/ai-dev-digest/generate-content.ts`を実装する。1候補(発信者名・見出し・元URL・種別)ごとにdesign.md「要約を書く処理」のルール・ガードレール文言をプロンプトに含めてClaude Code CLI(`claude -p ... --output-format json`)をヘッドレス起動し、見出し・sections配列を生成するCLIにする(Claude Code CLI標準搭載のWebFetch/WebSearchツールで元記事・元動画の内容を参照させる。認証は環境変数`CLAUDE_CODE_OAUTH_TOKEN`から読む。2026-08第2次改定でAnthropic Messages API直接呼び出しから変更)
