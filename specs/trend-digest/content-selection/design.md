# 設計: ジャンル別情報源と採用基準

## サマリ
18ジャンルを「固定リストジャンル」(12ジャンル、公式ランキング等をコードで定量判定)と「WebSearchジャンル」(6ジャンル、Claude Code CLIのWebSearchによるLLM判定)に分け、エンタメ編・カルチャー編それぞれ9ジャンルの候補を収集する。掲載済み話題の再掲を防いだ上で、ジャンル内最大2件・編内最大10件まで絞り込む。判定基準の数値・情報源は`content/trend-digest/watchlist.json`・`criteria.json`に機械可読データとして持ち、[source-review](../source-review/requirements.md)の月次見直しで更新する(データ設計・処理フロー・図は下記参照)。

## 設計の前提(エージェントの推論とコードの役割分担)

architecture.mdが定める2つの選定方式を、実装形態として次のように役割分担する(要件は方式の呼び名までは決めているが実装形態は指定していないため設計判断):

- **固定リストジャンル(12ジャンル)**: 「対象作品・話題が採用基準を満たすか」の判定は決定的なコード(TypeScript純粋関数)で行う。公式ランキング・チャートという構造化された情報源を前提にしており、順位・新規ランクイン等の比較は算術的に検証可能なため
- **WebSearchジャンル(6ジャンル)**: 「動きがあったか」の判定自体をClaude Code CLIのヘッドレス実行(WebSearchツール使用)に委ねる。決まった集計元がなく、複数情報源が同じ話題を報じているかという意味的な判断が必要なため、コード化になじまない
- ジャンル内絞り込み(最大2件)・編全体の絞り込み(最大10件)・掲載済み話題の再掲抑制は、両方式で共通の決定的なコードとして実装する(narrowing自体は数値比較で完結するため)

## データ設計(ウォッチリスト・採用基準)

ウォッチリスト・採用基準は`requirements.md`(人間が読む正の仕様)と、実行時にコードが読み込む機械可読データの二重管理とする。[source-review](../source-review/requirements.md)の月次見直しPRは、同じ変更を`requirements.md`とこの機械可読データの両方に加える(片方だけの変更はレビューで差し戻す。ai-dev-digestのwatchlist-reviewと同じ運用)。

```ts
// app/trend-digest/lib/watchlistTypes.ts
export type Edition = 'entertainment' | 'culture-lifestyle'

export type Genre =
  // エンタメ編(9): requirements.md#グループとジャンル-1
  | 'music' | 'japanese-movie' | 'foreign-movie' | 'japanese-drama' | 'foreign-drama'
  | 'anime' | 'variety' | 'streaming-video' | 'books-comics'
  // カルチャー・ライフスタイル編(9): requirements.md#グループとジャンル-2
  | 'sns-buzz' | 'buzzwords' | 'gourmet' | 'hobby' | 'fashion'
  | 'gadgets' | 'games' | 'travel' | 'economy-money'

export type SelectionMethod = 'fixed-list' | 'websearch'

export type WatchlistEntry = {
  genre: Genre
  edition: Edition
  label: string // 表示・PR本文用の日本語ジャンル名(例: "音楽")
  method: SelectionMethod
  sources: Array<{ name: string; url: string }> // 固定リストジャンルの情報源。WebSearchジャンルは検索の手がかりとして空でもよい
  searchHints?: string[] // WebSearchジャンルのみ。検索クエリの手がかり(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル))
}

// 固定リストジャンルの採用基準(requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル))
export type FixedListGenreCriteria = {
  method: 'fixed-list'
  rankThreshold?: number // 上位何位以内を候補にするか
  newEntryOrRisingRank?: boolean // 新規ランクイン、または順位上昇を候補条件に含めるか
  risingRankMinImprovement?: number // 「大きく上昇」とみなす順位改善幅の最小値(newEntryOrRisingRankがtrueの場合のみ使う)
}

// WebSearchジャンルの採用基準(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル))
export type WebSearchGenreCriteria = {
  method: 'websearch'
  minIndependentSources: number // 「動きがあった」と判定する最低独立情報源数
}

export type Criteria = {
  perGenreMax: number // 1ジャンルの最大掲載数(requirements.md#機能要件-4 = 2)
  perEditionMax: number // 1回の最大掲載数(requirements.md#機能要件-5 = 10)
  newEntryLookbackWeeks: number // 「新規ランクイン」を判定する際、何週間分の過去記事の掲載トピックを参照するか
  genreCriteria: Record<Genre, FixedListGenreCriteria | WebSearchGenreCriteria>
}
```

