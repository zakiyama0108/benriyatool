# 設計: ジャンル別情報源と採用基準

## サマリ
19ジャンルを「固定リストジャンル」(12ジャンル、実際の消費・行動を集計した客観データをコードで定量判定)と「WebSearchジャンル」(7ジャンル、Claude Code CLIのWebSearchによるLLM判定)に分け、エンタメ編9ジャンル・カルチャー編10ジャンルの項目を収集する。取得した項目は採用基準の判定前の全件を[trend-history](../trend-history/design.md)の観測ログへ書き出し、そこで判定された継続度ラベル・注目度ラベル・掲載実績を使って各ジャンルから1件ずつを選ぶ。判定基準の数値・情報源は`content/trend-digest/watchlist.json`・`criteria.json`に機械可読データとして持ち、[source-review](../source-review/requirements.md)の月次見直しで更新する(データ設計・処理フロー・図は下記参照)。

初回配信の実運用で、汎用の正規表現1つで全情報源のHTMLを解析する方式が、JS描画・Bot対策・サイトごとに異なる順位表現(テキスト/CSSクラス/画像)に対応できず、ほぼ全滅した。この反省を踏まえ、情報源は「構造化データ(TSV/RSS/公式Web API)」を最優先し、それが無い場合のみ「サイトごとの専用パーサー」を用意する方針を採る(下記「データ設計」参照)。

## 設計の前提(エージェントの推論とコードの役割分担)

architecture.mdが定める2つの選定方式を、実装形態として次のように役割分担する(要件は方式の呼び名までは決めているが実装形態は指定していないため設計判断):

- **固定リストジャンル(12ジャンル)**: 「対象作品・話題が採用基準を満たすか」の判定は決定的なコード(TypeScript純粋関数)で行う。実際の売上・視聴・検索行動を集計した客観データという構造化された情報源を前提にしており、順位・新規ランクイン等の比較は算術的に検証可能なため
- **WebSearchジャンル(7ジャンル)**: 「独立した言及が広がっているか」の判定自体をClaude Code CLIのヘッドレス実行(WebSearchツール使用)に委ねる。客観集計データが存在せず、性質の異なる複数の言及元(メディア記事・SNS・口コミ)を横断した意味的な判断が必要なため、コード化になじまない
- 掲載する話題の選び方(各ジャンル1件)は、両方式で共通の決定的なコードとして実装する(継続度ラベル・注目度ラベル・掲載実績の比較で完結するため)

## データ設計(ウォッチリスト・採用基準)

ウォッチリスト・採用基準は`requirements.md`(人間が読む正の仕様)と、実行時にコードが読み込む機械可読データの二重管理とする。[source-review](../source-review/requirements.md)の月次見直しPRは、同じ変更を`requirements.md`とこの機械可読データの両方に加える(片方だけの変更はレビューで差し戻す。ai-dev-digestのwatchlist-reviewと同じ運用)。

`Edition`/`Genre`は[article-detail/design.md](../article-detail/design.md)「前提: 記事データの形式」が定義する`app/trend-digest/lib/types.ts`のものをそのまま再利用する(同spec冒頭のとおり、記事データの型は本specを含む他specが共通して従う。ここで型を再定義しない)。

```ts
// app/trend-digest/lib/watchlistTypes.ts
import type { Edition, Genre } from './types' // article-detail/design.mdが定義する型を再利用(重複定義しない)
import type { HistoryCriteria } from './historyTypes' // trend-history/design.mdが定義するステータス判定の閾値

export type SelectionMethod = 'fixed-list' | 'websearch'

// 固定リストジャンルの情報源が、どの取得・パース処理を使うかを表す
// (初回配信で汎用の正規表現1パターンが実際のサイト構造に対応しきれなかった反省から、
// 構造化データを最優先し、無い場合のみサイトごとの専用パーサーを用意する方針にした)
export type FixedListSourceFormat =
  | 'structured-tsv' // 公式の構造化データ(タブ区切り)をそのまま取得する。例: Netflix公式Top10データ
  | 'structured-rss' // 公式のRSSフィードをそのまま取得する。例: Google公式トレンドRSS
  | 'structured-json-api' // 公式Web APIのJSONレスポンスをそのまま取得する。例: Steam公式Web API
  | 'site-specific-html' // サイトごとに専用のパース関数(`scripts/trend-digest/sourceParsers/<parserId>.ts`)でHTMLから抽出する

// 情報源の地域区分(requirements.md#情報源の地域区分-1)。
// trend-historyの日本での強度・海外での強度の判定に使う
export type SourceRegion = 'japan' | 'overseas'

export type WatchlistEntry = {
  genre: Genre
  edition: Edition
  label: string // 表示・PR本文用の日本語ジャンル名(例: "音楽")
  method: SelectionMethod
  sources: Array<{
    name: string
    url: string
    format?: FixedListSourceFormat // 固定リストジャンルのみ必須
    parserId?: string // format: 'site-specific-html'のみ必須。scripts/trend-digest/sourceParsers/配下のモジュール名
    region: SourceRegion // その情報源が日本の流行と海外の流行のどちらを映すかの区分
  }> // 固定リストジャンルの情報源。WebSearchジャンルは検索の手がかりとして空でもよい
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
  minIndependentSources: number // 「独立した言及が広がっている」と判定する最低独立言及元数(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-2)
}

export type Criteria = {
  perGenreMax: number // 1ジャンルの最大掲載数(requirements.md#機能要件-6 = 2)
  perEditionMax: number // 1回の最大掲載数(requirements.md#機能要件-7 = 10)
  newEntryLookbackWeeks: number // 「新規ランクイン」を判定する際、何週間分の過去記事の掲載トピックを参照するか
  genreCriteria: Record<Genre, FixedListGenreCriteria | WebSearchGenreCriteria>
  history: HistoryCriteria // 中長期ステータス判定の閾値(trend-history/design.md「履歴データの形式」)
}
```

