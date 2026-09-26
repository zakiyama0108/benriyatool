# タスク分解: 未来予測記事の要約・記事執筆のルール

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 本文・見出しの検証(仕様: requirements.md#要約-3、design.md「生成結果を検証する処理」)
  - 🔴 本文が160字未満・480字超で`false`、160字・480字ちょうどで`true`になること、見出し・本文が`null`・空で不正になること、見出しが100字超で不正になることを確認するテストを書く
  - 🟢 `app/future-digest/lib/bodyValidation.ts`に`BODY_MIN_LENGTH`/`BODY_MAX_LENGTH`/`isValidBodyLength`/`isValidHeading`を実装する

- Task 2: 記事タイトルの導出(仕様: requirements.md#記事の構成-7、design.md「記事タイトルを導出する処理」)
  - 🔴 `2026-10-01`から「週刊未来予測 2026年10月1日号」、`2026-12-24`から「週刊未来予測 2026年12月24日号」が作られること(月・日をゼロ埋めしない)を確認するテストを書く
  - 🟢 `app/future-digest/lib/articleTitle.ts`に`buildArticleTitle(date)`を実装する

- Task 3: 予測1本分の組み立て(仕様: requirements.md#記事の構成-6、design.md「記事データの1本分を組み立てる処理」)
  - 🔴 選定時の値(ジャンル・時間軸・影響度・根拠・対象時期・出典)がそのまま引き継がれ、見出し・本文だけが生成結果から入ること、予測IDが`<genre>--<horizon>`になることを確認するテストを書く
  - 🟢 `app/future-digest/lib/buildPrediction.ts`に`buildPrediction(candidate, generated)`を実装する

- Task 4: 生成応答の分類(仕様: design.md「エラーハンドリング」、weekly-publish/design.md「エラーハンドリング」)
  - 🔴 Claude CLIの応答を「成功」「一時的な失敗(JSONを取り出せない・`heading`が`null`・検証エラー・生成拒否)」「利用上限への到達」の3種に分類する`classifyGenerationResult`のテストを書く
  - 🟢 `scripts/future-digest/generate-content.ts`(または同ディレクトリの純粋関数モジュール)に実装する(trend-digestの`classifyGenerationResult`と同じ判定)

- Task 5: 生成のやり直しと除外(仕様: weekly-publish/requirements.md#掲載件数の保証-2、weekly-publish/design.md「1回分の記事を生成する処理」)
  - 🔴 Claude CLIの呼び出しを差し替え可能にし、`generatePredictions(candidates, callFn)`について次を確認するテストを書く: 一時的な失敗→やり直しで成功した予測は結果に入る/2回失敗した予測は「生成に失敗した枠」として返る/1件でも成功すれば結果が返る/全件失敗で例外を投げる/利用上限への到達でやり直さず以降を呼ばずに例外を投げる/全件失敗と利用上限の例外が区別できる
  - 🟢 `generatePredictions`を実装する

- Task 6: 見出し・本文生成CLI(仕様: design.md「見出し・本文を書く処理」)(TDD対象外。Claude CLIの起動とプロンプトの組み立てで、検証可能な決定的ロジックはTask 1〜5でテスト済みのため)
  - `scripts/future-digest/generate-content.ts`の`main`を実装する。本specのrequirements.md・design.mdを実行時に読み込み、全ジャンル共通のガードレール文言(性・恋愛ジャンルはその専用文言も)を含めてClaude CLI(`claude -p ... --output-format json`、許可ツールはWebFetchのみ)を1本ずつ起動する

- Task 7: 利用規約への条項追記(仕様: requirements.md#利用規約への反映-3、design.md「利用規約への反映」)(TDD対象外。静的な文言の変更のため)
  - `app/legal/page.tsx`の「4. 知的財産」のtrend-digest向け条項を、週刊トレンド・週刊未来予測・週刊研究発見の3つを対象とする文面に改める(research-digestの同タスクと1回の変更で行う)
  - `specs/legal/requirements.md`の知的財産の仕様リンクに本specを追加する
