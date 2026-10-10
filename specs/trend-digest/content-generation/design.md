# 設計: 要約・記事執筆のルール

## サマリ
[content-selection](../content-selection/design.md)が選定した候補(作品名・出典)ごとに、Claude Code CLIのヘッドレス実行で見出しと固定3観点(急上昇の事実/なぜ注目されたか/確からしさ・注意点、合計200〜400字程度)を生成する。「なぜ注目されたか」は必要に応じてWebSearchで深掘り調査する。あわせて、理解の助けになる場合はMermaid図・生成画像(Nano Banana)による図解を作る。分量検証・記事タイトルの導出は決定的なコードで行い、著作権配慮(独自の再構成・出典明記)はガードレール文言と分量上限で担保する。記事タイトルは`buildArticleTitle(edition, date)`で決定的に導出する(下記「記事タイトルを導出する処理」参照)。

## 設計の前提(エージェントの推論とコードの役割分担)

[content-selection/design.md](../content-selection/design.md)の方針と対になる整理として、次のように役割を分ける(要件はロジックの実装形態まで指定していないため設計判断):

- **エージェントの推論に委ねる**: 選定された候補から、日本語の紹介文としての見出し・本文を書く行為そのもの
- **決定的なコードに任せる**: 本文の文字数チェック、記事タイトルの生成。これらは「揺れてはいけない/機械的に導出できる」性質のため、エージェントの推論結果ではなく固定のコード・固定文言にする

エージェント(GitHub Actionsのワークフローから`scripts/trend-digest/generate-content.ts`経由でヘッドレス起動するClaude Code CLI。運営者個人のClaude Code Pro/Maxサブスクリプション認証を使う。[weekly-publish/design.md](../weekly-publish/design.md)参照)が見出し・各観点を書く際に従うべきルールは、この[requirements.md](requirements.md)と本design.mdそのものを直接参照させる(別ファイルにプロンプト文を複製しない)。元記事の内容把握には、Claude Code CLIに標準搭載されたWebFetch/WebSearchツールを使う(候補の`sourceUrl`をWebFetchに渡す。「なぜ注目されたか」の深掘りにはWebSearchを使う)。

## 処理フロー

