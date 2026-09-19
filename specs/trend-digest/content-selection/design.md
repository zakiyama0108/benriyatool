# 設計: ジャンル別情報源と採用基準

## サマリ
18ジャンルを「固定リストジャンル」(12ジャンル、実際の消費・行動を集計した客観データをコードで定量判定)と「WebSearchジャンル」(6ジャンル、Claude Code CLIのWebSearchによるLLM判定)に分け、エンタメ編・カルチャー編それぞれ9ジャンルの候補を収集する。掲載済み話題の再掲を防いだ上で、ジャンル内最大2件・編内最大10件まで絞り込む。判定基準の数値・情報源は`content/trend-digest/watchlist.json`・`criteria.json`に機械可読データとして持ち、[source-review](../source-review/requirements.md)の月次見直しで更新する(データ設計・処理フロー・図は下記参照)。

初回配信の実運用で、汎用の正規表現1つで全情報源のHTMLを解析する方式が、JS描画・Bot対策・サイトごとに異なる順位表現(テキスト/CSSクラス/画像)に対応できず、ほぼ全滅した。この反省を踏まえ、情報源は「構造化データ(TSV/RSS/公式Web API)」を最優先し、それが無い場合のみ「サイトごとの専用パーサー」を用意する方針に変更する(下記「データ設計」参照)。

## 設計の前提(エージェントの推論とコードの役割分担)

architecture.mdが定める2つの選定方式を、実装形態として次のように役割分担する(要件は方式の呼び名までは決めているが実装形態は指定していないため設計判断):

- **固定リストジャンル(12ジャンル)**: 「対象作品・話題が採用基準を満たすか」の判定は決定的なコード(TypeScript純粋関数)で行う。実際の売上・視聴・検索行動を集計した客観データという構造化された情報源を前提にしており、順位・新規ランクイン等の比較は算術的に検証可能なため
- **WebSearchジャンル(6ジャンル)**: 「独立した言及が広がっているか」の判定自体をClaude Code CLIのヘッドレス実行(WebSearchツール使用)に委ねる。客観集計データが存在せず、性質の異なる複数の言及元(メディア記事・SNS・口コミ)を横断した意味的な判断が必要なため、コード化になじまない
- ジャンル内絞り込み(最大2件)・編全体の絞り込み(最大10件)・掲載済み話題の再掲抑制は、両方式で共通の決定的なコードとして実装する(narrowing自体は数値比較で完結するため)

## データ設計(ウォッチリスト・採用基準)

ウォッチリスト・採用基準は`requirements.md`(人間が読む正の仕様)と、実行時にコードが読み込む機械可読データの二重管理とする。[source-review](../source-review/requirements.md)の月次見直しPRは、同じ変更を`requirements.md`とこの機械可読データの両方に加える(片方だけの変更はレビューで差し戻す。ai-dev-digestのwatchlist-reviewと同じ運用)。

`Edition`/`Genre`は[article-detail/design.md](../article-detail/design.md)「前提: 記事データの形式」が定義する`app/trend-digest/lib/types.ts`のものをそのまま再利用する(同spec冒頭のとおり、記事データの型は本specを含む他specが共通して従う。ここで型を再定義しない)。

```ts
// app/trend-digest/lib/watchlistTypes.ts
import type { Edition, Genre } from './types' // article-detail/design.mdが定義する型を再利用(重複定義しない)

export type SelectionMethod = 'fixed-list' | 'websearch'

// 固定リストジャンルの情報源が、どの取得・パース処理を使うかを表す
// (初回配信で汎用の正規表現1パターンが実際のサイト構造に対応しきれなかった反省から、
// 構造化データを最優先し、無い場合のみサイトごとの専用パーサーを用意する方針にした)
export type FixedListSourceFormat =
  | 'structured-tsv' // 公式の構造化データ(タブ区切り)をそのまま取得する。例: Netflix公式Top10データ
  | 'structured-rss' // 公式のRSSフィードをそのまま取得する。例: Google公式トレンドRSS
  | 'structured-json-api' // 公式Web APIのJSONレスポンスをそのまま取得する。例: Steam公式Web API
  | 'site-specific-html' // サイトごとに専用のパース関数(`scripts/trend-digest/sourceParsers/<parserId>.ts`)でHTMLから抽出する

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
  perGenreMax: number // 1ジャンルの最大掲載数(requirements.md#機能要件-4 = 2)
  perEditionMax: number // 1回の最大掲載数(requirements.md#機能要件-5 = 10)
  newEntryLookbackWeeks: number // 「新規ランクイン」を判定する際、何週間分の過去記事の掲載トピックを参照するか
  genreCriteria: Record<Genre, FixedListGenreCriteria | WebSearchGenreCriteria>
}
```