`watchlist.json`の初期値(全19ジャンル。sourcesはrequirements.mdの各ジャンル節の情報源をそのまま構造化したもの。URLは実際にアクセスして生存確認済み[2026-09-19時点]。`region`はその情報源が日本の流行と海外の流行のどちらを映すかの区分):

```json
{
  "genres": [
    { "genre": "music", "edition": "entertainment", "label": "音楽", "method": "fixed-list",
      "sources": [
        { "name": "Billboard JAPAN Hot 100", "url": "https://www.billboard-japan.com/charts/detail?a=hot100", "format": "site-specific-html", "parserId": "billboardJapan", "region": "japan" }
      ] },
    { "genre": "japanese-movie", "edition": "entertainment", "label": "日本映画", "method": "fixed-list",
      "sources": [
        { "name": "興行通信社CINEMAランキング通信(国内)", "url": "https://www.kogyotsushin.com/", "format": "site-specific-html", "parserId": "kogyoTsushin", "region": "japan" },
        { "name": "映画.com国内ランキング", "url": "https://eiga.com/ranking/jp/", "format": "site-specific-html", "parserId": "eigaCom", "region": "japan" },
        { "name": "Filmarks上映中ランキング", "url": "https://filmarks.com/list/now", "format": "site-specific-html", "parserId": "filmarks", "region": "japan" }
      ] },
    { "genre": "foreign-movie", "edition": "entertainment", "label": "海外映画", "method": "fixed-list",
      "sources": [
        { "name": "映画.com全米ランキング", "url": "https://eiga.com/ranking/us/", "format": "site-specific-html", "parserId": "eigaCom", "region": "overseas" },
        { "name": "Filmarks上映中ランキング", "url": "https://filmarks.com/list/now", "format": "site-specific-html", "parserId": "filmarks", "region": "japan" }
      ] },
    { "genre": "japanese-drama", "edition": "entertainment", "label": "日本ドラマ", "method": "fixed-list",
      "sources": [{ "name": "ビデオリサーチ ドラマ視聴率速報", "url": "https://www.videor.co.jp/tvrating/daily/drama/", "format": "site-specific-html", "parserId": "videoResearch", "region": "japan" }] },
    { "genre": "foreign-drama", "edition": "entertainment", "label": "海外ドラマ", "method": "fixed-list",
      "sources": [{ "name": "Netflix公式Top10データ(シリーズ・日本)", "url": "https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv", "format": "structured-tsv", "region": "japan" }] },
    { "genre": "anime", "edition": "entertainment", "label": "アニメ", "method": "fixed-list",
      "sources": [{ "name": "Netflix公式Top10データ(日本のTOP10)", "url": "https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv", "format": "structured-tsv", "region": "japan" }] },
    { "genre": "variety", "edition": "entertainment", "label": "バラエティ", "method": "fixed-list",
      "sources": [{ "name": "ビデオリサーチ バラエティ視聴率速報", "url": "https://www.videor.co.jp/tvrating/past_tvrating/variety/", "format": "site-specific-html", "parserId": "videoResearch", "region": "japan" }] },
    { "genre": "streaming-video", "edition": "entertainment", "label": "サブスク動画", "method": "fixed-list",
      "sources": [{ "name": "Netflix公式Top10データ(映画・日本)", "url": "https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv", "format": "structured-tsv", "region": "japan" }] },
    { "genre": "books-comics", "edition": "entertainment", "label": "書籍・漫画", "method": "fixed-list",
      "sources": [
        { "name": "トーハン週間ベストセラー", "url": "https://www.tohan.jp/bestsellers/", "format": "site-specific-html", "parserId": "tohan", "region": "japan" },
        { "name": "日販週間ベストセラー", "url": "https://www.nippan.co.jp/ranking/weekly/", "format": "site-specific-html", "parserId": "nippan", "region": "japan" }
      ] },    { "genre": "sns-buzz", "edition": "culture-lifestyle", "label": "SNSバズり", "method": "websearch",
      "searchHints": ["Xで話題 バズり 複数メディア", "TikTok 投稿 話題 反響", "Instagram Threads 投稿 話題", "ねとらぼ grape TREND Sirabee SNS 話題"] },
    { "genre": "buzzwords", "edition": "culture-lifestyle", "label": "流行りの言葉", "method": "fixed-list",
      "sources": [{ "name": "Google公式トレンドRSS(日本)", "url": "https://trends.google.com/trending/rss?geo=JP", "format": "structured-rss", "region": "japan" }] },
    { "genre": "gourmet", "edition": "culture-lifestyle", "label": "グルメ", "method": "websearch",
      "searchHints": ["SNS 口コミ 急増 飲食店", "話題 食トレンド 自然発生 SNS", "macaroniトレンド 話題の食べ方"] },
    { "genre": "hobby", "edition": "culture-lifestyle", "label": "流行りの趣味", "method": "websearch",
      "searchHints": ["新しい趣味 SNS 話題 広がり", "ホビー トレンド 複数メディア言及"] },
    { "genre": "fashion", "edition": "culture-lifestyle", "label": "ファッション", "method": "websearch",
      "searchHints": ["SNS 口コミ 急増 ファッションアイテム", "FASHION PRESS WWD JAPAN トレンド 話題"] },
    { "genre": "gadgets", "edition": "culture-lifestyle", "label": "ガジェット・家電", "method": "websearch",
      "searchHints": ["SNS 口コミ 急増 ガジェット 家電", "GIZMODO 家電Watch ITmedia 話題の製品"] },
    { "genre": "games", "edition": "culture-lifestyle", "label": "ゲーム", "method": "fixed-list",
      "sources": [
        { "name": "Steam公式Web API(プレイヤー数)", "url": "https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/", "format": "structured-json-api", "region": "overseas" },
        { "name": "ファミ通.com売上ランキング", "url": "https://www.famitsu.com/ranking/game-sales/", "format": "site-specific-html", "parserId": "famitsu", "region": "japan" }
      ] },
    { "genre": "travel", "edition": "culture-lifestyle", "label": "旅行・観光", "method": "fixed-list",
      "sources": [{ "name": "じゃらんnet人気ランキング", "url": "https://www.jalan.net/news/", "format": "site-specific-html", "parserId": "jalan", "region": "japan" }] },
    { "genre": "economy-money", "edition": "culture-lifestyle", "label": "経済・お金", "method": "websearch",
      "searchHints": ["流行っている節約術 SNS 口コミ", "話題のクーポン サービス 複数メディア", "LIMO ファイナンシャルフィールド 話題の節約"] },
    { "genre": "dev-trends", "edition": "culture-lifestyle", "label": "開発手法・開発サービス", "method": "websearch",
      "searchHints": ["ソフトウェア開発 手法 潮流 複数メディア", "開発者 注目のサービス SNS 言及", "開発チーム 進め方 変化 議論"] }
  ]
}
```

