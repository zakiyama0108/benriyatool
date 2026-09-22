# 設計: ジャンル別情報源と採用基準

## サマリ
19ジャンルを「固定リストジャンル」(12ジャンル、公式ランキング等をコードで定量判定)と「WebSearchジャンル」(7ジャンル、Claude Code CLIのWebSearchによるLLM判定)に分け、エンタメ編9ジャンル・カルチャー編10ジャンルの候補を収集する。収集した全候補は[trend-history](../trend-history/design.md)の観測ログへ書き出し、そこで判定された中長期ステータスが掲載可能なものだけを残したうえで、前回掲載時からステータスが変わっていない候補を除外し、ジャンル内最大2件・編内最大10件まで絞り込む。判定基準の数値・情報源は`content/trend-digest/watchlist.json`・`criteria.json`に機械可読データとして持ち、[source-review](../source-review/requirements.md)の月次見直しで更新する(データ設計・処理フロー・図は下記参照)。

## 設計の前提(エージェントの推論とコードの役割分担)

architecture.mdが定める2つの選定方式を、実装形態として次のように役割分担する(要件は方式の呼び名までは決めているが実装形態は指定していないため設計判断):

- **固定リストジャンル(12ジャンル)**: 「対象作品・話題が採用基準を満たすか」の判定は決定的なコード(TypeScript純粋関数)で行う。公式ランキング・チャートという構造化された情報源を前提にしており、順位・新規ランクイン等の比較は算術的に検証可能なため
- **WebSearchジャンル(7ジャンル)**: 「動きがあったか」の判定自体をClaude Code CLIのヘッドレス実行(WebSearchツール使用)に委ねる。決まった集計元がなく、複数情報源が同じ話題を報じているかという意味的な判断が必要なため、コード化になじまない
- 中長期トレンドの絞り込み・掲載済み話題の再掲抑制・ジャンル内絞り込み(最大2件)・編全体の絞り込み(最大10件)は、両方式で共通の決定的なコードとして実装する(いずれもステータスの比較と数値比較で完結するため)

## データ設計(ウォッチリスト・採用基準)

ウォッチリスト・採用基準は`requirements.md`(人間が読む正の仕様)と、実行時にコードが読み込む機械可読データの二重管理とする。[source-review](../source-review/requirements.md)の月次見直しPRは、同じ変更を`requirements.md`とこの機械可読データの両方に加える(片方だけの変更はレビューで差し戻す。ai-dev-digestのwatchlist-reviewと同じ運用)。

`Edition`/`Genre`は[article-detail/design.md](../article-detail/design.md)「前提: 記事データの形式」が定義する`app/trend-digest/lib/types.ts`のものをそのまま再利用する(同spec冒頭のとおり、記事データの型は本specを含む他specが共通して従う。ここで型を再定義しない)。

```ts
// app/trend-digest/lib/watchlistTypes.ts
import type { Edition, Genre } from './types' // article-detail/design.mdが定義する型を再利用(重複定義しない)
import type { HistoryCriteria } from './historyTypes' // trend-history/design.mdが定義するステータス判定の閾値

export type SelectionMethod = 'fixed-list' | 'websearch'

// 情報源の地域区分(requirements.md#情報源の地域区分-1)。
// trend-historyの日本での強度・海外での強度の判定に使う
export type SourceRegion = 'japan' | 'overseas'

export type WatchlistEntry = {
  genre: Genre
  edition: Edition
  label: string // 表示・PR本文用の日本語ジャンル名(例: "音楽")
  method: SelectionMethod
  sources: Array<{ name: string; url: string; region: SourceRegion }> // 固定リストジャンルの情報源。WebSearchジャンルは検索の手がかりとして空でもよい
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
  perGenreMax: number // 1ジャンルの最大掲載数(requirements.md#機能要件-5 = 2)
  perEditionMax: number // 1回の最大掲載数(requirements.md#機能要件-6 = 10)
  newEntryLookbackWeeks: number // 「新規ランクイン」を判定する際、何週間分の過去記事の掲載トピックを参照するか
  genreCriteria: Record<Genre, FixedListGenreCriteria | WebSearchGenreCriteria>
  history: HistoryCriteria // 中長期ステータス判定の閾値(trend-history/design.md「履歴データの形式」)
}
```