`watchlist.json`の初期値(全18ジャンル。sourcesはrequirements.mdの各ジャンル節の情報源をそのまま構造化したもの。URLは実際にアクセスして生存確認済み[2026-09-19時点]):

```json
{
  "genres": [
    { "genre": "music", "edition": "entertainment", "label": "音楽", "method": "fixed-list",
      "sources": [
        { "name": "Billboard JAPAN Hot 100", "url": "https://www.billboard-japan.com/charts/detail?a=hot100", "format": "site-specific-html", "parserId": "billboardJapan" }
      ] },
    { "genre": "japanese-movie", "edition": "entertainment", "label": "日本映画", "method": "fixed-list",
      "sources": [
        { "name": "興行通信社CINEMAランキング通信(国内)", "url": "https://www.kogyotsushin.com/", "format": "site-specific-html", "parserId": "kogyoTsushin" },
        { "name": "映画.com国内ランキング", "url": "https://eiga.com/ranking/jp/", "format": "site-specific-html", "parserId": "eigaCom" },
        { "name": "Filmarks上映中ランキング", "url": "https://filmarks.com/list/now", "format": "site-specific-html", "parserId": "filmarks" }
      ] },
    { "genre": "foreign-movie", "edition": "entertainment", "label": "海外映画", "method": "fixed-list",
      "sources": [
        { "name": "映画.com全米ランキング", "url": "https://eiga.com/ranking/us/", "format": "site-specific-html", "parserId": "eigaCom" },
        { "name": "Filmarks上映中ランキング", "url": "https://filmarks.com/list/now", "format": "site-specific-html", "parserId": "filmarks" }
      ] },
    { "genre": "japanese-drama", "edition": "entertainment", "label": "日本ドラマ", "method": "fixed-list",
      "sources": [{ "name": "ビデオリサーチ ドラマ視聴率速報", "url": "https://www.videor.co.jp/tvrating/daily/drama/", "format": "site-specific-html", "parserId": "videoResearch" }] },
    { "genre": "foreign-drama", "edition": "entertainment", "label": "海外ドラマ", "method": "fixed-list",
      "sources": [{ "name": "Netflix公式Top10データ(シリーズ・日本)", "url": "https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv", "format": "structured-tsv" }] },
    { "genre": "anime", "edition": "entertainment", "label": "アニメ", "method": "fixed-list",
      "sources": [{ "name": "Netflix公式Top10データ(日本のTOP10)", "url": "https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv", "format": "structured-tsv" }] },
    { "genre": "variety", "edition": "entertainment", "label": "バラエティ", "method": "fixed-list",
      "sources": [{ "name": "ビデオリサーチ バラエティ視聴率速報", "url": "https://www.videor.co.jp/tvrating/past_tvrating/variety/", "format": "site-specific-html", "parserId": "videoResearch" }] },
    { "genre": "streaming-video", "edition": "entertainment", "label": "サブスク動画", "method": "fixed-list",
      "sources": [{ "name": "Netflix公式Top10データ(映画・日本)", "url": "https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv", "format": "structured-tsv" }] },
    { "genre": "books-comics", "edition": "entertainment", "label": "書籍・漫画", "method": "fixed-list",
      "sources": [
        { "name": "トーハン週間ベストセラー", "url": "https://www.tohan.jp/bestsellers/", "format": "site-specific-html", "parserId": "tohan" },
        { "name": "日販週間ベストセラー", "url": "https://www.nippan.co.jp/ranking/weekly/", "format": "site-specific-html", "parserId": "nippan" }
      ] },
    { "genre": "sns-buzz", "edition": "culture-lifestyle", "label": "SNSバズり", "method": "websearch",
      "searchHints": ["Xで話題 バズり 複数メディア", "TikTok 投稿 話題 反響", "Instagram Threads 投稿 話題", "ねとらぼ grape TREND Sirabee SNS 話題"] },
    { "genre": "buzzwords", "edition": "culture-lifestyle", "label": "流行りの言葉", "method": "fixed-list",
      "sources": [{ "name": "Google公式トレンドRSS(日本)", "url": "https://trends.google.com/trending/rss?geo=JP", "format": "structured-rss" }] },
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
        { "name": "Steam公式Web API(プレイヤー数)", "url": "https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/", "format": "structured-json-api" },
        { "name": "ファミ通.com売上ランキング", "url": "https://www.famitsu.com/ranking/game-sales/", "format": "site-specific-html", "parserId": "famitsu" }
      ] },
    { "genre": "travel", "edition": "culture-lifestyle", "label": "旅行・観光", "method": "fixed-list",
      "sources": [{ "name": "じゃらんnet人気ランキング", "url": "https://www.jalan.net/news/", "format": "site-specific-html", "parserId": "jalan" }] },
    { "genre": "economy-money", "edition": "culture-lifestyle", "label": "経済・お金", "method": "websearch",
      "searchHints": ["流行っている節約術 SNS 口コミ", "話題のクーポン サービス 複数メディア", "LIMO ファイナンシャルフィールド 話題の節約"] }
  ]
}
```