補足(情報源から外したサイト): Oricon週間チャート・ZOZOTOWN人気ランキング・Engadget日本版(2022年サイト閉鎖)・るるぶ&more!トップページ・Googleトレンド急上昇ワードページ・Yahoo!検索急上昇ワードページは、いずれもJS描画・Bot対策・サイト閉鎖のいずれかで機械的な取得ができないため情報源から外した。旅行・観光のるるぶ&more!は記事一覧ページ(`rurubu.jp/andmore/article`)であれば取得できる可能性があるため、[source-review](../source-review/requirements.md)で追加候補として再検証する。

`criteria.json`の初期値(妥当性は運用実績を見て[source-review](../source-review/requirements.md)で見直す。`history`の各値の意味は[trend-history/design.md](../trend-history/design.md)「履歴データの形式」参照):
```json
{
  "perGenreMax": 2,
  "perEditionMax": 10,
  "newEntryLookbackWeeks": 4,
  "genreCriteria": {
    "music": { "method": "fixed-list", "newEntryOrRisingRank": true, "risingRankMinImprovement": 10 },
    "japanese-movie": { "method": "fixed-list", "rankThreshold": 5 },
    "foreign-movie": { "method": "fixed-list", "rankThreshold": 5 },
    "japanese-drama": { "method": "fixed-list", "rankThreshold": 5 },
    "foreign-drama": { "method": "fixed-list", "newEntryOrRisingRank": true },
    "anime": { "method": "fixed-list", "newEntryOrRisingRank": true },
    "variety": { "method": "fixed-list", "rankThreshold": 5 },
    "streaming-video": { "method": "fixed-list", "newEntryOrRisingRank": true },
    "books-comics": { "method": "fixed-list", "rankThreshold": 5, "newEntryOrRisingRank": true },
    "sns-buzz": { "method": "websearch", "minIndependentSources": 3 },
    "buzzwords": { "method": "fixed-list", "rankThreshold": 10 },
    "gourmet": { "method": "websearch", "minIndependentSources": 3 },
    "hobby": { "method": "websearch", "minIndependentSources": 3 },
    "fashion": { "method": "websearch", "minIndependentSources": 3 },
    "gadgets": { "method": "websearch", "minIndependentSources": 3 },
    "games": { "method": "fixed-list", "rankThreshold": 10 },
    "travel": { "method": "fixed-list", "rankThreshold": 10 },
    "economy-money": { "method": "websearch", "minIndependentSources": 3 },
    "dev-trends": { "method": "websearch", "minIndependentSources": 3 }
  },
  "history": { "...": "継続度ラベル・注目度ラベルの判定に使う値。キーと初期値・その根拠は trend-history/design.md「履歴データの形式」が定義する" }
}
```

