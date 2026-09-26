# タスク分解: 要約・記事執筆のルール

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 本文の分量検証(仕様: requirements.md#要約-2、design.md「本文の分量を検証する処理」)
  - 🔴 本文の文字数が160字未満・480字超で`false`、160〜480字(境界値含む)で`true`になること、`heading`/`body`が`null`または空文字で不正になることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/bodyValidation.ts`に`BODY_MIN_LENGTH`/`BODY_MAX_LENGTH`/`isValidTopicBodyLength`を実装する

- Task 2: 記事タイトルの導出(仕様: requirements.md#記事の構成-6、design.md「記事タイトルを導出する処理」)
  - 🔴 `entertainment`・`2026-09-15`から`週刊トレンド エンタメ編 2026年9月15日号`、`culture-lifestyle`・`2026-09-18`から`週刊トレンド カルチャー編 2026年9月18日号`が生成されることを確認するテストを書く(1桁月日でゼロ埋めしないこと等)
  - 🟢 `app/trend-digest/lib/articleTitle.ts`に`buildArticleTitle(edition: Edition, date: string): string`を実装する

- Task 3: 記事スキーマへの分量検証の組み込み(仕様: article-detail/design.md「バリデーション」)
  - 🔴 `parseArticle`が、本文が160〜480字の範囲外のトピックを含む記事データを拒否することを確認するテストを、article-detailのTask 3のテストに追加する
  - 🟢 `app/trend-digest/lib/articleSchema.ts`から`isValidTopicBodyLength`を呼び出す

- Task 4: 利用規約への条項追記(仕様: requirements.md#利用規約への反映-4)(TDD対象外。静的な文言追加のみのため)
  - `specs/legal/requirements.md`の知的財産の項目に、design.md「利用規約への反映」の条項を追記する
  - `app/legal/page.tsx`の「4. 知的財産」セクションに同じ条項本文を追記する

- Task 5: 見出し・本文生成CLIの実装(仕様: design.md「見出し・本文を書く処理」)(TDD対象外。Claude Code CLIのヘッドレス起動を伴い、プロンプトの組み立て自体に検証可能な決定的ロジックがないため。生成結果の分量検証はTask 1で担保する)
  - `scripts/trend-digest/generate-content.ts`を実装する。1候補(作品名・ジャンル・出典)ごとにdesign.md「見出し・本文を書く処理」のルール・ガードレール文言をプロンプトに含めてClaude Code CLI(`claude -p ... --output-format json`)をヘッドレス起動し、`heading`/`body`を生成するCLIにする(WebFetchで元URLの内容を参照させる。認証は環境変数`CLAUDE_CODE_OAUTH_TOKEN`から読む)

- Task 6: 生成応答の分類(仕様: design.md「見出し・本文を書く処理」手順6・「エラーハンドリング」、weekly-publish/design.md「エラーハンドリング」)
  - 🔴 Claude Code CLIの応答を「成功(heading/bodyとも非空)」「一時的な失敗(JSON抽出不可・null・分量不正)」「利用枠の枯渇(`is_error`かつ`api_error_status===429`、または`result`が週次/5時間ごとの上限到達を示す)」の3種に分類する`classifyGenerationResult`のテストを書く
  - 🟢 `scripts/trend-digest/generate-content.ts`(または同ディレクトリの純粋関数モジュール)に`classifyGenerationResult`を実装する

- Task 7: 候補ごとのリトライと除外/枯渇打ち切り(仕様: weekly-publish/design.md「1回分の記事を生成する処理」、weekly-publish/requirements.md#掲載件数の保証-2)
  - 🔴 生成ループ`generateTopics(candidates, callFn)`のテストを書く: (a)一時的失敗→リトライで成功する候補は結果に含まれる、(b)最大2回(初回+1回)失敗する候補は除外され残りは生成される、(c)1件でも成功すれば結果配列が返る、(d)全候補が失敗した場合は例外を投げる、(e)利用枠枯渇を検知したらリトライせず即座に例外を投げ以降の候補を呼ばない、(d)(e)の例外メッセージが互いに区別できる
  - 🟢 `generateTopics`を実装し、`generate-content.ts`の`main`から呼ぶ。除外した候補は`console.error`で理由(作品名・ジャンル)を記録する