補足(音楽・書籍のURL変遷): Oricon週間チャート・ZOZOTOWN人気ランキング・Engadget日本版(2022年サイト閉鎖)・るるぶ&more!トップページ・Googleトレンド急上昇ワードページ・Yahoo!検索急上昇ワードページは、いずれもJS描画・Bot対策・サイト閉鎖のいずれかで機械的な取得ができないため情報源から外した。旅行・観光のるるぶ&more!は記事一覧ページ(`rurubu.jp/andmore/article`)であれば取得できる可能性があるため、[source-review](../source-review/requirements.md)で追加候補として再検証する。

`criteria.json`の初期値(妥当性は運用実績を見て[source-review](../source-review/requirements.md)で見直す):
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
    "economy-money": { "method": "websearch", "minIndependentSources": 3 }
  }
}
```

## 処理フロー

### 候補の型(前提)
```ts
// app/trend-digest/lib/candidateTypes.ts
import type { Edition, Genre } from './types' // article-detail/design.mdが定義する型を再利用(重複定義しない)
import type { SelectionMethod } from './watchlistTypes'

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
  1. ジャンルごとに登録された各情報源を、`format`に応じた取得処理で取得する。取得・パースに失敗した場合はその情報源だけを除外して処理を続ける(1件の取得失敗で編全体の収集を止めない)
     - `structured-tsv`/`structured-rss`/`structured-json-api`: 公式の構造化データをそのまま取得しパースする(HTML解析を要さないため最も安定している)
     - `site-specific-html`: `parserId`が指す`scripts/trend-digest/sourceParsers/<parserId>.ts`の専用パース関数でHTMLから順位付きの一覧(作品名・現在の順位)を抽出する。取得時は一般的なブラウザのUser-Agentを付与し(requirements.md#データ取得方法-2)、文字コードはページのContent-Type/meta指定に従って変換する(Shift-JIS等のページをUTF-8決め打ちで読まない)
  2. `newEntryOrRisingRank: true`のジャンル(music/foreign-drama/anime/streaming-video/books-comics)は、情報源が前週比の順位変動(前週順位・NEW表記・Netflix TSVなら前週分の行)を提供している場合はそれをそのまま使う。提供していない情報源は、直近`newEntryLookbackWeeks`週間分の過去記事(`content/trend-digest/articles/*.json`)の同ジャンルのトピックに同じ`title`(正規化後)が含まれていなければ「新規」とみなす
  3. `rankThreshold`のみのジャンル(japanese-movie/foreign-movie/japanese-drama/variety/buzzwords/games/travel)は、現在の順位が`rankThreshold`以内の項目をすべて候補にする。buzzwords(流行りの言葉)の情報源(Google公式トレンドRSS)は、掲載されている項目自体が既に「一過性の話題性がある語」に該当するものだけであるため、順位判定に加えた定性的な絞り込みは行わない(requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-6)
  4. `rankThreshold`と`newEntryOrRisingRank`の両方を持つジャンル(books-comics)は、手順2の新規ランクイン・順位上昇の判定に加えて、いずれかの情報源(トーハン・日販)で現在の順位が`rankThreshold`(5位)以内であることも満たす項目だけを候補にする(いずれか一方だけでは候補にしない。requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-5「いずれかで上位5位以内にランクインした作品」を反映するための判断)
  5. 候補ごとに`strength = 100 - 現在の順位`を設定する(順位が高いほど大きい値。musicのような上昇幅判定ジャンルは、上昇幅が大きいほど`strength`を加点する)。複数情報源で同じ作品が候補になった場合(books-comicsのトーハン・日販等)は、より順位が高い方の`strength`を採用する
  6. 情報源ごとの取得件数(取得失敗・0件はその旨)を記録する(requirements.md#情報源の健全性監視-1)
- 関連するビジネスルール: requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-1〜8、requirements.md#データ取得方法-1〜2、requirements.md#情報源の健全性監視-1

### サイトごとの専用パーサー(`scripts/trend-digest/sourceParsers/`)
- 初回配信の実運用で、1つの正規表現パーサーで全HTML情報源を解析する方式は、サイトごとに異なる順位表現(プレーンテキスト・CSSクラス名・画像スプライト等)に対応できず機能しなかった。このためサイトごとに専用のパース関数を用意する(`billboardJapan.ts`/`kogyoTsushin.ts`/`eigaCom.ts`/`filmarks.ts`/`videoResearch.ts`/`tohan.ts`/`nippan.ts`/`famitsu.ts`/`jalan.ts`の9ファイル)
- 各パーサーは`(html: string) => RankedItem[]`の形の純粋関数とし、そのサイトのHTML構造(セレクタ・CSSクラス名等)に関する実装コメントを関数ごとに残す(トーハン・日販は順位がCSSクラス名(`rank-1st`等)で表現されている点など、サイト固有の癖はコメントで明示する)。実際のHTML構造検証は疎通確認(週次実行結果)で代替する方針は維持する(`fetchSourcePage.ts`の既存コメント参照)
- サイト構造が変わりパーサーが機能しなくなった場合は、そのパーサーだけを[source-review](../source-review/requirements.md)の月次見直しで修正する(1サイトの構造変更が他ジャンルに波及しない)

### WebSearchジャンルの候補を収集・判定する処理(エージェントの推論)
- 対象: `watchlist.json`の`method: 'websearch'`の6ジャンル(実行対象のeditionの9ジャンルのうち該当するもの)
- 手順:
  1. ジャンルごとの`searchHints`を手がかりに、Claude Code CLIのヘッドレス実行(WebSearchツール)で話題を検索する。検索の切り口は固定の少数サイトに限定せず、複数の異なる角度(ニュースメディア・まとめメディア・SNS上の言及・口コミ)から広く探索する(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-3)
  2. 性質の異なる複数の独立した言及元(ニュースメディアの記事、SNS上での言及、口コミ・レビューサイトでの評判増加等)が同じ話題を独立に言及している場合のみ「動きがあった」候補にする。同一運営者・同一記事の転載は1件として数える。単一の情報源のみ、または広告・PR記事1本のみが取り上げている話題、噂・未確認情報の域を出ない話題は候補にしない(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1)
  3. 独立した言及元の数が`minIndependentSources`(既定3件)未満の話題は候補にしない
  4. 候補ごとに、話題の名称(`title`)・代表的な出典1件(`sourceName`/`sourceUrl`。最も権威のある、または最初に見つかった情報源を1件選ぶ)・独立した言及元の数(`strength`として使う)・言及元の内訳(`note`。例: "ニュースメディア2件+SNS言及1件"。ログ・PR本文で「本当に広がりがあるか」を人間が確認できるようにするため)をJSONで返す
  5. 応答は指定のJSON配列単体とし、聞き返し・説明文のみの応答を返さない(ヘッドレス実行のため質問に応答する相手がいない。ai-dev-digest content-generationの応答形式ガードレールと同じ考え方)
  6. ジャンルごとの候補件数(0件はその旨)を記録する(requirements.md#情報源の健全性監視-1)
- 関連するビジネスルール: requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1〜9、requirements.md#情報源の健全性監視-1

### 掲載済み話題を除外する処理(決定的なコード)
- 対象: 収集した候補すべて(ジャンル内絞り込み・編全体の絞り込みより前に適用する)
- 手順:
  1. `content/trend-digest/articles/*.json`の全記事の全トピックから`sourceTitle`([article-detail/design.md](../article-detail/design.md)「前提: 記事データの形式」参照)を集めた集合を作る。期間で絞らず全記事を対象にする
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
content/trend-digest/watchlist.json (既存: ジャンル別情報源。sources/format/parserIdを更新)
content/trend-digest/criteria.json (既存: 採用基準の数値。genreCriteria・minIndependentSourcesを更新)
app/trend-digest/lib/types.ts (既存: article-detail/design.mdが定義するEdition/Genreを利用。本specでは再定義しない)
app/trend-digest/lib/watchlistTypes.ts (既存: SelectionMethod/WatchlistEntry/Criteria等の型定義。FixedListSourceFormatを追加)
app/trend-digest/lib/candidateTypes.ts (既存: Candidate/SelectionResultの型定義)
app/trend-digest/lib/selection.ts (既存: 掲載済み除外・ジャンル内絞り込み・編全体の絞り込みの純粋関数。テスト可能)
app/trend-digest/lib/fetchFixedListCandidates.ts (既存: 固定リストジャンルの情報源取得・パース・順位判定。format別のディスパッチに更新)
scripts/trend-digest/fetchSourcePage.ts (既存: HTTP取得・文字コード変換・User-Agent付与。サイト固有パースはsourceParsers/へ委譲するよう更新)
scripts/trend-digest/sourceParsers/billboardJapan.ts, kogyoTsushin.ts, eigaCom.ts, filmarks.ts, videoResearch.ts, tohan.ts, nippan.ts, famitsu.ts, jalan.ts (新規: サイトごとの専用パーサー)
scripts/trend-digest/fetchStructuredSource.ts (新規: structured-tsv/structured-rss/structured-json-apiの取得・パース)
scripts/trend-digest/collect-websearch-candidates.ts (既存: WebSearchジャンルのClaude Code CLIヘッドレス起動。プロンプトの独立言及元の定義・minIndependentSources引き上げに合わせて更新)
scripts/trend-digest/collect-and-select.ts (既存: fetchFixedListCandidates+collect-websearch-candidates+selection.tsを実行しSelectionResultをJSON標準出力するCLI。掲載済みトピックの読み込み(content/trend-digest/articles/*.json)もここで行う)
```

`selection.ts`は入出力が純粋なデータ(候補配列→選定結果)のみのため、通常のvitestで完全にテストできる。`sourceParsers/`配下の各パーサーは、実際に取得したHTMLをテストフィクスチャとして保存し(`__tests__/trend-digest/fixtures/sourceParsers/`)、それを入力とした純粋関数のテストとして書く(サイトごとに構造が異なるため、パーサー単位で決定的にテストできる)。`fetchSourcePage.ts`・`fetchStructuredSource.ts`は外部ページ・APIへのHTTP呼び出しを伴うため、レスポンス形状のパース・エラー処理・文字コード変換のみをモックしたテストの対象とし、実際の外部通信を伴う疎通確認は週次実行結果([weekly-publish](../weekly-publish/design.md))で代替する。`collect-websearch-candidates.ts`はClaude Code CLIのヘッドレス起動そのものであり、決定的なテストは書かず(ai-dev-digestのcontent-generationと同じ考え方)、応答形式の分類ロジックのみをテスト対象にする。

## セキュリティ

- 固定リストジャンルの情報源取得は、公式サイト・公開ページの閲覧、および公式が提供する構造化データ・Web APIの利用にとどめ、非公式APIや利用規約を超えた高頻度アクセスは行わない(requirements.md#データ取得方法-1)。アクセス頻度は週2回(編ごと1回)の実行分のみ
- 公開ページの取得時に付与するUser-Agentは一般的なブラウザのものとし、Bot判定回避を目的としたヘッダー偽装・認証回避は行わない(requirements.md#データ取得方法-2)
- WebSearchジャンルの検索はClaude Code CLI標準のWebSearchツールの範囲で行い、追加のスクレイピング処理は持たない
- 食べログ・Rettyの有料APIやX/Instagram/Threads/TikTokの公式APIは利用しない(requirements.md#選定方式-5〜6、スコープ外)

## ログ

- 週次実行のログに、ジャンルごとに「収集した候補件数(取得失敗・検索失敗はその旨)」を標準エラー出力へ記録する(requirements.md#情報源の健全性監視-1)
- 候補件数が0件だった情報源・ジャンルは警告(`WARN`)と分かる形で出力する(慢性的な0件を月次見直しで拾えるようにするため)
- 掲載済み話題として除外した候補の件数も記録する(絞り込みの過程が追えるようにするため)
- 対象editionの9ジャンルすべてで候補が0件の場合は、その旨を明確に標準エラー出力へ記録する。[weekly-publish](../weekly-publish/design.md)側は標準出力のJSONの`status`フィールドを見てPRを作成しない判断に使う