`watchlist.json`の初期値(全18ジャンル。sourcesはrequirements.mdの各ジャンル節の情報源をそのまま構造化したもの。すべて【推測】=requirements.md側で既に推測マーカー付きの内容をそのまま構造化):

```json
{
  "genres": [
    { "genre": "music", "edition": "entertainment", "label": "音楽", "method": "fixed-list",
      "sources": [
        { "name": "Oricon週間チャート", "url": "https://www.oricon.co.jp/rank/js/w/" },
        { "name": "Billboard JAPAN Hot 100", "url": "https://www.billboard-japan.com/charts/detail?a=hot100" }
      ] },
    { "genre": "japanese-movie", "edition": "entertainment", "label": "日本映画", "method": "fixed-list",
      "sources": [{ "name": "週末興行収入ランキング", "url": "https://www.eiga.com/box-office/japan/" }, { "name": "Filmarks劇場公開作品ランキング", "url": "https://filmarks.com/list/theater" }] },
    { "genre": "foreign-movie", "edition": "entertainment", "label": "海外映画", "method": "fixed-list",
      "sources": [{ "name": "週末興行収入ランキング", "url": "https://www.eiga.com/box-office/world/" }, { "name": "Filmarks劇場公開作品ランキング", "url": "https://filmarks.com/list/theater" }] },
    { "genre": "japanese-drama", "edition": "entertainment", "label": "日本ドラマ", "method": "websearch",
      "searchHints": ["日本ドラマ 視聴率 好調", "ドラマ SNS 反響"] },
    { "genre": "foreign-drama", "edition": "entertainment", "label": "海外ドラマ", "method": "fixed-list",
      "sources": [{ "name": "Netflix公式Top10(シリーズ・日本)", "url": "https://top10.netflix.com/jp" }] },
    { "genre": "anime", "edition": "entertainment", "label": "アニメ", "method": "fixed-list",
      "sources": [{ "name": "Netflix公式Top10(日本のTOP10)", "url": "https://top10.netflix.com/jp" }] },
    { "genre": "variety", "edition": "entertainment", "label": "バラエティ", "method": "websearch",
      "searchHints": ["バラエティ番組 視聴率 好調", "バラエティ SNS 話題"] },
    { "genre": "streaming-video", "edition": "entertainment", "label": "サブスク動画", "method": "fixed-list",
      "sources": [{ "name": "Netflix公式Top10(映画・日本)", "url": "https://top10.netflix.com/jp" }] },
    { "genre": "books-comics", "edition": "entertainment", "label": "書籍・漫画", "method": "fixed-list",
      "sources": [{ "name": "トーハン週間ベストセラー", "url": "https://www.tohan.jp/bestsellers/" }] },
    { "genre": "sns-buzz", "edition": "culture-lifestyle", "label": "SNSバズり", "method": "websearch",
      "searchHints": ["X バズり 話題", "TikTok 話題 バズり", "Instagram Threads 話題"] },
    { "genre": "buzzwords", "edition": "culture-lifestyle", "label": "流行りの言葉", "method": "fixed-list",
      "sources": [{ "name": "Googleトレンド急上昇ワード", "url": "https://trends.google.co.jp/trending?geo=JP" }, { "name": "Yahoo!検索急上昇ワード", "url": "https://search.yahoo.co.jp/realtime" }] },
    { "genre": "gourmet", "edition": "culture-lifestyle", "label": "グルメ", "method": "websearch",
      "searchHints": ["話題の飲食店", "食トレンド 話題"] },
    { "genre": "hobby", "edition": "culture-lifestyle", "label": "流行りの趣味", "method": "websearch",
      "searchHints": ["新しい趣味 話題", "ホビー トレンド"] },
    { "genre": "fashion", "edition": "culture-lifestyle", "label": "ファッション", "method": "fixed-list",
      "sources": [{ "name": "WWD JAPAN新着記事", "url": "https://www.wwdjapan.com/" }, { "name": "ZOZOTOWN人気ランキング", "url": "https://zozo.jp/ranking/" }] },
    { "genre": "gadgets", "edition": "culture-lifestyle", "label": "ガジェット・家電", "method": "fixed-list",
      "sources": [{ "name": "価格.com売れ筋ランキング", "url": "https://kakaku.com/ranking/" }, { "name": "Engadget日本版", "url": "https://japanese.engadget.com/" }] },
    { "genre": "games", "edition": "culture-lifestyle", "label": "ゲーム", "method": "fixed-list",
      "sources": [{ "name": "Steam売上ランキング", "url": "https://store.steampowered.com/charts/topselling/JP" }, { "name": "ファミ通.com売上ランキング", "url": "https://www.famitsu.com/ranking/" }] },
    { "genre": "travel", "edition": "culture-lifestyle", "label": "旅行・観光", "method": "fixed-list",
      "sources": [{ "name": "じゃらんnet人気ランキング", "url": "https://www.jalan.net/" }, { "name": "るるぶ&more!人気ランキング", "url": "https://rurubu.travel/" }] },
    { "genre": "economy-money", "edition": "culture-lifestyle", "label": "経済・お金", "method": "websearch",
      "searchHints": ["NISA 話題", "家計 投資 話題のニュース"] }
  ]
}
```

