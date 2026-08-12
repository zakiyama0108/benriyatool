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

- Task 8: 生成応答の分類(仕様: design.md「要約を書く処理」手順8・「エラーハンドリング」、daily-publish/design.md「エラーハンドリング」)
  - 🔴 Claude Code CLIの応答(`--output-format json`のパース済みオブジェクト)を「成功(見出し+2件以上の非空sections)」「一時的な失敗(JSON抽出不可・空sections・空文字sectionを含む)」「利用枠の枯渇(`is_error`かつ`api_error_status===429`、または`result`が週次/5時間ごとの上限到達を示す)」の3種に分類する`classifyGenerationResult`のテストを書く(各分類の代表入力、および429と汎用エラーが区別されること)
  - 🟢 `scripts/ai-dev-digest/generate-content.ts`(または同ディレクトリの純粋関数モジュール)に`classifyGenerationResult`を実装し、プロンプトには「JSONオブジェクト単体を返し聞き返さない・取得できない場合は空sectionsを返す」旨(design.md手順8)を明記する

- Task 9: 候補ごとのリトライと除外/枯渇打ち切り(仕様: daily-publish/design.md「1日分の記事を生成する処理」手順4-5・「エラーハンドリング」、daily-publish/requirements.md#掲載件数の保証-3)
  - 🔴 CLI呼び出しを注入できる形にした生成ループ`generateTopics(candidates, callFn)`のテストを書く: (a)一時的失敗→リトライで成功する候補は結果に含まれる、(b)最大2回(初回+1回)失敗する候補は除外され残りは生成される、(c)1件でも成功すれば結果配列が返る、(d)全候補が失敗した場合は例外を投げる(非ゼロ終了に対応)、(e)利用枠枯渇を検知したらリトライせず即座に例外を投げ以降の候補を呼ばない、(d)(e)の例外メッセージが互いに区別できる
  - 🟢 `generateTopics`を実装し、`generate-content.ts`の`main`から呼ぶ。除外した候補は`console.error`で理由(発信者名・原文タイトル)を記録する。全候補失敗・枯渇時は`classifyGenerationResult`の分類に応じたメッセージで例外を投げ、`main().catch`が非ゼロ終了する

以下は2026-08、要約フォーマットを可変長`sections`から固定4観点`summary`+`importance`に変更した際に追加したタスク(仕様: [/consult](../../../.claude/skills/consult/SKILL.md)での壁打ち)。上記Task 1〜9はTeaser/detail検証・記事タイトル・YouTube ID抽出・生成応答の分類・リトライ制御という決定的ロジックとして引き続き有効であり、変更しない(2026-08以前に生成された既存記事データ(`LegacyTopic`)の検証に使われ続ける)。

- Task 10: 固定4観点(`TopicSummary`)の分量検証(仕様: requirements.md#要約-2〜5、requirements.md#重要度-13、design.md「要約の分量を検証する処理」)
  - 🔴 `summary`が`benefit`/`whatsNew`/`how`/`howToUse`の4キーを持たない場合、いずれかの観点の`heading`/`teaser`/`detail`が空文字の場合、いずれかの観点の`teaser`が40〜140字の範囲外の場合、4観点の`detail`合計が800〜1700字の範囲外の場合(境界値含む)に`false`を返すテストを書く。あわせて`importance`が1〜5の整数でない場合(0・6・小数・文字列等)に`false`を返すテストを書く
  - 🟢 `app/ai-dev-digest/lib/summaryValidation.ts`に`isValidSummaryDetailLength(summary: TopicSummary): boolean`と`isValidImportance(value: unknown): value is Importance`を実装する(teaser検証は既存の`isValidTeaserLength`を各観点に対して再利用し、新規の定数は追加しない)

- Task 11: 生成応答の分類ロジックの更新(仕様: design.md「要約を書く処理」応答JSONの形式、app/ai-dev-digest/lib/generateContent.ts)
  - 🔴 応答の`summary`が`null`、またはオブジェクトでも`benefit`/`whatsNew`/`how`/`howToUse`のいずれかが欠落・空文字の場合、`importance`が1〜5の整数でない場合に「一時的な失敗」として分類されることを確認するテストを、Task 8の`classifyGenerationResult`テストに追加する
  - 🟢 `app/ai-dev-digest/lib/generateContent.ts`の`GeneratedContent`型・`isUsableContent`を固定4観点+`importance`の形式に更新する

- Task 12: 要約生成CLIのプロンプト更新(仕様: design.md「要約を書く処理」応答JSONの形式)(TDD対象外。Task 7と同じ理由: プロンプト文字列組み立て自体に検証可能な決定的ロジックがないため)
  - `scripts/ai-dev-digest/generate-content.ts`の`buildPrompt`が返すJSON例を、design.md「要約を書く処理」に記載の固定4観点+`importance`形式に更新する

Topic型の`LegacyTopic`/`CurrentTopic`化・記事スキーマ検証(`types.ts`/`articleSchema.ts`)への組み込みは、これらのファイルの所有specである[article-detail/tasks.md](../article-detail/tasks.md)側に追加する(article-detail/design.md「前提: 記事データの形式」参照)。
