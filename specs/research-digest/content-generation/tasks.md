# タスク分解: 研究発見の要約・記事執筆のルール

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 本文・見出しの検証(仕様: requirements.md#要約-2〜3、design.md「生成結果を検証する処理」)
  - 🔴 本文が160字未満・480字超で`false`、境界値で`true`になること、見出し・本文が`null`・空で不正になること、見出しが100字超で不正になること、査読前の論文で本文に「査読」が含まれない場合に不正・含まれる場合に正常になること、査読済みの論文ではこの確認をしないことを確認するテストを書く
  - 🟢 `app/research-digest/lib/bodyValidation.ts`に`BODY_MIN_LENGTH`/`BODY_MAX_LENGTH`/`isValidBodyLength`/`isValidHeading`/`mentionsPreprint`を実装する

- Task 2: 記事タイトルの導出(仕様: requirements.md#記事の構成-7)
  - 🔴 `2026-10-05`から「週刊研究発見 2026年10月5日号」、`2026-11-30`から「週刊研究発見 2026年11月30日号」が作られることを確認するテストを書く
  - 🟢 `app/research-digest/lib/articleTitle.ts`に`buildArticleTitle(date)`を実装する

- Task 3: 研究1本分の組み立て(仕様: requirements.md#記事の構成-6)
  - 🔴 選定時の値(ジャンル・影響度・根拠・論文名・発表元・URL・DOI・発表年・査読前か)がそのまま引き継がれ、見出し・本文だけが生成結果から入ること、研究IDがジャンルのidになることを確認するテストを書く
  - 🟢 `app/research-digest/lib/buildFinding.ts`に`buildFinding(candidate, generated)`を実装する

- Task 4: 生成応答の分類(仕様: design.md「エラーハンドリング」)
  - 🔴 Claude CLIの応答を「成功」「一時的な失敗(JSONを取り出せない・`heading`が`null`・検証エラー・生成拒否)」「利用上限への到達」の3種に分類する`classifyGenerationResult`のテストを書く
  - 🟢 `scripts/research-digest/generate-content.ts`(または同ディレクトリの純粋関数モジュール)に実装する

- Task 5: 生成のやり直しと除外(仕様: weekly-publish/requirements.md#掲載件数の保証-4)
  - 🔴 `generateFindings(candidates, callFn)`について、一時的な失敗→やり直しで成功/2回失敗で「生成に失敗したジャンル」として返る/1件でも成功すれば結果が返る/全件失敗で例外/利用上限でやり直さず以降を呼ばずに例外/2つの例外が区別できることを確認するテストを書く
  - 🟢 `generateFindings`を実装する

- Task 6: 見出し・本文生成CLI(仕様: design.md「見出し・本文を書く処理」)(TDD対象外。Claude CLIの起動とプロンプトの組み立てで、決定的なロジックはTask 1〜5でテスト済みのため)
  - `scripts/research-digest/generate-content.ts`の`main`を実装する。本specのrequirements.md・design.mdを実行時に読み込み、ガードレール文言を含めてClaude CLI(`claude -p ... --output-format json`、許可ツールはWebFetchのみ)を1本ずつ起動する

- Task 7: 利用規約への条項追記(仕様: requirements.md#利用規約への反映-2)(TDD対象外。静的な文言の変更のため)
  - [future-digest/content-generation/tasks.md](../../future-digest/content-generation/tasks.md)のTask 7と同じ1回の変更で、`app/legal/page.tsx`の「4. 知的財産」の条項を3アプリ対象の文面にする。`specs/legal/requirements.md`の知的財産の仕様リンクに本specを追加する
