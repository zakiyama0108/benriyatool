# タスク分解: 要約・記事執筆のルール

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 本文の分量検証(仕様: requirements.md#要約-2、design.md「本文の分量を検証する処理」)
  - 🔴 本文の文字数が160字未満・480字超で`false`、160〜480字(境界値含む)で`true`になること、`heading`/`body`が`null`または空文字で不正になることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/bodyValidation.ts`に`BODY_MIN_LENGTH`/`BODY_MAX_LENGTH`/`isValidTopicBodyLength`を実装する

- Task 2: 記事タイトルの導出(仕様: requirements.md#記事の構成-9、design.md「記事タイトルを導出する処理」)
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

## 固定3観点・図解

- Task 8: 固定3観点への移行(仕様: requirements.md#要約-1〜6、design.md「見出し・固定3観点を書く処理」「本文の分量を検証する処理」)
  - 🔴 Task 1のテストを、単一`body`ではなく`sections: {fact, reason, caveat}`(各`{heading, text}`)を検証する形に書き換える(3観点の`text`を連結した文字数で160〜480字を判定、いずれかの観点の`heading`/`text`が空文字・`sections`が`null`なら不正)
  - 🟢 `app/trend-digest/lib/bodyValidation.ts`の`isValidTopicBodyLength(body)`を`isValidSectionsLength(sections)`に置き換える(呼び出し元の`articleSchema.ts`・`generateContent.ts`も追随)
  - 🔴 続報の重複判定(仕様: requirements.md#エージェントの逸脱防止-7)が`reason.text`同士を比較することを確認するテストを書く(既存のテストが`body`同士の比較をしていた場合は対象を`reason.text`に変更する)
  - 🟢 `app/trend-digest/lib/duplicateReason.ts`に`isDuplicateOfLastPublishedReason(reason, lastPublishedReason)`を実装する(旧ロジックの対象を`body`から`reason.text`に変更したもの)

- Task 9: 図解データの検証(仕様: requirements.md#図解-7、design.md「見出し・固定3観点を書く処理」手順12)
  - 🔴 `diagram`が`null`の場合・`{type:'mermaid', code: '非空文字'}`の場合・`{type:'image', layout:'steps', items: 定義済みアイコン2〜4件}`の場合・`{type:'image', layout:'compare', left, right}`の場合はいずれも有効、`code`が空文字・itemsが2〜4件の範囲外・未定義のアイコン名・labelが空文字・未知のlayout・type不明の場合は不正と判定することを確認するテストを書く
  - 🟢 `app/trend-digest/lib/diagramValidation.ts`に`isValidAgentDiagram(value: unknown)`を実装する

- Task 9-1: アイコン名の固定セットと概念図のSVG描画(仕様: requirements.md#図解の生成(アイコン図のSVG描画)-8、design.md「見出し・固定3観点を書く処理」手順12。2026-10追加: AI画像生成(Nano Banana→Cloudflare Workers AI)が文章・構図の破綻を避けられなかったため、コードによる決定的なSVG描画に方針転換)
  - 🟢 `app/trend-digest/lib/diagramIcons.ts`にHeroicons(MIT License)由来のアイコン19種(`terminal`等)のパスデータと`isDiagramIconName`を実装する(ai-dev-digestと同一の内容)
  - 🟢 `app/trend-digest/lib/renderDiagramSvg.ts`に`renderDiagramSvg(spec: DiagramSpec): string`を実装する(ai-dev-digestと同一のロジック)
  - 🔴 件数分のアイコン・ラベル・矢印を含むSVGを返すこと、XML特殊文字がエスケープされること、長いラベルが2行に折り返され末尾が省略記号になることを確認するテストを書く(`__tests__/trend-digest/lib/renderDiagramSvg.test.ts`)

- Task 10: 概念図SVGのファイル保存(仕様: requirements.md#図解の生成(アイコン図のSVG描画)-8、design.md「見出し・固定3観点を書く処理」手順12)
  - TDD対象外(ファイル書き込みのオーケストレーションのため。SVGの組み立てロジック自体はTask 9-1でテスト済み)
  - `scripts/trend-digest/renderDiagram.ts`に`renderDiagramImage(input): Diagram | null`を実装する。`renderDiagramSvg`の結果を`public/content/trend-digest/articles/images/<date>-<topicId>-<sectionKey>.svg`に保存し、`{type:'image', path}`(`path`は`/content/...`のURLパス)を返す
  - `scripts/trend-digest/generate-content.ts`から、各観点の`diagram.type === 'image'`の場合のみこの処理を呼び出すよう配線する
  - 画面側の表示タスク(固定ラベル・DiagramView)は[article-detail/tasks.md](../article-detail/tasks.md)を参照