`criteria.json`の初期値(すべて【推測】。妥当性は運用実績を見て[source-review](../source-review/requirements.md)で見直す):
```json
{
  "perGenreMax": 2,
  "perEditionMax": 10,
  "newEntryLookbackWeeks": 4,
  "genreCriteria": {
    "music": { "method": "fixed-list", "newEntryOrRisingRank": true, "risingRankMinImprovement": 10 },
    "japanese-movie": { "method": "fixed-list", "rankThreshold": 5 },
    "foreign-movie": { "method": "fixed-list", "rankThreshold": 5 },
    "japanese-drama": { "method": "websearch", "minIndependentSources": 2 },
    "foreign-drama": { "method": "fixed-list", "newEntryOrRisingRank": true },
    "anime": { "method": "fixed-list", "newEntryOrRisingRank": true },
    "variety": { "method": "websearch", "minIndependentSources": 2 },
    "streaming-video": { "method": "fixed-list", "newEntryOrRisingRank": true },
    "books-comics": { "method": "fixed-list", "rankThreshold": 5, "newEntryOrRisingRank": true },
    "sns-buzz": { "method": "websearch", "minIndependentSources": 2 },
    "buzzwords": { "method": "fixed-list", "rankThreshold": 10 },
    "gourmet": { "method": "websearch", "minIndependentSources": 2 },
    "hobby": { "method": "websearch", "minIndependentSources": 2 },
    "fashion": { "method": "fixed-list", "rankThreshold": 10 },
    "gadgets": { "method": "fixed-list", "rankThreshold": 10 },
    "games": { "method": "fixed-list", "rankThreshold": 10 },
    "travel": { "method": "fixed-list", "rankThreshold": 10 },
    "economy-money": { "method": "websearch", "minIndependentSources": 2 }
  }
}
```

## 処理フロー

### 候補の型(前提)
```ts
// app/trend-digest/lib/candidateTypes.ts
export type Candidate = {
  genre: Genre
  title: string // 対象作品・話題そのものの原題(検索・重複判定の主キーとして扱う)
  sourceName: string
  sourceUrl: string
  method: SelectionMethod
  strength: number // 絞り込みの優先順位付けに使う数値。固定リスト: 100-順位(順位が高い=強い)。WebSearch: 独立情報源の言及数
  note?: string // 判定根拠のメモ(新規ランクイン/順位変動/独立情報源数など。ログ・PR本文向け)
}

export type SelectionResult =
  | { status: 'ok'; edition: Edition; topics: Candidate[] } // 絞り込み後、edition内ジャンル順に並んだ最終候補
  | { status: 'skipped'; edition: Edition; reason: string } // 対象9ジャンルすべてで候補が0件の場合のみ
```

