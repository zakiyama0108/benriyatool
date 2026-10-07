# タスク分解: 未来予測記事の要約・記事執筆のルール

> 全8件(Task 1〜Task 8)
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

- Task 5: 生成のやり直しと除外(仕様: weekly-publish/requirements.md#掲載件数の保証-4、weekly-publish/design.md「1回分の記事を生成する処理」)
  - 🔴 Claude CLIの呼び出しを差し替え可能にし、`generatePredictions(candidates, callFn)`について次を確認するテストを書く: 一時的な失敗→やり直しで成功した予測は結果に入る/2回失敗した予測は「生成に失敗した枠」として返る/採用した候補全件が2回失敗しても例外を投げず、全件を「生成に失敗した枠」として返す(公開をスキップせず生成失敗の記載で公開する方針のため。根拠: /requirementでの決定)/利用上限への到達だけはやり直さず以降を呼ばずに例外を投げる(全件生成失敗とは区別される唯一の例外。この例外はweekly-publishの再実行に委ねられる)
  - 🟢 `generatePredictions`を実装する

- Task 6: 見出し・本文生成CLI(仕様: design.md「見出し・本文を書く処理」)(TDD対象外。Claude CLIの起動とプロンプトの組み立てで、検証可能な決定的ロジックはTask 1〜5でテスト済みのため)
  - `scripts/future-digest/generate-content.ts`の`main`を実装する。本specのrequirements.md・design.mdを実行時に読み込み、全ジャンル共通のガードレール文言(性・恋愛ジャンルはその専用文言も)を含めてClaude CLI(`claude -p ... --output-format json`、許可ツールはWebFetchのみ)を1本ずつ起動する。`generatePredictions`が投げる利用上限への到達の例外はここで握りつぶさず、`main`から外に伝播させて`generate-content.ts`を非ゼロ終了させる(この場合ワークフローは後続の`write-article.ts`(公開)に進まず、次の再実行cronに委ねる。weekly-publish/design.md「1回分の記事を生成する処理」手順4)

- Task 7: 利用規約への条項追記(仕様: requirements.md#利用規約への反映-3、design.md「利用規約への反映」)(TDD対象外。静的な文言の変更のため)
  - `app/legal/page.tsx`の「4. 知的財産」のtrend-digest向け条項を、週刊トレンド・週刊未来予測・週刊研究発見の3つを対象とする文面に改める(research-digestの同タスクと1回の変更で行う)
  - `specs/legal/requirements.md`の知的財産の仕様リンクに本specを追加する


## 週1回配信を週2回(2編)に分割する追加タスク

記事タイトルに編のラベルを追加する変更。〔提案〕

<details><summary>詳細を開く</summary>

- Task 8: 記事タイトルの導出を編対応にする(仕様: requirements.md#記事の構成-7、design.md「記事タイトルを導出する処理」)
  - 🔴 Task 2の`buildArticleTitle`のテストを、第2引数`edition`を渡す形に書き直し、`science-tech`なら「週刊未来予測 サイエンス・テクノロジー編 2026年10月1日号」、`life-society`なら「週刊未来予測 くらし・社会編 2026年10月4日号」になることを確認するケースに差し替える
  - 🟢 `app/future-digest/lib/articleTitle.ts`の`buildArticleTitle(date, edition)`を実装する(呼び出し元のgenerate-content.ts・write-article.tsも合わせて更新する)

</details>