`history`の中身(キー・初期値・根拠)は[trend-history/design.md](../trend-history/design.md)「履歴データの形式」を唯一の情報源とし、本specでは全文を再掲しない(片方だけが更新される事故を避けるため)。本specは`criteria.json`の中に`history`という区画があることだけを示す。

`dev-trends`(開発手法・開発サービス)だけ`minIndependentSources`を3にしている。ai-dev-digestと扱う領域が重なるジャンルであり、「個々のリリースではなく複数の情報源が論じている潮流」だけを拾うという要件(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-7)を、他のWebSearchジャンルより厳しい情報源数で担保するため。

## 処理フロー

### 候補の型(前提)
```ts
// app/trend-digest/lib/candidateTypes.ts
import type { Edition, Genre } from './types' // article-detail/design.mdが定義する型を再利用(重複定義しない)
import type { SelectionMethod } from './watchlistTypes'
import type { TrendStatus } from './historyTypes' // trend-history/design.mdが定義する中長期ステータス

export type Candidate = {
  genre: Genre
  title: string // 対象作品・話題そのものの原題(検索・重複判定の主キーとして扱う)
  sourceName: string
  sourceUrl: string
  method: SelectionMethod
  strength: number // 絞り込みの優先順位付けに使う数値。固定リスト: 100-順位(順位が高い=強い)。WebSearch: 独立情報源の言及数
  rank: number | null // 固定リストジャンルの順位付きランキング型の情報源から取れた候補のその回の順位(1が最上位)。
                      // 新着記事一覧型の候補とWebSearchジャンルの候補はnull。trend-historyの増減判定に渡す(trend-history/requirements.md#ステータス判定基準-9)
  originRegion: string | null // 発祥地域。判定できない場合はnull(=不明。trend-history/requirements.md#地域情報-1)
  currentRegions: string[] // 現在の主な流行地域。判定できない場合は空配列(=不明)
  strengthJapan: number | null // 日本の情報源での言及数。判定できない場合はnull
  strengthOverseas: number | null // 海外の情報源での言及数。判定できない場合はnull
  note?: string // 判定根拠のメモ(新規ランクイン/順位変動/独立情報源数など。ログ・PR本文向け)
}

// 中長期トレンドの絞り込みを通過した候補。ステータス・掲載実績が確定している
export type PublishableCandidate = Candidate & {
  status: TrendStatus
  continuationDays: number
  firstDetectedDate: string
  reportCount: number // 今回掲載した場合に通算何回目の報告になるか(requirements.md#掲載済み話題の再掲抑制-4)
}

export type SelectionResult =
  | { status: 'ok'; edition: Edition; topics: PublishableCandidate[] } // 絞り込み後、edition内ジャンル順に並んだ最終候補
  | { status: 'skipped'; edition: Edition; reason: string } // 掲載可能な候補が1件も残らなかった場合
```