`watchlist.json`の初期値(全19ジャンル。sourcesはrequirements.mdの各ジャンル節の情報源をそのまま構造化したもの。`region`はその情報源が日本の流行と海外の流行のどちらを映すかの区分):

```json
{
  "genres": [
    { "genre": "music", "edition": "entertainment", "label": "音楽", "method": "fixed-list",
      "sources": [
        { "name": "Oricon週間チャート", "url": "https://www.oricon.co.jp/rank/js/w/", "region": "japan" },
        { "name": "Billboard JAPAN Hot 100", "url": "https://www.billboard-japan.com/charts/detail?a=hot100", "region": "japan" }
      ] },
    { "genre": "japanese-movie", "edition": "entertainment", "label": "日本映画", "method": "fixed-list",
      "sources": [{ "name": "週末興行収入ランキング", "url": "https://www.eiga.com/box-office/japan/", "region": "japan" }, { "name": "Filmarks劇場公開作品ランキング", "url": "https://filmarks.com/list/theater", "region": "japan" }] },
    { "genre": "foreign-movie", "edition": "entertainment", "label": "海外映画", "method": "fixed-list",
      "sources": [{ "name": "週末興行収入ランキング", "url": "https://www.eiga.com/box-office/world/", "region": "overseas" }, { "name": "Filmarks劇場公開作品ランキング", "url": "https://filmarks.com/list/theater", "region": "japan" }] },
    { "genre": "japanese-drama", "edition": "entertainment", "label": "日本ドラマ", "method": "websearch",
      "searchHints": ["日本ドラマ 視聴率 好調", "ドラマ SNS 反響"] },
    { "genre": "foreign-drama", "edition": "entertainment", "label": "海外ドラマ", "method": "fixed-list",
      "sources": [{ "name": "Netflix公式Top10(シリーズ・日本)", "url": "https://top10.netflix.com/jp", "region": "japan" }] },
    { "genre": "anime", "edition": "entertainment", "label": "アニメ", "method": "fixed-list",
      "sources": [{ "name": "Netflix公式Top10(日本のTOP10)", "url": "https://top10.netflix.com/jp", "region": "japan" }] },
    { "genre": "variety", "edition": "entertainment", "label": "バラエティ", "method": "websearch",
      "searchHints": ["バラエティ番組 視聴率 好調", "バラエティ SNS 話題"] },
    { "genre": "streaming-video", "edition": "entertainment", "label": "サブスク動画", "method": "fixed-list",
      "sources": [{ "name": "Netflix公式Top10(映画・日本)", "url": "https://top10.netflix.com/jp", "region": "japan" }] },
    { "genre": "books-comics", "edition": "entertainment", "label": "書籍・漫画", "method": "fixed-list",
      "sources": [{ "name": "トーハン週間ベストセラー", "url": "https://www.tohan.jp/bestsellers/", "region": "japan" }] },
    { "genre": "sns-buzz", "edition": "culture-lifestyle", "label": "SNSバズり", "method": "websearch",
      "searchHints": ["X バズり 話題", "TikTok 話題 バズり", "Instagram Threads 話題"] },
    { "genre": "buzzwords", "edition": "culture-lifestyle", "label": "流行りの言葉", "method": "fixed-list",
      "sources": [{ "name": "Googleトレンド急上昇ワード", "url": "https://trends.google.co.jp/trending?geo=JP", "region": "japan" }, { "name": "Yahoo!検索急上昇ワード", "url": "https://search.yahoo.co.jp/realtime", "region": "japan" }] },
    { "genre": "gourmet", "edition": "culture-lifestyle", "label": "グルメ", "method": "websearch",
      "searchHints": ["話題の飲食店", "食トレンド 話題"] },
    { "genre": "hobby", "edition": "culture-lifestyle", "label": "流行りの趣味", "method": "websearch",
      "searchHints": ["新しい趣味 話題", "ホビー トレンド"] },
    { "genre": "fashion", "edition": "culture-lifestyle", "label": "ファッション", "method": "fixed-list",
      "sources": [{ "name": "WWD JAPAN新着記事", "url": "https://www.wwdjapan.com/", "region": "japan" }, { "name": "ZOZOTOWN人気ランキング", "url": "https://zozo.jp/ranking/", "region": "japan" }] },
    { "genre": "gadgets", "edition": "culture-lifestyle", "label": "ガジェット・家電", "method": "fixed-list",
      "sources": [{ "name": "価格.com売れ筋ランキング", "url": "https://kakaku.com/ranking/", "region": "japan" }, { "name": "Engadget日本版", "url": "https://japanese.engadget.com/", "region": "japan" }] },
    { "genre": "games", "edition": "culture-lifestyle", "label": "ゲーム", "method": "fixed-list",
      "sources": [{ "name": "Steam売上ランキング", "url": "https://store.steampowered.com/charts/topselling/JP", "region": "japan" }, { "name": "ファミ通.com売上ランキング", "url": "https://www.famitsu.com/ranking/", "region": "japan" }] },
    { "genre": "travel", "edition": "culture-lifestyle", "label": "旅行・観光", "method": "fixed-list",
      "sources": [{ "name": "じゃらんnet人気ランキング", "url": "https://www.jalan.net/", "region": "japan" }, { "name": "るるぶ&more!人気ランキング", "url": "https://rurubu.travel/", "region": "japan" }] },
    { "genre": "economy-money", "edition": "culture-lifestyle", "label": "経済・お金", "method": "websearch",
      "searchHints": ["NISA 話題", "家計 投資 話題のニュース"] },
    { "genre": "dev-trends", "edition": "culture-lifestyle", "label": "開発手法・開発サービス", "method": "websearch",
      "searchHints": ["ソフトウェア開発 手法 潮流", "開発者 注目のサービス 話題", "開発チーム 進め方 変化"] }
  ]
}
```

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
    "economy-money": { "method": "websearch", "minIndependentSources": 2 },
    "dev-trends": { "method": "websearch", "minIndependentSources": 3 }
  },
  "history": {
    "shortTermMaxDays": 13,
    "growingMinDays": 14,
    "establishedMinDays": 30,
    "stableMinDays": 90,
    "minSamplesForTrend": 3,
    "risingRatio": 1.2,
    "decliningRatio": 0.6,
    "stableBandRatio": 0.2
  }
}
```

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
  originRegion: string | null // 発祥地域。判定できない場合はnull(=不明。trend-history/requirements.md#地域情報-9)
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
  reportCount: number // 今回掲載した場合に通算何回目の報告になるか(requirements.md#掲載済み話題の再掲抑制-3)
}

export type SelectionResult =
  | { status: 'ok'; edition: Edition; topics: PublishableCandidate[] } // 絞り込み後、edition内ジャンル順に並んだ最終候補
  | { status: 'skipped'; edition: Edition; reason: string } // 掲載可能な候補が1件も残らなかった場合
```