### 固定リストジャンルの候補を収集・判定する処理(決定的なコード)
- 対象: `watchlist.json`の`method: 'fixed-list'`の12ジャンル(実行対象のeditionの9ジャンルのうち該当するもの)
- 手順:
  1. ジャンルごとに登録された各情報源(公式ランキング・チャートの公開ページ)へHTTPリクエストし、順位付きの一覧(作品名・現在の順位)を取得する。取得・パースに失敗した場合はその情報源だけを除外して処理を続ける(1件の取得失敗で編全体の収集を止めない)
  2. `newEntryOrRisingRank: true`のジャンル(music/foreign-drama/anime/streaming-video/books-comics)は、情報源のページ自体が前週比の順位変動(前週順位・NEW表記)を提供している場合はそれをそのまま使う。提供していない情報源は、直近`newEntryLookbackWeeks`週間分の過去記事(`content/trend-digest/articles/*.json`)の同ジャンルのトピックに同じ`title`(正規化後)が含まれていなければ「新規」とみなす。順位上昇の判定はページが変動値を提供する場合のみ行い、提供しない情報源では新規ランクインのみを候補条件にする(順位上昇の判定は諦める。要件の判定方法詳細を設計で補うための判断)【推測】
  3. `rankThreshold`のみのジャンル(japanese-movie/foreign-movie/buzzwords/fashion/gadgets/games/travel)は、現在の順位が`rankThreshold`以内の項目をすべて候補にする
  4. 候補ごとに`strength = 100 - 現在の順位`を設定する(順位が高いほど大きい値。musicのような上昇幅判定ジャンルは、上昇幅が大きいほど`strength`を加点する)【推測】
  5. 情報源ごとの取得件数(取得失敗・0件はその旨)を記録する(requirements.md#情報源の健全性監視-2)
- 関連するビジネスルール: requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-1〜9、requirements.md#データ取得方法-1、requirements.md#情報源の健全性監視-2

### WebSearchジャンルの候補を収集・判定する処理(エージェントの推論)
- 対象: `watchlist.json`の`method: 'websearch'`の6ジャンル(実行対象のeditionの9ジャンルのうち該当するもの)
- 手順:
  1. ジャンルごとの`searchHints`を手がかりに、Claude Code CLIのヘッドレス実行(WebSearchツール)で話題を検索する
  2. 複数の独立した情報源(ニュースメディア・公式発表等)が同じ話題を報じている場合のみ「動きがあった」候補にする。独立情報源数が`minIndependentSources`未満の話題(単一情報源のみ、噂・未確認情報の域を出ないもの)は候補にしない(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1)
  3. 候補ごとに、話題の名称(`title`)・代表的な出典1件(`sourceName`/`sourceUrl`。最初に見つかった情報源、または最も権威のあるメディアを1件選ぶ【推測】)・独立情報源の言及数(`strength`として使う)をJSONで返す
  4. 応答は指定のJSON配列単体とし、聞き返し・説明文のみの応答を返さない(ヘッドレス実行のため質問に応答する相手がいない。ai-dev-digest content-generationの応答形式ガードレールと同じ考え方)
  5. ジャンルごとの候補件数(0件はその旨)を記録する(requirements.md#情報源の健全性監視-2)
- 関連するビジネスルール: requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1〜6、requirements.md#情報源の健全性監視-2

### 掲載済み話題を除外する処理(決定的なコード)
- 対象: 収集した候補すべて(ジャンル内絞り込み・編全体の絞り込みより前に適用する)
- 手順:
  1. `content/trend-digest/articles/*.json`の全記事の全トピックから`sourceTitle`(後述「前提: 記事データの形式」参照)を集めた集合を作る。期間で絞らず全記事を対象にする
  2. 候補の`title`と集合内の`sourceTitle`を、比較前に正規化(前後の空白除去・全角/半角の統一・英字の大文字小文字統一)してから突き合わせる。正規化後に一致した候補を除外する(requirements.md#掲載済み話題の再掲抑制-1)
  3. すべての候補が除外され、そのジャンルで実在する候補が残らなかった場合は、そのジャンルは掲載しない(要件どおり。requirements.md#機能要件-3)
- 関連するビジネスルール: requirements.md#掲載済み話題の再掲抑制-1

### ジャンル内の絞り込みを行う処理(決定的なコード)
- 対象: 掲載済み話題の除外を通過した、1ジャンル分の候補
- 手順:
  1. 候補を`strength`の降順に並べる
  2. 候補が3件以上ある場合は上位2件に絞る。候補が0〜2件の場合はそのまま採用する(requirements.md#機能要件-4、requirements.md#ジャンル内の絞り込み-1〜2)
- 関連するビジネスルール: requirements.md#機能要件-4、requirements.md#ジャンル内の絞り込み-1〜2

### 編全体の絞り込みを行う処理(決定的なコード)
- 対象: 対象editionの9ジャンル分の絞り込み済み候補(各ジャンル最大2件、`strength`降順)
- 手順:
  1. 各ジャンルの1件目(最有力候補)をすべて先に採用する
  2. 採用件数が`perEditionMax`(10件)を超えない範囲で、各ジャンルの2件目を「固定リストジャンル→WebSearchジャンル」の順(ジャンルはwatchlist.jsonの登録順)に1件ずつ残りの枠へ追加する(requirements.md#配信全体の絞り込み-1)
  3. 採用された候補を、そのeditionの9ジャンルの定義順(requirements.md#グループとジャンル)に並べ替える(ジャンル見出しの表示順・LINE配信のトピック一覧順として使われる。[article-detail/design.md](../article-detail/design.md)・[line-broadcast/requirements.md](../line-broadcast/requirements.md)参照)
  4. 対象9ジャンルすべてで候補が1件も残らなかった場合のみ「候補不足によりスキップ」とする(requirements.md#機能要件-3、[weekly-publish/requirements.md#掲載件数の保証-1](../weekly-publish/requirements.md))
- 関連するビジネスルール: requirements.md#機能要件-5、requirements.md#配信全体の絞り込み-1

## エラーハンドリング

- 個々の情報源(固定リストジャンル)の取得失敗は、その情報源だけを除外して収集処理を続ける(処理フロー参照)。取得できなかった情報源はログに記録し、[source-review](../source-review/requirements.md)の月次見直しで妥当性を確認する
- WebSearchジャンルの検索・判定自体が失敗・応答不能だった場合、そのジャンルは「候補0件」として扱い、他のジャンルの収集・選定を止めない
- 対象editionの9ジャンルすべてで候補が0件の場合のみ、[weekly-publish](../weekly-publish/design.md)側が「候補不足によりスキップ」として扱う(1〜複数ジャンルが0件でも他のジャンルに候補があれば通常どおり記事を生成する。requirements.md#機能要件-3)

## 関連するファイル(抜粋)

```
content/trend-digest/watchlist.json (新規: ジャンル別情報源)
content/trend-digest/criteria.json (新規: 採用基準の数値)
app/trend-digest/lib/watchlistTypes.ts (新規: 型定義)
app/trend-digest/lib/candidateTypes.ts (新規: Candidate/SelectionResultの型定義)
app/trend-digest/lib/selection.ts (新規: 掲載済み除外・ジャンル内絞り込み・編全体の絞り込みの純粋関数。テスト可能)
app/trend-digest/lib/fetchFixedListCandidates.ts (新規: 固定リストジャンルの情報源取得・パース・順位判定)
scripts/trend-digest/collect-websearch-candidates.ts (新規: WebSearchジャンルのClaude Code CLIヘッドレス起動)
scripts/trend-digest/collect-and-select.ts (新規: fetchFixedListCandidates+collect-websearch-candidates+selection.tsを実行しSelectionResultをJSON標準出力するCLI。掲載済みトピックの読み込み(content/trend-digest/articles/*.json)もここで行う)
```

`selection.ts`は入出力が純粋なデータ(候補配列→選定結果)のみのため、通常のvitestで完全にテストできる。`fetchFixedListCandidates.ts`は外部ページへのHTTP呼び出しを伴うため、レスポンス形状のパース・エラー処理のみをモックしたテストの対象とし、実際の外部通信を伴う疎通確認は週次実行結果([weekly-publish](../weekly-publish/design.md))で代替する。`collect-websearch-candidates.ts`はClaude Code CLIのヘッドレス起動そのものであり、決定的なテストは書かず(ai-dev-digestのcontent-generationと同じ考え方)、応答形式の分類ロジックのみをテスト対象にする。

## セキュリティ

- 固定リストジャンルの情報源取得は、公式サイト・公開ページの閲覧の範囲にとどめ、非公式APIや利用規約を超えた高頻度アクセスは行わない(requirements.md#データ取得方法-1)。アクセス頻度は週2回(編ごと1回)の実行分のみ
- WebSearchジャンルの検索はClaude Code CLI標準のWebSearchツールの範囲で行い、追加のスクレイピング処理は持たない
- 食べログ・Rettyの有料APIやX/Instagram/Threads/TikTokの公式APIは利用しない(requirements.md#選定方式-4〜5、スコープ外)

## ログ

- 週次実行のログに、ジャンルごとに「収集した候補件数(取得失敗・検索失敗はその旨)」を標準エラー出力へ記録する(requirements.md#情報源の健全性監視-1)
- 候補件数が0件だった情報源・ジャンルは警告(`WARN`)と分かる形で出力する(慢性的な0件を月次見直しで拾えるようにするため)
- 掲載済み話題として除外した候補の件数も記録する(絞り込みの過程が追えるようにするため)
- 対象editionの9ジャンルすべてで候補が0件の場合は、その旨を明確に標準エラー出力へ記録する。[weekly-publish](../weekly-publish/design.md)側は標準出力のJSONの`status`フィールドを見てPRを作成しない判断に使う