### 固定リストジャンルの候補を収集・判定する処理(決定的なコード)
- 対象: `watchlist.json`の`method: 'fixed-list'`の12ジャンル(実行対象のeditionのジャンルのうち該当するもの)
- 手順:
  1. ジャンルごとに登録された各情報源を、`format`に応じた取得処理で取得する。取得・パースに失敗した場合はその情報源だけを除外して処理を続ける(1件の取得失敗で編全体の収集を止めない)
     - `structured-tsv`/`structured-rss`/`structured-json-api`: 公式の構造化データをそのまま取得しパースする(HTML解析を要さないため最も安定している)
     - `site-specific-html`: `parserId`が指す`scripts/trend-digest/sourceParsers/<parserId>.ts`の専用パース関数でHTMLから順位付きの一覧(作品名・現在の順位)を抽出する。取得時は一般的なブラウザのUser-Agentを付与し(requirements.md#データ取得方法-2)、文字コードはページのContent-Type/meta指定に従って変換する(Shift-JIS等のページをUTF-8決め打ちで読まない)
  2. **採用基準の判定を行う前に、手順1で取得した一覧の全項目を「その回の観測」として保持する**(ジャンル・名称・順位)。情報源ごとに上位`maxObservationsPerSource`件までとし、以降の手順で採用基準を満たさなかった項目も含めてすべて[trend-history](../trend-history/design.md)の観測ログへ記録する(requirements.md#機能要件-3、[trend-history/requirements.md#機能要件](../trend-history/requirements.md)-1〜4)。採用基準は「記事に載せるか」の判断にのみ使い、「履歴に記録するか」には使わない。`newEntryOrRisingRank`のジャンルで採用基準を記録の条件にすると、上位に居続けている作品は動きがあった回しか記録されず、人気が定着している作品ほど履歴から消えてしまうため
  3. `newEntryOrRisingRank: true`のジャンル(music/foreign-drama/anime/streaming-video/books-comics)は、情報源が前週比の順位変動(前週順位・NEW表記・Netflix TSVなら前週分の行)を提供している場合はそれをそのまま使う。提供していない情報源は、直近`newEntryLookbackWeeks`週間分の過去記事(`content/trend-digest/articles/*.json`)の同ジャンルのトピックに同じ`title`(正規化後)が含まれていなければ「新規」とみなす
  4. `rankThreshold`のみのジャンル(japanese-movie/foreign-movie/japanese-drama/variety/buzzwords/games/travel)は、現在の順位が`rankThreshold`以内の項目をすべて候補にする。buzzwords(流行りの言葉)の情報源(Google公式トレンドRSS)は、掲載されている項目自体が既に「一過性の話題性がある語」に該当するものだけであるため、順位判定に加えた定性的な絞り込みは行わない(requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-6)
  5. `rankThreshold`と`newEntryOrRisingRank`の両方を持つジャンル(books-comics)は、手順3の新規ランクイン・順位上昇の判定に加えて、いずれかの情報源(トーハン・日販)で現在の順位が`rankThreshold`(5位)以内であることも満たす項目だけを候補にする(いずれか一方だけでは候補にしない。requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-5「いずれかで上位5位以内にランクインした作品」を反映するための判断)
  6. 候補ごとに`strength = 100 - 現在の順位`を設定する(順位が高いほど大きい値。musicのような上昇幅判定ジャンルは、上昇幅が大きいほど`strength`を加点する)。複数情報源で同じ作品が候補になった場合(books-comicsのトーハン・日販等)は、より順位が高い方の`strength`を採用する
  7. 観測項目ごとに`rank`(その回の順位。1が最上位)を、情報源から取得した値そのままで設定する。`strength`からの逆算ではなく順位そのものを持つのは、musicのような上昇幅加点があるジャンルでは`100 - strength`が実際の順位と一致しないため([trend-history/requirements.md#注目度ラベル](../trend-history/requirements.md))
  8. 観測項目ごとに、それを検出した情報源の`region`から日本での強度・海外での強度を数える。`region: 'japan'`の情報源で検出された件数を日本での強度、`region: 'overseas'`の情報源で検出された件数を海外での強度とする。一方の区分の情報源が1件も登録されていないジャンルでは、その区分の強度を「不明」(値なし)として扱う(0件だったことと、そもそも測れないことを区別するため。requirements.md#情報源の地域区分-1)。発祥地域・現在の主な流行地域は、ランキングページからは判定できないため「不明」として扱う(推測で埋めない)
  9. 情報源ごとの取得件数(取得失敗・0件はその旨)を記録する(requirements.md#情報源の健全性監視-1)
- 関連するビジネスルール: requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-1〜8、requirements.md#情報源の地域区分-1、requirements.md#データ取得方法-1〜2、requirements.md#情報源の健全性監視-1

### サイトごとの専用パーサー(`scripts/trend-digest/sourceParsers/`)
- 初回配信の実運用で、1つの正規表現パーサーで全HTML情報源を解析する方式は、サイトごとに異なる順位表現(プレーンテキスト・CSSクラス名・画像スプライト等)に対応できず機能しなかった。このためサイトごとに専用のパース関数を用意する(`billboardJapan.ts`/`kogyoTsushin.ts`/`eigaCom.ts`/`filmarks.ts`/`videoResearch.ts`/`tohan.ts`/`nippan.ts`/`famitsu.ts`/`jalan.ts`の9ファイル)
- 各パーサーは`(html: string) => RankedItem[]`の形の純粋関数とし、そのサイトのHTML構造(セレクタ・CSSクラス名等)に関する実装コメントを関数ごとに残す(トーハン・日販は順位がCSSクラス名(`rank-1st`等)で表現されている点など、サイト固有の癖はコメントで明示する)。実際のHTML構造検証は疎通確認(週次実行結果)で代替する方針は維持する(`fetchSourcePage.ts`の既存コメント参照)
- サイト構造が変わりパーサーが機能しなくなった場合は、そのパーサーだけを[source-review](../source-review/requirements.md)の月次見直しで修正する(1サイトの構造変更が他ジャンルに波及しない)

### WebSearchジャンルの候補を収集・判定する処理(エージェントの推論)
- 対象: `watchlist.json`の`method: 'websearch'`の7ジャンル(実行対象のeditionのジャンルのうち該当するもの)
- 手順:
  1. ジャンルごとの`searchHints`を手がかりに、Claude Code CLIのヘッドレス実行(WebSearchツール)で話題を検索する。検索の切り口は固定の少数サイトに限定せず、複数の異なる角度(ニュースメディア・まとめメディア・SNS上の言及・口コミ)から広く探索する(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-3)
  2. **採用基準の判定を行う前に、検索で見つかった話題を上位`maxObservationsPerSource`件まで「その回の観測」として保持する**(話題の名称・独立言及元の数)。以降の手順で`minIndependentSources`未満として候補から外れた話題も含め、これらはすべて[trend-history](../trend-history/design.md)の観測ログへ記録する(requirements.md#機能要件-3、[trend-history/requirements.md#機能要件](../trend-history/requirements.md)-1〜4)。言及元が1件しかない段階の話題を記録しないと、後に3件へ伸びたときの初回検知日が実態より後ろにずれ、継続日数が過小評価されるため
  3. 性質の異なる複数の独立した言及元(ニュースメディアの記事、SNS上での言及、口コミ・レビューサイトでの評判増加等)が同じ話題を独立に言及している場合のみ「動きがあった」**候補**にする。同一運営者・同一記事の転載は1件として数える。単一の情報源のみ、または広告・PR記事1本のみが取り上げている話題、噂・未確認情報の域を出ない話題は候補にしない(観測ログには手順2のとおり残る。requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1)
  4. 独立した言及元の数が`minIndependentSources`(既定3件)未満の話題は候補にしない
  5. `dev-trends`(開発手法・開発サービス)は、個々の製品リリース・バージョンアップを報じる記事だけを根拠にした話題を候補にしない。複数の情報源が開発の進め方・道具立ての変化として論じている話題だけを候補にする(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-10)
  6. 候補ごとに、話題の名称(`title`)・代表的な出典1件(`sourceName`/`sourceUrl`。最も権威のある、または最初に見つかった情報源を1件選ぶ)・独立した言及元の数(`strength`として使う)・言及元の内訳(`note`。例: "ニュースメディア2件+SNS言及1件"。ログ・PR本文で「本当に広がりがあるか」を人間が確認できるようにするため)をJSONで返す
  7. あわせて、言及していた独立情報源のうち日本のメディアの数・海外のメディアの数、および記事の記述から判定できた場合のみ発祥地域・現在の主な流行地域を返す。判定できない項目は「不明」(値なし・空)として返し、推測で埋めない(requirements.md#情報源の地域区分-2、[trend-history/requirements.md#地域情報](../trend-history/requirements.md))
  8. 応答は指定のJSON配列単体とし、聞き返し・説明文のみの応答を返さない(ヘッドレス実行のため質問に応答する相手がいない。ai-dev-digest content-generationの応答形式ガードレールと同じ考え方)
  9. ジャンルごとの観測項目数と候補件数(0件はその旨)を分けて記録する(requirements.md#情報源の健全性監視-1)
- 関連するビジネスルール: requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1〜10、requirements.md#情報源の地域区分-2、requirements.md#情報源の健全性監視-1

### 全観測項目を履歴へ記録する処理(決定的なコード)
- 対象: 固定リストジャンル・WebSearchジャンルから収集した観測項目すべて(採用基準の判定前の全件)
- 手順:
  1. 収集した全観測項目を[trend-history/design.md](../trend-history/design.md)「その回の観測を履歴に記録する処理」へ引き渡し、その回の観測ログを書き出させる(requirements.md#機能要件-3)。引き渡す値には強度だけでなく**その回の順位**と**採用基準を満たしたかどうか**も含める(順位は固定リストジャンルのみ。WebSearchジャンルは順位なしとして渡す)
  2. 観測ログの書き出しが失敗した場合は、以降の選定・記事生成を行わずに実行を失敗させる([trend-history/design.md](../trend-history/design.md)のエラーハンドリング参照)
- 関連するビジネスルール: requirements.md#機能要件-3

### 掲載済み話題を除外する処理(決定的なコード)
- 対象: 中長期トレンドの絞り込みを通過した候補(ジャンル内絞り込み・編全体の絞り込みより前に適用する)
- 手順:
  1. [trend-history/design.md](../trend-history/design.md)「掲載実績(報告回数・前回掲載時のステータス)を求める処理」から、候補ごとの過去の掲載回数と前回掲載時のステータスを受け取る
  2. 過去に掲載されたことがない候補は、そのまま残し報告回数を1とする
  3. 過去に掲載されたことがある候補は、前回掲載時のステータスと今回のステータスを比べる。同じ場合は除外し、異なる場合は続報として残す(requirements.md#掲載済み話題の再掲抑制-1〜2)
  4. 前回掲載時のステータスが不明な候補(この機能の導入より前に生成された記事にのみ掲載されている候補)は、除外する(requirements.md#掲載済み話題の再掲抑制-3)
  5. 残した候補の報告回数を「過去の掲載回数 + 1」として設定する(requirements.md#掲載済み話題の再掲抑制-4)
  6. 同一話題かどうかの突き合わせは、候補の`title`と過去記事の`sourceTitle`([article-detail/design.md](../article-detail/design.md)「前提: 記事データの形式」参照)を、trend-historyと同じ正規化関数(前後の空白除去・全角/半角の統一・英字の大文字小文字統一)にかけてから行う。正規化ルールを二重に持たず、`selection.ts`の`normalizeTitle`を両specで共用する(requirements.md#掲載済み話題の再掲抑制-5)
  7. すべての候補が除外され、そのジャンルで残る候補がなくなった場合は、そのジャンルは掲載しない(requirements.md#機能要件-5)
- 関連するビジネスルール: requirements.md#掲載済み話題の再掲抑制-1〜5

### ジャンル内の絞り込みを行う処理(決定的なコード)
- 対象: 掲載済み話題の除外を通過した、1ジャンル分の候補
- 手順:
  1. 候補を`strength`の降順に並べる
  2. 候補が3件以上ある場合は上位2件に絞る。候補が0〜2件の場合はそのまま採用する(requirements.md#機能要件-6、requirements.md#ジャンル内の絞り込み-1〜2)
- 関連するビジネスルール: requirements.md#機能要件-6、requirements.md#ジャンル内の絞り込み-1〜2

### 編全体の絞り込みを行う処理(決定的なコード)
- 対象: 対象editionのジャンル分(エンタメ編9ジャンル・カルチャー編10ジャンル)の絞り込み済み候補(各ジャンル最大2件、`strength`降順)
- 手順:
  1. 各ジャンルの1件目(最有力候補)をすべて先に採用する
  2. 採用件数が`perEditionMax`(10件)を超えない範囲で、各ジャンルの2件目を「固定リストジャンル→WebSearchジャンル」の順(ジャンルはwatchlist.jsonの登録順)に1件ずつ残りの枠へ追加する(requirements.md#配信全体の絞り込み-1)
  3. 採用された候補を、そのeditionのジャンルの定義順(requirements.md#グループとジャンル)に並べ替える(ジャンル見出しの表示順・LINE配信のトピック一覧順として使われる。[article-detail/design.md](../article-detail/design.md)・[line-broadcast/requirements.md](../line-broadcast/requirements.md)参照)
  4. 対象editionのすべてのジャンルで候補が1件も残らなかった場合のみ「候補不足によりスキップ」とする(requirements.md#機能要件-5、[weekly-publish/requirements.md#掲載件数の保証-1](../weekly-publish/requirements.md))。カルチャー編は1件目だけで10ジャンル分となり`perEditionMax`と同数になるため、2件目が採用されるのは1件目が10ジャンル未満しか埋まらなかった回に限られる
- 関連するビジネスルール: requirements.md#機能要件-7、requirements.md#配信全体の絞り込み-1

## エラーハンドリング

- 個々の情報源(固定リストジャンル)の取得失敗は、その情報源だけを除外して収集処理を続ける(処理フロー参照)。取得できなかった情報源はログに記録し、[source-review](../source-review/requirements.md)の月次見直しで妥当性を確認する
- WebSearchジャンルの検索・判定自体が失敗・応答不能だった場合、そのジャンルは「候補0件」として扱い、他のジャンルの収集・選定を止めない
- 観測ログの書き出しの失敗・履歴データの破損は、[trend-history](../trend-history/design.md)のエラーハンドリングのとおり実行を失敗させる(収集失敗と異なり、履歴の欠落は以後の全ステータス判定に影響し続けるため、握りつぶさない)
- 掲載可能な候補が対象editionで1件も残らなかった場合は、[weekly-publish](../weekly-publish/design.md)側が「候補不足によりスキップ」として扱う。収集自体が0件だった場合と、収集はできたが中長期トレンドの絞り込み・再掲抑制で全件除外された場合の両方がこれに当たり、ログではそれぞれを区別して記録する

## 関連するファイル(抜粋)

```
content/trend-digest/watchlist.json (既存: 情報源をformat/parserId付きに刷新・dev-trendsジャンルの追加・各情報源へのregion付与)
content/trend-digest/criteria.json (既存: genreCriteria・minIndependentSourcesの更新とhistoryの値を追加)
app/trend-digest/lib/types.ts (既存: Genreにdev-trendsを追加、GENRE_ORDER・GENRE_LABELSも更新)
app/trend-digest/lib/watchlistTypes.ts (既存: FixedListSourceFormat・SourceRegionの追加、CriteriaへのhistoryとWatchlistEntryのsourcesへのregion追加)
app/trend-digest/lib/candidateTypes.ts (既存: Candidateへの順位・地域情報の追加)
app/trend-digest/lib/historyTypes.ts (trend-historyで新規作成: 継続度・注目度の型を利用)
app/trend-digest/lib/selection.ts (既存: 掲載する話題の選び方の書き換え。normalizeTitleはtrend-historyと共用)
app/trend-digest/lib/fetchFixedListCandidates.ts (既存: format別のディスパッチ・順位の保持・regionからの地域強度の集計)
scripts/trend-digest/fetchSourcePage.ts (既存: HTTP取得・文字コード変換・User-Agent付与。サイト固有パースはsourceParsers/へ委譲するよう更新)
scripts/trend-digest/sourceParsers/billboardJapan.ts, kogyoTsushin.ts, eigaCom.ts, filmarks.ts, videoResearch.ts, tohan.ts, nippan.ts, famitsu.ts, jalan.ts (新規: サイトごとの専用パーサー)
scripts/trend-digest/fetchStructuredSource.ts (新規: structured-tsv/structured-rss/structured-json-apiの取得・パース)
scripts/trend-digest/collect-websearch-candidates.ts (既存: 独立言及元の定義・minIndependentSources引き上げ・観測項目の保持・地域情報の収集をプロンプト/応答形式に反映)
scripts/trend-digest/collect-and-select.ts (既存: 観測ログの書き出しと、継続度・注目度にもとづく選定の呼び出しを追加)
```

`selection.ts`は入出力が純粋なデータ(候補配列・判定結果→選定結果)のみのため、通常のvitestで完全にテストできる。`sourceParsers/`配下の各パーサーは、実際に取得したHTMLをテストフィクスチャとして保存し(`__tests__/trend-digest/fixtures/sourceParsers/`)、それを入力とした純粋関数のテストとして書く(サイトごとに構造が異なるため、パーサー単位で決定的にテストできる)。`fetchSourcePage.ts`・`fetchStructuredSource.ts`は外部ページ・APIへのHTTP呼び出しを伴うため、レスポンス形状のパース・エラー処理・文字コード変換のみをモックしたテストの対象とし、実際の外部通信を伴う疎通確認は週次実行結果([weekly-publish](../weekly-publish/design.md))で代替する。`collect-websearch-candidates.ts`はClaude Code CLIのヘッドレス起動そのものであり、決定的なテストは書かず(ai-dev-digestのcontent-generationと同じ考え方)、応答形式の分類ロジックのみをテスト対象にする。

## セキュリティ

- 固定リストジャンルの情報源取得は、公式サイト・公開ページの閲覧、および公式が提供する構造化データ・Web APIの利用にとどめ、非公式APIや利用規約を超えた高頻度アクセスは行わない(requirements.md#データ取得方法-1)。アクセス頻度は週2回(編ごと1回)の実行分のみで、履歴の蓄積のために収集頻度を上げることはしない(requirements.md#スコープ外)
- 公開ページの取得時に付与するUser-Agentは一般的なブラウザのものとし、Bot判定回避を目的としたヘッダー偽装・認証回避は行わない(requirements.md#データ取得方法-2)
- WebSearchジャンルの検索はClaude Code CLI標準のWebSearchツールの範囲で行い、追加のスクレイピング処理は持たない
- 食べログ・Rettyの有料APIやX/Instagram/Threads/TikTokの公式APIは利用しない(requirements.md#選定方式-5〜6、スコープ外)
- 情報源から取得した観測項目は採用基準の判定前の全件(情報源ごとに上位30件まで)が履歴としてリポジトリに残るが、記録するのは公開情報から得た話題名と強度・順位・地域だけであり、個人情報・機微情報は含まない([trend-history/design.md](../trend-history/design.md)のセキュリティ参照)

## ログ

- 週次実行のログに、ジャンルごとに「**観測項目数**(採用基準の判定前・記録上限適用後の件数)」と「**候補件数**(採用基準を満たした件数。取得失敗・検索失敗はその旨)」を分けて標準エラー出力へ記録する(requirements.md#情報源の健全性監視-1)。観測項目は情報源が項目を返す限り常に数十件出るため、この2つを1つの数値にまとめると情報源の健全性が読み取れなくなる
- **候補件数**が0件だった情報源・ジャンルは警告(`WARN`)と分かる形で出力する(観測項目数ではなく候補件数で判断する)(慢性的な0件を月次見直しで拾えるようにするため)
- 中長期トレンドの絞り込みで除外した候補の件数を、ステータスごと(NEW/EMERGING/DECLINING)に記録する(requirements.md#情報源の健全性監視-2)。絞り込みの対象はその回に収集された候補=必ず同じ編の直近の実行で検知されている候補であり、「途絶えた」ことを条件とするSHORT_TERMはここには現れないため内訳に含めない。SHORT_TERMを含む全ステータスの分布は、[trend-history/design.md](../trend-history/design.md)のログ(全候補のステータスごとの件数)で確認する
- 前回掲載時からステータスが変わらないために再掲を見送った候補の件数と、続報として再掲する候補の件数(報告回数付き)を記録する
- 対象editionで掲載可能な候補が0件の場合は、その旨を「収集自体が0件」「絞り込みで全件除外」のどちらなのかが分かる形で標準エラー出力へ記録する。[weekly-publish](../weekly-publish/design.md)側は標準出力のJSONの`status`フィールドを見てPRを作成しない判断に使う
