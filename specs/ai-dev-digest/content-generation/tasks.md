# タスク分解: 翻訳・要約・記事執筆のルール

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 要約(sections合計)の分量検証(仕様: requirements.md#要約-2〜3、design.md「要約の分量を検証する処理」)
  - 🔴 sectionsのbody合計文字数が800字未満・1700字超で`false`、800〜1700字(境界値含む)で`true`になることを確認するテストを書く。あわせてsections配列が空、または各セクションのheading/bodyが空文字の場合に不正となることを確認するテストを書く
  - 🟢 `app/ai-dev-digest/lib/summaryValidation.ts`に`SUMMARY_TOTAL_MIN_LENGTH`/`SUMMARY_TOTAL_MAX_LENGTH`/`isValidSummaryLength(sections)`を実装する

- Task 2: 記事タイトルの導出(仕様: requirements.md#記事の構成-6、design.md「記事タイトルを導出する処理」)
  - 🔴 `2026-08-01`から`2026年8月1日のAIニュース`が生成されることを確認するテストを書く(日付フォーマットの境界: 1桁月日でゼロ埋めしないこと等)
  - 🟢 `app/ai-dev-digest/lib/articleTitle.ts`に`buildArticleTitle(date: string): string`を実装する

- Task 3: YouTube動画IDの抽出(仕様: requirements.md#著作権への配慮-5、design.md「YouTube動画IDを抽出する処理」)
  - 🔴 `youtube.com/watch?v=xxx`・`youtu.be/xxx`の両形式からIDを抽出できること、対応しない形式では`undefined`を返すことを確認するテストを書く
  - 🟢 `app/ai-dev-digest/lib/youtubeUrl.ts`に`extractYoutubeVideoId(url: string): string | undefined`を実装する

- Task 4: 記事スキーマへの要約分量検証の組み込み(仕様: article-detail/design.md「バリデーション」)
  - 🔴 `parseArticle`が、sections合計の文字数が800〜1700字の範囲外のトピックを含む記事データを拒否することを確認するテストを追加する(article-detailのTask 3のテストに追加する形でよい)
  - 🟢 `app/ai-dev-digest/lib/articleSchema.ts`から`isValidSummaryLength`を呼び出す

- Task 5: 利用規約への条項追記(仕様: requirements.md#利用規約への反映-6)(TDD対象外。静的な文言追加のみのため)
  - `specs/legal/requirements.md`の知的財産の項目に、design.md「利用規約への反映」の条項を追記する(既存の条項があれば新しい文言に置き換える)
  - `app/legal/page.tsx`の「4. 知的財産」セクションに同じ条項本文を追記する(既存の条項があれば新しい文言に置き換える)
