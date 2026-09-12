# タスク分解: 要約・記事執筆のルール

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 要約・重要度の型定義(仕様: design.md「処理フロー」応答JSON形式。[article-detail/tasks.md](../article-detail/tasks.md)Task 2と重複しないよう型定義自体はarticle-detail側に置く)
  - TDD対象外。[article-detail/tasks.md](../article-detail/tasks.md)Task 2で定義する`SummaryPerspective`/`TopicSummary`/`Importance`を利用する

- Task 2: 要約の分量検証(仕様: requirements.md#要約-2〜3、requirements.md#重要度-8、design.md「要約の分量を検証する処理」)
  - 🔴 4観点すべての`teaser`が40〜140字の範囲であること、範囲外は不正と判定すること、4観点の`detail`合計が800〜1700字の範囲であること、範囲外は不正と判定すること、`importance`が1〜5の整数であること、範囲外・小数・非数値は不正と判定すること、`summary`が`null`または4キーのいずれか欠落は不正と判定することを確認するテストを書く
  - 🟢 `app/news-digest/lib/summaryValidation.ts`に`isValidSummaryDetailLength`/`isValidTeaserLength`/`isValidImportance`を実装する

- Task 3: 記事タイトルの導出(仕様: requirements.md#記事の構成-11、design.md「記事タイトルを導出する処理」)
  - 🔴 日付から`YYYY年M月D日週の重要ニュース`形式のタイトルが生成されることを確認するテストを書く
  - 🟢 `app/news-digest/lib/articleTitle.ts`に`buildArticleTitle(date)`を実装する

- Task 4: 生成結果の利用可否判定(仕様: design.md「エラーハンドリング」)
  - 🔴 `summary`が`null`、または分量検証(Task 2)に失敗する場合は利用不可と判定すること、すべて満たす場合は利用可と判定することを確認するテストを書く
  - 🟢 `app/news-digest/lib/generateContent.ts`に`isUsableContent(response, criteria)`を実装する

- Task 5: 要約生成CLI(仕様: design.md「処理フロー」応答JSON形式、design.md「関連するファイル」)
  - TDD対象外(Claude Code CLIのヘッドレス起動・プロンプト組み立てのオーケストレーションのため。ロジック自体はTask 2・4でテスト済み)
  - `scripts/news-digest/generate-content.ts`を実装する。候補1件を引数に取り、プロンプト(requirements.md/design.mdの内容を含む)でClaude Code CLIを起動し、`isUsableContent`で判定、不正なら最大2回まで(初回+リトライ1回)再実行する

- Task 6: 利用規約への反映(仕様: requirements.md#利用規約への反映-5、design.md「利用規約への反映」)
  - TDD対象外(静的な文言追記のため)
  - `specs/legal/requirements.md`の知的財産の項目に条項を追記する
  - `app/legal/page.tsx`の「4. 知的財産」セクションに条項本文を追記する