### 固定リストジャンルの候補を収集・判定する処理(決定的なコード)
- 対象: `watchlist.json`の`method: 'fixed-list'`の12ジャンル(実行対象のeditionのジャンルのうち該当するもの)
- 手順:
  1. ジャンルごとに登録された各情報源へHTTPリクエストし、情報源の種類に応じた一覧を取得する。取得・パースに失敗した場合はその情報源だけを除外して処理を続ける(1件の取得失敗で編全体の収集を止めない)。情報源には2種類あり、種類ごとに取得する一覧の形が異なる
     - 順位付きランキング型(上記以外すべて): 公式ランキング・チャートの公開ページから、順位付きの一覧(作品名・現在の順位)を取得する
     - 新着記事一覧型(WWD JAPAN新着記事・Engadget日本版): 順位を持たないため、直近の新着記事一覧(記事タイトル・掲載日時)を取得する
  2. `newEntryOrRisingRank: true`のジャンル(music/foreign-drama/anime/streaming-video/books-comics)は、情報源のページ自体が前週比の順位変動(前週順位・NEW表記)を提供している場合はそれをそのまま使う。提供していない情報源は、直近`newEntryLookbackWeeks`週間分の過去記事(`content/trend-digest/articles/*.json`)の同ジャンルのトピックに同じ`title`(正規化後)が含まれていなければ「新規」とみなす。順位上昇の判定はページが変動値を提供する場合のみ行い、提供しない情報源では新規ランクインのみを候補条件にする(順位上昇の判定は諦める。要件の判定方法詳細を設計で補うための判断)
  3. `rankThreshold`のみのジャンル(japanese-movie/foreign-movie/buzzwords/fashion/gadgets/games/travel)は、現在の順位が`rankThreshold`以内の項目をすべて候補にする。buzzwords(流行りの言葉)・games(ゲーム)の情報源(Googleトレンド急上昇ワード・Yahoo!検索急上昇ワードランキング、Steam売上ランキング・ファミ通.com売上ランキング)は、掲載されている項目自体が既に「一過性の話題性がある語」「新作・話題作」に該当するものだけであるため、順位判定に加えた定性的な絞り込みは行わない(requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-5・-8)。fashion(ファッション)・gadgets(ガジェット・家電)は情報源の一方が新着記事一覧型(WWD JAPAN新着記事・Engadget日本版)のため、`rankThreshold`判定はもう一方の順位付きランキング型の情報源(ZOZOTOWN人気ランキング・価格.com売れ筋ランキング)にのみ適用する。新着記事一覧型の情報源は順位を持たないため`rankThreshold`判定を行わず、直近の新着記事をそのまま候補にする(requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-6〜7「新着のトレンド企画記事」「新着記事で紹介された注目製品」を反映するための判断)
  4. `rankThreshold`と`newEntryOrRisingRank`の両方を持つジャンル(books-comics)は、手順2の新規ランクイン・順位上昇の判定に加えて、現在の順位が`rankThreshold`(5位)以内であることも満たす項目だけを候補にする(いずれか一方だけでは候補にしない。requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-4「上位5位以内で新規にランクインした作品」の両条件を反映するための判断)
  5. 候補ごとに`strength = 100 - 現在の順位`を設定する(順位が高いほど大きい値。musicのような上昇幅判定ジャンルは、上昇幅が大きいほど`strength`を加点する)。新着記事一覧型の情報源から抽出した候補は順位を持たないため、掲載日時が新しいものほど大きくなる値(例: 新着順の掲載順位を仮の順位とみなす)を`strength`に設定する
  6. 候補ごとに、その候補を検出した情報源の`region`から日本での強度・海外での強度を数える。`region: 'japan'`の情報源で検出された件数を日本での強度、`region: 'overseas'`の情報源で検出された件数を海外での強度とする。一方の区分の情報源が1件も登録されていないジャンルでは、その区分の強度を「不明」(値なし)として扱う(0件だったことと、そもそも測れないことを区別するため。requirements.md#情報源の地域区分-1)。発祥地域・現在の主な流行地域は、ランキングページからは判定できないため「不明」として扱う(推測で埋めない)
  7. 情報源ごとの取得件数(取得失敗・0件はその旨)を記録する(requirements.md#情報源の健全性監視-1)
- 関連するビジネスルール: requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-1〜9、requirements.md#情報源の地域区分-1、requirements.md#データ取得方法-1、requirements.md#情報源の健全性監視-1

### WebSearchジャンルの候補を収集・判定する処理(エージェントの推論)
- 対象: `watchlist.json`の`method: 'websearch'`の7ジャンル(実行対象のeditionのジャンルのうち該当するもの)
- 手順:
  1. ジャンルごとの`searchHints`を手がかりに、Claude Code CLIのヘッドレス実行(WebSearchツール)で話題を検索する
  2. 複数の独立した情報源(ニュースメディア・公式発表等)が同じ話題を報じている場合のみ「動きがあった」候補にする。独立情報源数が`minIndependentSources`未満の話題(単一情報源のみ、噂・未確認情報の域を出ないもの)は候補にしない(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1)
  3. `dev-trends`(開発手法・開発サービス)は、個々の製品リリース・バージョンアップを報じる記事だけを根拠にした話題を候補にしない。複数の情報源が開発の進め方・道具立ての変化として論じている話題だけを候補にする(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-7)
  4. 候補ごとに、話題の名称(`title`)・代表的な出典1件(`sourceName`/`sourceUrl`。最初に見つかった情報源、または最も権威のあるメディアを1件選ぶ)・独立情報源の言及数(`strength`として使う)をJSONで返す
  5. あわせて、言及していた独立情報源のうち日本のメディアの数・海外のメディアの数、および記事の記述から判定できた場合のみ発祥地域・現在の主な流行地域を返す。判定できない項目は「不明」(値なし・空)として返し、推測で埋めない(requirements.md#情報源の地域区分-2、[trend-history/requirements.md#地域情報](../trend-history/requirements.md)-9)
  6. 応答は指定のJSON配列単体とし、聞き返し・説明文のみの応答を返さない(ヘッドレス実行のため質問に応答する相手がいない。ai-dev-digest content-generationの応答形式ガードレールと同じ考え方)
  7. ジャンルごとの候補件数(0件はその旨)を記録する(requirements.md#情報源の健全性監視-1)
- 関連するビジネスルール: requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1〜7、requirements.md#情報源の地域区分-2、requirements.md#情報源の健全性監視-1

### 全候補を履歴へ記録する処理(決定的なコード)
- 対象: 固定リストジャンル・WebSearchジャンルから収集した候補すべて(絞り込みを一切適用する前の全件)
- 手順:
  1. 収集した全候補を[trend-history/design.md](../trend-history/design.md)「その回の観測を履歴に記録する処理」へ引き渡し、その回の観測ログを書き出させる(requirements.md#機能要件-3)
  2. 観測ログの書き出しが失敗した場合は、以降の絞り込み・記事生成を行わずに実行を失敗させる([trend-history/design.md](../trend-history/design.md)のエラーハンドリング参照)
- 関連するビジネスルール: requirements.md#機能要件-3

### 中長期トレンドの絞り込みを行う処理(決定的なコード)
- 対象: 収集した候補すべて(履歴への記録を終えた後、他のどの絞り込みよりも先に適用する)
- 手順:
  1. [trend-history/design.md](../trend-history/design.md)「継続日数と強度の推移からステータスを判定する処理」から、候補ごとのステータス・継続日数・初回検知日を受け取る
  2. ステータスが掲載可能(EMERGING/GROWING/ESTABLISHED/STABLE)でない候補を除外する(requirements.md#中長期トレンドの絞り込み-1)
  3. 除外した候補の件数をステータスごとに記録する(requirements.md#情報源の健全性監視-2)
  4. 掲載可能な候補が1件も残らなかった場合も、この時点では失敗とせず、後続の編全体の絞り込みでスキップとして扱う(運用開始直後は履歴が浅く全候補がNEWになるため、異常として扱わない。requirements.md#中長期トレンドの絞り込み-3)
- 関連するビジネスルール: requirements.md#機能要件-4、requirements.md#中長期トレンドの絞り込み-1〜3、requirements.md#情報源の健全性監視-2

### 掲載済み話題を除外する処理(決定的なコード)
- 対象: 中長期トレンドの絞り込みを通過した候補(ジャンル内絞り込み・編全体の絞り込みより前に適用する)
- 手順:
  1. [trend-history/design.md](../trend-history/design.md)「掲載実績(報告回数・前回掲載時のステータス)を求める処理」から、候補ごとの過去の掲載回数と前回掲載時のステータスを受け取る
  2. 過去に掲載されたことがない候補は、そのまま残し報告回数を1とする
  3. 過去に掲載されたことがある候補は、前回掲載時のステータスと今回のステータスを比べる。同じ場合は除外し、異なる場合は続報として残す(requirements.md#掲載済み話題の再掲抑制-1〜2)
  4. 前回掲載時のステータスが不明な候補(この機能の導入より前に生成された記事にのみ掲載されている候補)は、除外する。ステータスの変化を確かめられない以上、同じ内容の再掲になりうるため、載せない側に倒す(要件が明示していない範囲を、同じ内容を繰り返さないという趣旨に沿って設計で補った判断)
  5. 残した候補の報告回数を「過去の掲載回数 + 1」として設定する(requirements.md#掲載済み話題の再掲抑制-3)
  6. 同一話題かどうかの突き合わせは、候補の`title`と過去記事の`sourceTitle`([article-detail/design.md](../article-detail/design.md)「前提: 記事データの形式」参照)を、trend-historyと同じ正規化関数(前後の空白除去・全角/半角の統一・英字の大文字小文字統一)にかけてから行う。正規化ルールを二重に持たず、`selection.ts`の`normalizeTitle`を両specで共用する(requirements.md#掲載済み話題の再掲抑制-4)
  7. すべての候補が除外され、そのジャンルで残る候補がなくなった場合は、そのジャンルは掲載しない(requirements.md#機能要件-4)
- 関連するビジネスルール: requirements.md#掲載済み話題の再掲抑制-1〜4

### ジャンル内の絞り込みを行う処理(決定的なコード)
- 対象: 掲載済み話題の除外を通過した、1ジャンル分の候補
- 手順:
  1. 候補を`strength`の降順に並べる
  2. 候補が3件以上ある場合は上位2件に絞る。候補が0〜2件の場合はそのまま採用する(requirements.md#機能要件-5、requirements.md#ジャンル内の絞り込み-1〜2)
- 関連するビジネスルール: requirements.md#機能要件-5、requirements.md#ジャンル内の絞り込み-1〜2

### 編全体の絞り込みを行う処理(決定的なコード)
- 対象: 対象editionのジャンル分(エンタメ編9ジャンル・カルチャー編10ジャンル)の絞り込み済み候補(各ジャンル最大2件、`strength`降順)
- 手順:
  1. 各ジャンルの1件目(最有力候補)をすべて先に採用する
  2. 採用件数が`perEditionMax`(10件)を超えない範囲で、各ジャンルの2件目を「固定リストジャンル→WebSearchジャンル」の順(ジャンルはwatchlist.jsonの登録順)に1件ずつ残りの枠へ追加する(requirements.md#配信全体の絞り込み-1)
  3. 採用された候補を、そのeditionのジャンルの定義順(requirements.md#グループとジャンル)に並べ替える(ジャンル見出しの表示順・LINE配信のトピック一覧順として使われる。[article-detail/design.md](../article-detail/design.md)・[line-broadcast/requirements.md](../line-broadcast/requirements.md)参照)
  4. 対象editionのすべてのジャンルで候補が1件も残らなかった場合のみ「候補不足によりスキップ」とする(requirements.md#機能要件-4、[weekly-publish/requirements.md#掲載件数の保証-1](../weekly-publish/requirements.md))。カルチャー編は1件目だけで10ジャンル分となり`perEditionMax`と同数になるため、2件目が採用されるのは1件目が10ジャンル未満しか埋まらなかった回に限られる
- 関連するビジネスルール: requirements.md#機能要件-6、requirements.md#配信全体の絞り込み-1

## エラーハンドリング

- 個々の情報源(固定リストジャンル)の取得失敗は、その情報源だけを除外して収集処理を続ける(処理フロー参照)。取得できなかった情報源はログに記録し、[source-review](../source-review/requirements.md)の月次見直しで妥当性を確認する
- WebSearchジャンルの検索・判定自体が失敗・応答不能だった場合、そのジャンルは「候補0件」として扱い、他のジャンルの収集・選定を止めない
- 観測ログの書き出しの失敗・履歴データの破損は、[trend-history](../trend-history/design.md)のエラーハンドリングのとおり実行を失敗させる(収集失敗と異なり、履歴の欠落は以後の全ステータス判定に影響し続けるため、握りつぶさない)
- 掲載可能な候補が対象editionで1件も残らなかった場合は、[weekly-publish](../weekly-publish/design.md)側が「候補不足によりスキップ」として扱う。収集自体が0件だった場合と、収集はできたが中長期トレンドの絞り込み・再掲抑制で全件除外された場合の両方がこれに当たり、ログではそれぞれを区別して記録する

## 関連するファイル(抜粋)

```
content/trend-digest/watchlist.json (既存: dev-trendsジャンルの追加・各情報源へのregion付与)
content/trend-digest/criteria.json (既存: dev-trendsのgenreCriteriaとhistoryの閾値を追加)
app/trend-digest/lib/types.ts (既存: Genreにdev-trendsを追加、GENRE_ORDER・GENRE_LABELSも更新)
app/trend-digest/lib/watchlistTypes.ts (既存: SourceRegionの追加・CriteriaへのhistoryとWatchlistEntryのsourcesへのregion追加)
app/trend-digest/lib/candidateTypes.ts (既存: Candidateへの地域情報の追加・PublishableCandidateの追加)
app/trend-digest/lib/historyTypes.ts (trend-historyで新規作成: TrendStatus等を利用)
app/trend-digest/lib/selection.ts (既存: 中長期トレンドの絞り込み・再掲抑制の書き換え。normalizeTitleはtrend-historyと共用)
app/trend-digest/lib/fetchFixedListCandidates.ts (既存: 情報源のregionから日本/海外の強度を数える処理を追加)
scripts/trend-digest/collect-websearch-candidates.ts (既存: 地域情報の収集をプロンプト・応答形式に追加)
scripts/trend-digest/collect-and-select.ts (既存: 観測ログの書き出しと履歴にもとづく絞り込みの呼び出しを追加)
```

`selection.ts`は入出力が純粋なデータ(候補配列・ステータス判定結果→選定結果)のみのため、通常のvitestで完全にテストできる。`fetchFixedListCandidates.ts`は外部ページへのHTTP呼び出しを伴うため、レスポンス形状のパース・エラー処理のみをモックしたテストの対象とし、実際の外部通信を伴う疎通確認は週次実行結果([weekly-publish](../weekly-publish/design.md))で代替する。`collect-websearch-candidates.ts`はClaude Code CLIのヘッドレス起動そのものであり、決定的なテストは書かず(ai-dev-digestのcontent-generationと同じ考え方)、応答形式の分類ロジックのみをテスト対象にする。

## セキュリティ

- 固定リストジャンルの情報源取得は、公式サイト・公開ページの閲覧の範囲にとどめ、非公式APIや利用規約を超えた高頻度アクセスは行わない(requirements.md#データ取得方法-1)。アクセス頻度は週2回(編ごと1回)の実行分のみで、履歴の蓄積のために収集頻度を上げることはしない(requirements.md#スコープ外)
- WebSearchジャンルの検索はClaude Code CLI標準のWebSearchツールの範囲で行い、追加のスクレイピング処理は持たない
- 食べログ・Rettyの有料APIやX/Instagram/Threads/TikTokの公式APIは利用しない(requirements.md#選定方式-4〜5、スコープ外)
- 収集した候補は採用・不採用を問わず履歴としてリポジトリに残るが、記録するのは公開情報から得た話題名と強度・地域だけであり、個人情報・機微情報は含まない([trend-history/design.md](../trend-history/design.md)のセキュリティ参照)

## ログ

- 週次実行のログに、ジャンルごとに「収集した候補件数(取得失敗・検索失敗はその旨)」を標準エラー出力へ記録する(requirements.md#情報源の健全性監視-1)
- 候補件数が0件だった情報源・ジャンルは警告(`WARN`)と分かる形で出力する(慢性的な0件を月次見直しで拾えるようにするため)
- 中長期トレンドの絞り込みで除外した候補の件数を、ステータスごと(NEW/SHORT_TERM/DECLINING)に記録する(requirements.md#情報源の健全性監視-2)
- 前回掲載時からステータスが変わらないために再掲を見送った候補の件数と、続報として再掲する候補の件数(報告回数付き)を記録する
- 対象editionで掲載可能な候補が0件の場合は、その旨を「収集自体が0件」「絞り込みで全件除外」のどちらなのかが分かる形で標準エラー出力へ記録する。[weekly-publish](../weekly-publish/design.md)側は標準出力のJSONの`status`フィールドを見てPRを作成しない判断に使う
