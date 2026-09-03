# 設計: 情報源ウォッチリストと採用基準

## 設計の前提(エージェントの推論とコードの役割分担)

[daily-publish](../daily-publish/requirements.md)の実行主体はGitHub Actions(ワークフローからAnthropic APIを呼び出す構成。2026-08改定前はClaude Routinesを想定していた)だが、本specが扱う「採用基準を満たすか」の判定は次の理由から**決定的なコード(TypeScriptの純粋関数+スクリプト)として実装し、エージェントの推論には委ねない**(要件はロジックの実装形態まで指定していないため設計判断。方針は下記の通り):

- 「1日3〜5件」という件数はビジネス上の固定不変条件であり、LLMの推論結果として毎回保証されるとは限らない(数え間違い・思い込みのリスク)。件数を必ず満たすかどうかは算術的に検証可能なため、コードに任せて確実性を上げる
- いいね数・平均再生回数などの数値比較も同様に、LLMの計算より決定的なコードの方が誤りが少ない
- 一方で、収集した候補が「AI駆動開発の話題として妥当か」「どの見出し・要約が適切か」といった意味的な判断はコードでは書けないため、[content-generation](../content-generation/requirements.md)の翻訳・要約・記事執筆はエージェントの推論に委ねる

この方針に基づき、本specの成果物は「候補を集めて基準判定し、最終的に3〜5件を選び出すコード」であり、見出し・要約(日本語の紹介文)の作成は含まない(content-generationの領分)。

## データ設計(ウォッチリスト・採用基準)

ウォッチリスト・採用基準は本specの`requirements.md`(人間が読む正の仕様)と、実行時にコードが読み込む機械可読データの二重管理とする。[watchlist-review](../watchlist-review/requirements.md)の月次見直しPRは、**同じ変更を`requirements.md`とこの機械可読データの両方に加える**(片方だけの変更はレビューで差し戻す)。

- `content/ai-dev-digest/watchlist.json` — requirements.md#情報源(ウォッチリスト)-1の18件をそのまま構造化したもの
- `content/ai-dev-digest/criteria.json` — requirements.md#採用基準(種別ごとの定量判定)・#話題の関連性・#情報源内の重複掲載の抑制・#掲載済み記事の再掲抑制で使う数値・設定

```ts
// app/ai-dev-digest/lib/watchlistTypes.ts
export type WatchlistCategory = 'official' | 'individual-youtube' | 'individual-blog' | 'platform'

export type WatchlistEntry = {
  id: string // 例: "anthropic", "karpathy"
  category: WatchlistCategory
  name: string // 例: "Anthropic"
  channels: Array<
    | { type: 'youtube'; channelId: string }
    | { type: 'rss'; feedUrl: string }
    | { type: 'platform-qiita' }
    | { type: 'platform-zenn' }
  >
}

export type Criteria = {
  dailyTopicCount: { min: number; max: number } // requirements.md#1日の掲載件数-9
  youtubeRecentVideoWindow: number // 平均再生回数の算出対象本数
  youtubeCandidateVideoCount: number // 各チャンネルで採用候補として評価する直近動画の本数(requirements.md#採用基準-5)
  youtubeAboveAverageRatio: number // 平均の何倍を上回れば採用候補にするか
  qiitaMinLikes: number // requirements.md#採用基準-7
  qiitaMaxAgeDays: number // Qiita記事を採用候補にする公開後の経過日数の上限(requirements.md#採用基準-7)
  zennMinLikes: number // requirements.md#採用基準-8
  minIndividualBlogBodyChars: number // 個人ブログ投稿を採用候補にする本文の最小文字数(requirements.md#採用基準-6)
  topicExcludeKeywords: string[] // 原文タイトルに含まれると候補から除外するキーワード(requirements.md#話題の関連性-12)
  duplicateSuppressionSourceTypes: SourceType[] // 同一情報源・同日の重複を1件に絞る対象種別(requirements.md#情報源内の重複掲載の抑制-13)
}
```

`criteria.json`の初期値(要件が数値を定めていない項目は設計時の暫定値。妥当性は運用実績を見て[watchlist-review](../watchlist-review/requirements.md)で見直す):
```json
{
  "dailyTopicCount": { "min": 3, "max": 5 },
  "youtubeRecentVideoWindow": 10,
  "youtubeCandidateVideoCount": 5,
  "youtubeAboveAverageRatio": 1.2,
  "qiitaMinLikes": 30,
  "qiitaMaxAgeDays": 60,
  "zennMinLikes": 30,
  "minIndividualBlogBodyChars": 150,
  "topicExcludeKeywords": ["医療", "ヘルスケア", "診断", "healthcare", "medical", "clinical"],
  "duplicateSuppressionSourceTypes": ["individual-blog"]
}
```
(`topicExcludeKeywords`の全量は`content/ai-dev-digest/criteria.json`が正。ここは形を示す抜粋)