### 見出し・固定3観点を書く処理(エージェントの推論)
- 対象: content-selectionが選定した1件の候補(作品名・ジャンル・出典情報)
- 手順:
  1. `sourceUrl`の内容をWebFetchで把握し、見出し(何が話題か)を書く
  2. 固定3観点(`fact`/`reason`/`caveat`、この順序で固定。requirements.md#要約-3)それぞれについて、短い結論文(`heading`)と本文(`text`)を書く
  3. `fact`(急上昇の事実)は、渡された検索数の目安・継続度ラベル・継続日数・報告回数を簡潔に提示する
  4. `reason`(なぜ注目されたか)は、`sourceUrl`(Googleトレンドの関連ニュース等)の内容だけで背景が分からない場合、WebSearchで追加調査してから書く。追加調査しても特定できない場合は「背景は特定できなかった」旨を書く(推測で断定しない。requirements.md#要約-4)
  5. `caveat`(確からしさ・注意点)は、`reason`が推測を含む場合はその旨が伝わる書き方にし、継続度ラベルが「流行前」等で今後が見通せない場合はその旨も示す
  6. 3観点合計の本文(`text`を連結した文字数)は200〜400字程度にする(requirements.md#要約-2)
  7. 各観点の本文は原文(ランキングサイト・ニュース記事)の構成・表現をなぞらず、独自の視点で再構成する。原文の詳細な数値・全文を網羅的に転記しない(requirements.md#要約-5)
  8. 出典(情報源名・元URLへのリンク)は候補が既に持つ`sourceName`/`sourceUrl`をそのまま使う。エージェントが新たに調べ直す値ではない(requirements.md#要約-6)
  9. 記事の内容はcontent-selectionで採用された候補の範囲にとどめ、書かれていない内容を推測で断定しない(requirements.md#エージェントの逸脱防止-5)
  10. 候補の報告回数が2回目以降(続報)の場合は、前回掲載時の`reason`本文と直近掲載時の継続度ラベルをプロンプトにあわせて渡し、`reason`は前回から何が変わったか(継続度の進行・継続期間の伸び・注目度の変化)を軸に書く。前回の表現をなぞらず、かつ前回の記事を読んでいない読者にも通じる最小限の説明を含める(requirements.md#続報の執筆-10〜11)
  11. 継続度ラベル・注目度ラベル・継続日数・報告回数・地域は渡された値をそのまま扱い、本文でそれと異なる段階・強さ・期間・地域を書かない(requirements.md#エージェントの逸脱防止-6)
  12. 観点ごと、または記事全体について図解が理解の助けになるかを判断する(requirements.md#図解-7)。[news-digest/content-generation/design.md「図解を生成する処理」](../../news-digest/content-generation/design.md)と同じ形式で`diagram`を返す
  13. 応答は必ず指定のJSONオブジェクト単体とし、運営者に判断を仰ぐ質問文や選択肢の提示を返さない(ヘッドレス実行のため質問しても応答する相手がいない)。WebFetchで元URLの内容を十分に取得できなかった場合でも、確認できた情報(作品名・ジャンル・情報源名)の範囲で書けるところまで書いてJSONを返す。それも困難な場合は無理に内容を創作せず、`heading`を`null`にしたJSONを返す(いずれの場合も聞き返さない)
- 応答JSONの形式:
  ```json
  {
    "heading": "何が話題かが伝わる見出し",
    "sections": {
      "fact": { "heading": "急上昇の事実の結論文", "text": "本文", "diagram": null },
      "reason": { "heading": "なぜ注目されたかの結論文", "text": "本文", "diagram": { "type": "mermaid", "code": "flowchart LR\n..." } },
      "caveat": { "heading": "確からしさ・注意点の結論文", "text": "本文", "diagram": null }
    }
  }
  ```
  取得困難な場合は`{ "heading": null, "sections": null }`を返す(下記「本文の分量を検証する処理」が失敗シグナルとして判定する)
- 適用するガードレール文言(weekly-publishの実行指示に必ず含める。requirements.md#エージェントの逸脱防止-5の具体化):
  > この記事で扱ってよい話題は、content-selectionの採用基準に基づき選定された候補のみである。選定候補に含まれない話題を新たに追加してはならない。各観点の本文は独自の視点で再構成した解説とし、原文の構成・表現の順序をそのままなぞってはならない。原文の詳細な数値・結論を網羅的に転記してはならない。渡された継続度ラベル・注目度ラベル・継続日数・報告回数・地域は事実として扱い、それと異なる段階・強さ・期間・地域を本文に書いてはならない。続報の場合は、前回掲載時の「なぜ注目されたか」をそのまま言い換えただけの本文を書いてはならない。「なぜ注目されたか」で背景が特定できない場合、推測で断定せず特定できなかった旨を書くこと。
- 関連するビジネスルール: requirements.md#要約-1〜6、requirements.md#図解-7、requirements.md#記事の構成-8、requirements.md#続報の執筆-10〜11、requirements.md#著作権への配慮(根拠)-1〜3、requirements.md#エージェントの逸脱防止-5〜6

### 本文の分量を検証する処理(決定的なコード)
- 対象: エージェントが書いた`heading`/`sections`(`fact`/`reason`/`caveat`の組)
- 手順:
  1. `heading`/`sections`が`null`、またはいずれかの観点の`heading`/`text`が空文字の場合は不正とする(取得困難時の失敗シグナル)
  2. 3観点の`text`を連結した文字数が160字未満、または480字を超える場合は不正とする。「200〜400字程度」の「程度」を、ai-dev-digestの分量チェック(目安に対し約±20%の許容幅)と同じ考え方で解釈し、160〜480字とする(要件は許容幅を定めていないため設計判断)
  3. 続報(報告回数が2回目以降)の候補は、書かれた`reason.text`の前後の空白を除いた文字列が、前回掲載時の`reason.text`と完全に一致する場合は不正とする(requirements.md#エージェントの逸脱防止-7)。表現を変えただけの実質的な重複までは機械的に判定せず、完全一致のみを最終防波堤として弾く(意味の重複判定はコードでは決定的に行えないため、それはプロンプト側のガードレールに委ねる設計判断)
  4. 各観点の`diagram`は[news-digest/content-generation/design.md](../../news-digest/content-generation/design.md)「図解を生成する処理」と同じ検証・保存処理を行う
  5. 不正な場合はその候補の生成失敗として扱い、[weekly-publish](../weekly-publish/design.md)のリトライ・除外の流れに乗せる。記事データとして書き出された後のスキーマ違反は[article-detail](../article-detail/design.md)のスキーマ検証(`parseArticle`)がエラーとして扱い、ビルドを失敗させる(article-detail/design.md#エラーハンドリング)
- 関連するビジネスルール: requirements.md#要約-2、requirements.md#エージェントの逸脱防止-7、requirements.md#図解の生成(Nano Banana)-8

### 記事タイトルを導出する処理(決定的なコード)
- 対象: edition(エンタメ編/カルチャー編)と発行日
- 手順:
  1. `週刊トレンド ${editionLabel} ${YYYY}年${M}月${D}日号`のテンプレートに当てはめてタイトルを生成する(`editionLabel`はエンタメ編/カルチャー編。requirements.md#記事の構成-6の例と一致)。このタイトルは記事詳細ページの見出し・ページタイトルとして使う(article-detail/design.md「前提: 記事データの形式」参照)
  2. LINE配信メッセージの見出しは、このタイトルをそのまま使うのではなく[line-broadcast/design.md](../line-broadcast/design.md)が定める別形式(接頭辞`【週刊トレンド エンタメ編】`+日付)を使う。理由は同designの「配信メッセージ本文を組み立てる処理」参照
  3. エージェントはタイトルの生成に関与しない(記事JSONにもタイトルを含めず、`edition`/`date`から常に導出する。誇張表現や話題の先取りのリスクを避けるため)
- 関連するビジネスルール: requirements.md#記事の構成-6

## エラーハンドリング

- 本文の分量超過・過少は記事データのビルド時バリデーション(article-detail/design.md)でCI失敗として検知する。見出し・本文の内容そのもの(意味的な正確さ・原文をなぞっていないか)は自動検証できないため、エージェント自身の執筆時点でのガードレール遵守に委ね、事後の自動チェックは設けない(限界として明記する)
- エージェントの応答から指定のJSONオブジェクトを抽出できない場合(聞き返し・説明文のみの応答・`heading`が`null`など)は、その候補1件の生成失敗として扱う。1件の生成失敗をその回全体の失敗に波及させない具体的な扱い(リトライ回数・除外して継続する制御・利用枠枯渇との区別)は、この生成処理を1候補ずつ起動するオーケストレーション側([weekly-publish/design.md](../weekly-publish/design.md)「エラーハンドリング」)で定める

## 関連するファイル(抜粋)

```
scripts/trend-digest/generate-content.ts (新規: weekly-publishが起動するCLI本体)
app/trend-digest/lib/bodyValidation.ts (新規: isValidSectionsLength(sections): boolean。3観点のtext連結で分量判定)
app/trend-digest/lib/duplicateReason.ts (新規: isDuplicateOfLastPublishedReason(reason, lastPublishedReason))
app/trend-digest/lib/articleTitle.ts (新規: buildArticleTitle(edition, date))
app/trend-digest/lib/articleSchema.ts (article-detailで新規作成: 分量検証を組み込む)
scripts/trend-digest/generateDiagram.ts (新規: news-digestのgenerateDiagram.tsと同じロジック。Nano Banana API呼び出し・画像保存)
app/trend-digest/components/DiagramView.tsx (新規: news-digestのDiagramView.tsxと同じ実装)
specs/legal/requirements.md (既存: 知的財産の条項にtrend-digest分を追記)
app/legal/page.tsx (既存: 「4. 知的財産」セクションに条項本文を追記)
```

## セキュリティ

- 生成される見出し・本文は訪問者に表示される文章のため、通常のReactレンダリングでエスケープされる(article-detail/design.md#セキュリティと同様、追加のサニタイズは不要)
- 著作権リスクへの対応は、分量の上下限(コードで強制)・独自の構成(ガードレール文言で指示)・出典明記(スキーマで必須化)・利用規約への条項追記の4点で構成する(requirements.md#著作権への配慮(根拠)-1〜3)。翻訳・要約の「質」(本当に独自の解説として再構成されているか)はコードで保証できない限界がある点を明記しておく(上記エラーハンドリング参照)
- Mermaid/生成画像の扱いは[news-digest/content-generation/design.md#セキュリティ](../../news-digest/content-generation/design.md)と同一の方針を踏襲する

## ログ

- 本文の分量検証結果(合否・実際の文字数)は、article-detailのビルド時バリデーションのエラーメッセージとしてCIログに出力される(article-detail/design.md#ログ)
- 見出し・本文の生成過程自体(エージェントの推論内容)は本アプリのログ設計の対象外とする(GitHub Actionsのワークフロー実行ログとして別途残る運用上の記録であり、アプリコードが管理する対象ではないため)
- 図解の生成成否はGitHub Actionsのワークフロー実行ログに出力する(news-digestと同じ)

## 利用規約への反映

requirements.md#利用規約への反映-4の条項をそのまま`specs/legal/requirements.md`(知的財産の項目)と`app/legal/page.tsx`(「4. 知的財産」セクション)に追記する。文面はrequirements.mdに明記済みの以下をそのまま使う(新たな文言を作らない):

> 本サービスの一部機能(週刊トレンド)では、第三者が公開したランキング・記事等の情報をもとに、独自の視点で解説する目的で、出典元へのリンクとともに要約(全文の転載ではない)を掲載している。著作権者から掲載内容の修正・削除の要望があれば、問い合わせ先まで連絡があり次第、速やかに対応する。