## 処理フロー

### 情報源から候補を収集する処理
- 対象: `watchlist.json`に登録された18件の情報源
- 手順:
  1. 種別ごとに公式API・公式RSSフィード・公開ページの閲覧の範囲でデータを取得する(requirements.md#データ取得方法-1)
     - 公式組織・個人YouTube: YouTube Data API(公式)で対象チャンネルの動画と再生回数を取得する。個人YouTubeは直近`youtubeCandidateVideoCount`本を採用候補として、それに続く`youtubeRecentVideoWindow`本を平均再生回数の算出対象として取得する(requirements.md#採用基準-5)。公式組織のYouTubeは最新1本のみ
     - 公式組織のブログ・個人ブログ: 公式RSS/Atomフィードを取得する。個人ブログ(種別`individual-blog`)は、フィードが返す本文(`content:encoded`/`summary`/`description`/atomの`content`)からHTMLタグを除いた文字数が`minIndividualBlogBodyChars`未満の投稿を、この時点で候補から除外する(requirements.md#採用基準-6。Zennのいいね数を読めない記事を収集時点で除外するのと同じ扱い)。除外した投稿は、件数と元URLを標準エラー出力に「本文量により除外」として記録する(閾値が短い正当な投稿(引用・リンク論評など)を巻き込んでいないかを月次見直しで検証できるようにする)
     - Qiita: 公式APIで記事といいね数・公開日時を取得する。公開が新しい順に、`qiitaMaxAgeDays`日より古い記事に到達するまでページを辿る(requirements.md#採用基準-7)
     - Zenn: 公式RSSフィードで新着記事を検知し、各記事の公開ページ(HTML)を開いていいね数の表示値を読み取る(requirements.md#採用基準-8)
  2. 取得できなかった情報源(一時的な障害・レート制限等)は、その情報源だけを候補から除外して処理を続ける(1件の取得失敗で日次実行全体を止めない)
  3. 取得した各候補について、発信者名・見出し(原文タイトル)・元URL・公開日時・種別ごとの判定用の数値(再生回数/いいね数、個人YouTubeは併せて候補群を除いた直後の動画群の平均再生回数)を記録する
  4. 情報源ごとの収集件数(取得失敗・0件はその旨)を標準エラー出力に記録する(requirements.md#情報源の健全性監視-2)
- 関連するビジネスルール: requirements.md#データ取得方法-1、requirements.md#情報源の健全性監視-2

### 話題の関連性フィルタを適用する処理(決定的なコード。2026-08第2次改定)
- 対象: 収集した候補すべて(採用基準の判定より前に適用する)
- 手順:
  1. 候補の原文タイトル(`heading`)に、`criteria.json`の`topicExcludeKeywords`のいずれかが含まれる場合、大文字小文字を区別せず候補から除外する。除外された候補は、他の採用基準(手順は下記「採用基準を判定する処理」参照)を満たしていても採用候補にも基準未達候補にもならない(requirements.md#話題の関連性-12)
  2. 原文タイトルは情報源によって日本語・英語のいずれもありうるため、`topicExcludeKeywords`には日英両方のキーワードを登録する運用とする(design時点の初期値は「医療・ヘルスケア」の典型例のみ。妥当性は運用実績を見て[watchlist-review](../watchlist-review/requirements.md)で見直す。他の`criteria.json`の初期値と同じ運用)
  3. タイトルのみを判定対象とし、本文(要約)の内容までは参照しない(候補収集時点では要約がまだ生成されていないため。要約生成後に不適切な内容と判明した場合は[content-generation](../content-generation/design.md)のガードレール文言で防ぐ)
  4. この日の候補すべてが除外された場合、実在する候補が残らないため「候補不足によりスキップ」として扱う(手順は下記「1日分のトピックを選び出す処理」の候補不足時の扱いと同じ)
- 実装が「決定的なコード」である理由: 本spec冒頭「設計の前提」の役割分担(数値比較等は決定的なコードに任せる)に、意味的な話題判定を追加する設計判断。厳密なキーワード一致では取りこぼし・誤判定がありうるが、追加のLLM呼び出し(コスト・レイテンシ)を発生させずに済み、値は月次見直しで随時調整できるため、他の数値基準と同じ運用に揃えた(2026-08第2次改定。当初requirements.mdは判定方法をキーワード判定・エージェント推論のどちらにするか未確定としていたが、この設計判断により決定的なキーワード判定に確定した)
- 関連するビジネスルール: requirements.md#話題の関連性-12

### 採用基準を判定する処理
- 対象: 話題の関連性フィルタを通過した候補1件ずつ
- 手順:
  1. 公式組織の新着投稿は無条件で基準を満たすと判定する(requirements.md#採用基準-4)
  2. 個人YouTubeは、候補となる直近`youtubeCandidateVideoCount`本それぞれについて、**候補群を除いた直後の`youtubeRecentVideoWindow`本**(=新しい順に数えて`youtubeCandidateVideoCount + 1`本目から`youtubeCandidateVideoCount + youtubeRecentVideoWindow`本目まで)の平均再生回数に`youtubeAboveAverageRatio`を掛けた値を上回れば、その動画は基準を満たすと判定する(requirements.md#採用基準-5)。全候補が同じ平均値を基準にする。平均対象が取得できた本数だけ少ない場合は取得できた範囲で平均する。平均対象が0本のときは平均を0として扱う(結果として再生数が1以上なら採用候補になる。既存の最新1本評価時の挙動を踏襲)。投稿直後の動画は再生数が伸びる前で不利になるが、これは相対評価がもともと持つ性質で、複数本を評価対象にすることで数日かけて伸びた動画を後日拾えるようにする趣旨。評価窓を固定本数にしているため、投稿頻度が高いチャンネルでは窓が数日で入れ替わり、低いチャンネルでは古い動画が長く候補に残る
  3. 個人ブログ(`individual-blog`)の新着は無条件で基準を満たすと判定する(requirements.md#採用基準-6。本文が短い投稿は収集時点で既に除外済み)
  4. Qiitaの記事はいいね数が`qiitaMinLikes`以上なら基準を満たすと判定する(requirements.md#採用基準-7。公開後`qiitaMaxAgeDays`日以内という期間の絞り込みは収集時点で済んでいる)
  5. Zennの新着記事はいいね数が`zennMinLikes`以上なら基準を満たすと判定する(requirements.md#採用基準-8)
  6. 判定結果(基準を満たすか)と、満たさない場合はどれだけ乖離しているか(例: 「いいね数18件(基準30件に12件不足)」)を候補に記録する
- 関連するビジネスルール: requirements.md#採用基準-4〜8

### 掲載済み記事を除外する処理(決定的なコード)
- 対象: 収集した候補すべて(話題の関連性フィルタ・重複抑制・採用基準の判定より前に適用する)
- 手順:
  1. `content/ai-dev-digest/articles/*.json`の全記事の全トピックから元URL(`sourceUrl`)を集めた集合を作る。期間で絞らず全記事を対象にする(URL文字列を`Set`に集めるだけの軽い処理であり、[5]の個人YouTube採用候補は本数ベースで公開日の上限がないため、投稿頻度の低いチャンネル(年数回投稿など)では過去に掲載した動画が数ヶ月〜1年以上経ってから再び候補になりうる。期間で絞ると[14]がその再掲を取りこぼす)
  2. 候補の元URL(`url`)と集合内のURLを、比較前に正規化してから突き合わせる。正規化はホスト名の小文字化・クエリ文字列とフラグメントの除去・末尾スラッシュの統一とする(追跡パラメータの付与や末尾スラッシュの揺れで再掲を取りこぼさないため。scheme(`http`/`https`)や`www`有無の違いまでは吸収しない。URLとして解釈できない文字列は素の文字列のまま扱う)。正規化後に一致した候補を除外する(requirements.md#掲載済み記事の再掲抑制-14)
  3. すべての候補が除外され実在する候補が残らなかった場合は「候補不足によりスキップ」として扱う(下記「1日分のトピックを選び出す処理」の候補不足時の扱いと同じ)
- 実行主体: 掲載済みURLの読み込みは`scripts/ai-dev-digest/collect-and-select.ts`が担い、除外そのものは`selection.ts`の純粋関数として実装しテスト可能にする(引数で掲載済みURL集合を受け取る)
- エッジケース: 当日の記事PRが未マージのまま翌日の実行が走った場合、前日分の記事JSONがまだmainに無いため前日の話題は除外できない。[daily-publish](../daily-publish/requirements.md)は日次記事PRを同日に自動マージする前提のため、通常は発生しない
- 関連するビジネスルール: requirements.md#掲載済み記事の再掲抑制-14

### 情報源内の重複を抑制する処理(決定的なコード)
- 対象: 掲載済み記事の除外を通過した候補すべて(話題の関連性フィルタ・採用基準の判定より前に適用する)
- 手順:
  1. `criteria.json`の`duplicateSuppressionSourceTypes`に含まれる種別の候補について、同一情報源(`sourceId`)で複数の候補があれば、公開日時(`publishedAt`)が最も新しい1件だけを残し、他は除外する(requirements.md#情報源内の重複掲載の抑制-13)
  2. `duplicateSuppressionSourceTypes`に含まれない種別・異なる情報源同士は互いに影響しない
- 実装が「決定的なコード」である理由: 話題の関連性フィルタと同じく、意味的な類似判定ではなく「同一情報源・同日」という決定的な条件に落とし込むことで、追加のLLM呼び出しなしに実現する。見出しの意味的な重複(異なる情報源が同じニュースを扱う等)までは判定しない
- 関連するビジネスルール: requirements.md#情報源内の重複掲載の抑制-13

### 1日分のトピックを選び出す処理
- 対象: 収集した候補一覧
- フィルタの適用順(`selectDailyTopics`が先頭から順に適用する。いずれも「実在する候補が0件になったらスキップ」の扱いは共通):
  1. 掲載済み記事を除外する(上記「掲載済み記事を除外する処理」)
  2. 情報源内の重複を抑制する(上記「情報源内の重複を抑制する処理」)
  3. 話題の関連性フィルタを適用する(上記「話題の関連性フィルタを適用する処理」)
  4. 残った候補を採用基準で判定する(上記「採用基準を判定する処理」)
  5. 以下の件数調整を行う
- 件数調整の手順:
  1. 基準を満たす候補が`dailyTopicCount.max`(5件)を超える場合は、公式組織/個人YouTube/個人ブログ/Qiita/Zennの種別ができるだけ偏らないように分散させながら、公開日時が新しいものから`dailyTopicCount.max`件を選ぶ(要件は基準超過時の絞り込み方法を定めていないため設計判断)
  2. 基準を満たす候補が`dailyTopicCount.min`(3件)以上`dailyTopicCount.max`(5件)以下の場合は、それらをそのまま採用する
  3. 基準を満たす候補が`dailyTopicCount.min`(3件)未満の場合、不足分は基準を満たさない候補の中から、基準からの乖離が小さい順に補って`dailyTopicCount.min`件に達するようにする(requirements.md#1日の掲載件数-10)。補った各トピックには基準未達である旨と乖離内容を記録する
  4. 基準を満たす候補・基準を満たさない候補を合わせても`dailyTopicCount.min`件に満たない場合は、件数を無理に満たすために存在しない話題を作らない。実在する候補(基準未達の候補を含む)が1件以上残っていれば、その件数のまま採用する(3件に届かせるための架空の話題は作らない)。採用した候補のうち基準を満たさないものには、手順3と同様に基準未達である旨と乖離内容を記録する。実在する候補が1件もない場合のみ、その日は記事を生成せず「候補不足によりスキップ」として記録する(requirements.md#1日の掲載件数-10)
- 関連するビジネスルール: requirements.md#1日の掲載件数-9〜10

### 基準未達掲載を記録する処理
- 対象: 上記手順3・手順4で基準未達のまま採用されたトピック(手順4は基準を満たす候補も基準を満たさない候補もそのまま採用しうるため、そのうち基準を満たさないものが対象)
- 手順:
  1. 基準未達で採用したトピックには、[article-detail](../article-detail/design.md)の`Topic.belowCriteria`を`true`にし、`belowCriteriaReason`に乖離内容を設定する
  2. 個別の記録ファイルは持たず、公開済みの記事データ(`content/ai-dev-digest/articles/*.json`)の`belowCriteria`フィールド自体を記録として扱う。[watchlist-review](../watchlist-review/requirements.md)の月次見直しは、直近1ヶ月分の記事データをスキャンして基準未達件数・情報源を集計する(requirements.md#1日の掲載件数-11)
- 関連するビジネスルール: requirements.md#1日の掲載件数-11

## エラーハンドリング

- 個々の情報源の取得失敗は「その情報源を除外して続行」とし、収集処理全体を失敗させない(処理フロー参照)
- 実在する候補(基準未達の候補を含む)が1件もない場合のみ記事生成をスキップする(処理フロー参照)。これは[daily-publish](../daily-publish/requirements.md)側の実行が失敗したことにはせず、「その日は正常に0件と判断した」結果として扱う(CI失敗やPR作成失敗とは区別する。daily-publish/design.md#エラーハンドリング参照)。話題の関連性フィルタ・掲載済み記事の除外・情報源内の重複抑制・個人ブログの本文量による除外で外れた候補は「実在する候補」に含めない(いずれも正常な判定結果であり、収集失敗とは異なる)
- Zennのいいね数取得元である公開ページのHTML構造が変わり、いいね数を読み取れない場合はその記事を候補から除外する(誤った数値で誤判定するより、除外の方が安全なため)
- LangChain公式ブログのフィードURLは、`fetchAllCandidates`がHTMLを返すフィードでも例外にならず空配列を返すことに起因して無言で候補ゼロが続いていた。実装PR(tasks.md Task 9)で`watchlist.json`のURLを有効なフィード(`/rss.xml`)に修正する。requirements.md#情報源の健全性監視-2の0件ログ出力は、この種の無言停止に早く気づくための対策

## 関連するファイル(抜粋)

```
content/ai-dev-digest/watchlist.json (新規: 情報源ウォッチリスト)
content/ai-dev-digest/criteria.json (新規: 採用基準の数値)
app/ai-dev-digest/lib/watchlistTypes.ts (新規: 型定義)
app/ai-dev-digest/lib/candidateTypes.ts (新規: Candidate/SelectionResultの型定義)
app/ai-dev-digest/lib/selection.ts (新規: 採用基準判定・1日分の選定ロジック。純粋関数でテスト可能)
app/ai-dev-digest/lib/fetchCandidates.ts (新規: 各情報源への問い合わせ処理。YouTube Data API/RSS/Qiita API呼び出し)
scripts/ai-dev-digest/collect-and-select.ts (fetchCandidates+selectionを実行しJSONを標準出力するCLI。掲載済み記事URLの読み込み(content/ai-dev-digest/articles/*.json)もここで行う。GitHub Actionsのワークフローから呼び出される)
```

`selection.ts`は入出力が純粋なデータ(候補配列→選定結果)のみで、Supabaseやファイル入出力を持たないため、通常のvitestで完全にテストできる。`fetchCandidates.ts`は外部APIへのHTTP呼び出しを伴うため、レスポンス形状のパース・エラー処理のみをモックしたテストの対象とし、実際の外部通信を伴う疎通確認は日次実行結果(daily-publish)で代替する。

## セキュリティ

- YouTube Data APIキーは、このリポジトリのGitHub Actions Secrets(`YOUTUBE_API_KEY`)として保存する(2026-08改定。当初はClaude Routines実行環境の環境変数として保持する想定だったが、[daily-publish/design.md](../daily-publish/design.md)「実行環境の前提」の改定によりGitHub Actionsに変更した)
- Qiita API・各社RSSフィード・Zennの公開ページ閲覧は認証不要の公開エンドポイントのみを使い、非公式APIや利用規約を超えた高頻度アクセスは行わない(requirements.md#データ取得方法-1)。アクセス頻度は1日1回の実行分のみで、スクレイピング的な連続アクセスは発生しない設計とする

## ログ

- 標準出力(stdout)は[daily-publish](../daily-publish/design.md)がそのままパースする選定結果JSON専用とし、ログ用途には使わない
- 収集・選定の実行結果として、情報源ごとの取得件数・基準を満たした件数・基準未達で補った件数・スキップした情報源(取得失敗)を標準エラー出力(stderr)に記録する(GitHub Actionsのワークフロー実行ログとして残る)
- 上記の情報源ごとの取得件数のうち、0件だった情報源は警告(`WARN`)と分かる形で出力する(requirements.md#情報源の健全性監視-2。フィード廃止・URL変更で無言停止した情報源を月次見直しで拾えるようにする)
- 個人ブログの本文量による除外(design「情報源から候補を収集する処理」)が発生した場合、除外件数と元URLをstderrへ記録する
- これらのstderrログは日次ワークフローの実行ログに残るだけで、どこにも永続集計されない。月次見直し([watchlist-review](../watchlist-review/requirements.md))が情報源の健全性を判断する際は、必要に応じて担当者(またはヘッドレス実行のエージェント)がGitHub Actionsの実行ログを参照する運用とする(記事JSON・フィードバックテーブルのような自動集計対象には含めない)
- 候補不足によるスキップが発生した場合はその旨を明確に標準エラー出力(stderr)へ記録する。daily-publish側は標準出力のJSONの`status`フィールドを見てPRを作成しない判断に使う
