# 設計: 情報源ウォッチリストと採用基準

## 設計の前提(エージェントの推論とコードの役割分担)

[daily-publish](../daily-publish/requirements.md)の実行主体はClaude Routines(推論するエージェント)だが、本specが扱う「採用基準を満たすか」の判定は次の理由から**決定的なコード(TypeScriptの純粋関数+スクリプト)として実装し、エージェントの推論には委ねない**【推測】(要件はロジックの実装形態まで指定していないため設計判断。方針は下記の通り):

- 「1日3〜5件」という件数はビジネス上の固定不変条件であり、LLMの推論結果として毎回保証されるとは限らない(数え間違い・思い込みのリスク)。件数を必ず満たすかどうかは算術的に検証可能なため、コードに任せて確実性を上げる
- いいね数・平均再生回数などの数値比較も同様に、LLMの計算より決定的なコードの方が誤りが少ない
- 一方で、収集した候補が「AI駆動開発の話題として妥当か」「どの見出し・要約が適切か」といった意味的な判断はコードでは書けないため、[content-generation](../content-generation/requirements.md)の翻訳・要約・記事執筆はエージェントの推論に委ねる

この方針に基づき、本specの成果物は「候補を集めて基準判定し、最終的に3〜5件を選び出すコード」であり、見出し・要約(日本語の紹介文)の作成は含まない(content-generationの領分)。

## データ設計(ウォッチリスト・採用基準)

ウォッチリスト・採用基準は本specの`requirements.md`(人間が読む正の仕様)と、実行時にコードが読み込む機械可読データの二重管理とする。[watchlist-review](../watchlist-review/requirements.md)の月次見直しPRは、**同じ変更を`requirements.md`とこの機械可読データの両方に加える**(片方だけの変更はレビューで差し戻す)。

- `content/ai-dev-digest/watchlist.json` — requirements.md#情報源(ウォッチリスト)-1の13件をそのまま構造化したもの
- `content/ai-dev-digest/criteria.json` — requirements.md#採用基準(種別ごとの定量判定)の数値基準

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
  youtubeRecentVideoWindow: number // 平均再生回数の算出対象本数【推測】
  youtubeAboveAverageRatio: number // 平均の何倍を上回れば採用候補にするか【推測】
  qiitaMinLikes: number // requirements.md#採用基準-7
  zennMinLikes: number // requirements.md#採用基準-8
}
```

`criteria.json`の初期値【推測】(要件は「明確に上回る」としか定めていないため設計時の暫定値。妥当性は運用実績を見て[watchlist-review](../watchlist-review/requirements.md)で見直す):
```json
{
  "dailyTopicCount": { "min": 3, "max": 5 },
  "youtubeRecentVideoWindow": 10,
  "youtubeAboveAverageRatio": 1.2,
  "qiitaMinLikes": 30,
  "zennMinLikes": 30
}
```

## 処理フロー

### 情報源から候補を収集する処理
- 対象: `watchlist.json`に登録された13件の情報源
- 手順:
  1. 種別ごとに公式API・公式RSSフィード・公開ページの閲覧の範囲でデータを取得する(requirements.md#データ取得方法-1)
     - 公式組織・個人YouTube: YouTube Data API(公式)で対象チャンネルの新着動画と再生回数を取得する
     - 公式組織のブログ・Simon Willisonの個人ブログ: 公式RSSフィードを取得する
     - Qiita: 公式APIで新着記事といいね数を取得する
     - Zenn: 公式RSSフィードで新着記事を検知し、各記事の公開ページ(HTML)を開いていいね数の表示値を読み取る(requirements.md#採用基準-8)
  2. 取得できなかった情報源(一時的な障害・レート制限等)は、その情報源だけを候補から除外して処理を続ける(1件の取得失敗で日次実行全体を止めない)
  3. 取得した各候補について、発信者名・見出し(原文タイトル)・元URL・公開日時・種別ごとの判定用の数値(再生回数/いいね数、YouTubeは併せて直近動画群の平均再生回数)を記録する
- 関連するビジネスルール: requirements.md#データ取得方法-1

### 採用基準を判定する処理
- 対象: 収集した候補1件ずつ
- 手順:
  1. 公式組織の新着投稿は無条件で基準を満たすと判定する(requirements.md#採用基準-4)
  2. 個人YouTubeの動画は、そのチャンネルの直近`youtubeRecentVideoWindow`本の平均再生回数に`youtubeAboveAverageRatio`を掛けた値を上回れば基準を満たすと判定する(requirements.md#採用基準-5)
  3. Simon Willisonのブログ新着は無条件で基準を満たすと判定する(requirements.md#採用基準-6)
  4. Qiitaの新着記事はいいね数が`qiitaMinLikes`以上なら基準を満たすと判定する(requirements.md#採用基準-7)
  5. Zennの新着記事はいいね数が`zennMinLikes`以上なら基準を満たすと判定する(requirements.md#採用基準-8)
  6. 判定結果(基準を満たすか)と、満たさない場合はどれだけ乖離しているか(例: 「いいね数18件(基準30件に11件不足)」)を候補に記録する
- 関連するビジネスルール: requirements.md#採用基準-4〜8

### 1日分のトピックを選び出す処理
- 対象: 判定済みの候補一覧
- 手順:
  1. 基準を満たす候補が`dailyTopicCount.max`(5件)を超える場合は、公式組織/個人YouTube/個人ブログ/Qiita/Zennの種別ができるだけ偏らないように分散させながら、公開日時が新しいものから`dailyTopicCount.max`件を選ぶ【推測】(要件は基準超過時の絞り込み方法を定めていないため設計判断)
  2. 基準を満たす候補が`dailyTopicCount.min`(3件)以上`dailyTopicCount.max`(5件)以下の場合は、それらをそのまま採用する
  3. 基準を満たす候補が`dailyTopicCount.min`(3件)未満の場合、不足分は基準を満たさない候補の中から、基準からの乖離が小さい順に補って`dailyTopicCount.min`件に達するようにする(requirements.md#1日の掲載件数-10)。補った各トピックには基準未達である旨と乖離内容を記録する
  4. 基準を満たす候補・基準を満たさない候補を合わせても`dailyTopicCount.min`件に満たない場合は、件数を無理に満たすために存在しない話題を作らない。実在する候補(基準未達の候補を含む)が1件以上残っていれば、その件数のまま採用する(3件に届かせるための架空の話題は作らない)。実在する候補が1件もない場合のみ、その日は記事を生成せず「候補不足によりスキップ」として記録する(requirements.md#1日の掲載件数-10)
- 関連するビジネスルール: requirements.md#1日の掲載件数-9〜10

### 基準未達掲載を記録する処理
- 対象: 上記手順3で基準未達のまま採用されたトピック
- 手順:
  1. 基準未達で採用したトピックには、[article-detail](../article-detail/design.md)の`Topic.belowCriteria`を`true`にし、`belowCriteriaReason`に乖離内容を設定する
  2. 個別の記録ファイルは持たず、公開済みの記事データ(`content/ai-dev-digest/articles/*.json`)の`belowCriteria`フィールド自体を記録として扱う。[watchlist-review](../watchlist-review/requirements.md)の月次見直しは、直近1ヶ月分の記事データをスキャンして基準未達件数・情報源を集計する(requirements.md#1日の掲載件数-11)
- 関連するビジネスルール: requirements.md#1日の掲載件数-11

## エラーハンドリング

- 個々の情報源の取得失敗は「その情報源を除外して続行」とし、収集処理全体を失敗させない(処理フロー参照)
- 実在する候補(基準未達の候補を含む)が1件もない場合のみ記事生成をスキップする(処理フロー参照)。これは[daily-publish](../daily-publish/requirements.md)側の実行が失敗したことにはせず、「その日は正常に0件と判断した」結果として扱う(CI失敗やPR作成失敗とは区別する。daily-publish/design.md#エラーハンドリング参照)
- Zennのいいね数取得元である公開ページのHTML構造が変わり、いいね数を読み取れない場合はその記事を候補から除外する(誤った数値で誤判定するより、除外の方が安全なため)

## 関連するファイル(抜粋)

```
content/ai-dev-digest/watchlist.json (新規: 情報源ウォッチリスト)
content/ai-dev-digest/criteria.json (新規: 採用基準の数値)
app/ai-dev-digest/lib/watchlistTypes.ts (新規: 型定義)
app/ai-dev-digest/lib/candidateTypes.ts (新規: Candidate/SelectionResultの型定義)
app/ai-dev-digest/lib/selection.ts (新規: 採用基準判定・1日分の選定ロジック。純粋関数でテスト可能)
app/ai-dev-digest/lib/fetchCandidates.ts (新規: 各情報源への問い合わせ処理。YouTube Data API/RSS/Qiita API呼び出し)
scripts/ai-dev-digest/collect-and-select.ts (新規: fetchCandidates+selectionを実行しJSONを標準出力するCLI。Claude Routinesから呼び出される)
```

`selection.ts`は入出力が純粋なデータ(候補配列→選定結果)のみで、Supabaseやファイル入出力を持たないため、通常のvitestで完全にテストできる。`fetchCandidates.ts`は外部APIへのHTTP呼び出しを伴うため、レスポンス形状のパース・エラー処理のみをモックしたテストの対象とし、実際の外部通信を伴う疎通確認はエージェントの日次実行結果(daily-publish)で代替する。

## セキュリティ

- YouTube Data APIキーはリポジトリ・GitHub Actions Secretsに含めず、Claude Routinesの実行環境の環境変数(`YOUTUBE_API_KEY`)としてのみ保持する(docs/adr/0004の`benriyatool_readonly`接続情報と同様、実行環境固有のシークレットとして扱う方針を踏襲)【推測】(Claude Routinesのシークレット管理方法自体は本プロジェクト初導入のため、運用開始前に設定を確認する)
- Qiita API・各社RSSフィード・Zennの公開ページ閲覧は認証不要の公開エンドポイントのみを使い、非公式APIや利用規約を超えた高頻度アクセスは行わない(requirements.md#データ取得方法-1)。アクセス頻度は1日1回の実行分のみで、スクレイピング的な連続アクセスは発生しない設計とする

## ログ

- 収集・選定の実行結果として、情報源ごとの取得件数・基準を満たした件数・基準未達で補った件数・スキップした情報源(取得失敗)を標準出力に記録する(Claude Routinesの実行ログとして残る)
- 候補不足によるスキップが発生した場合はその旨を明確に標準出力へ記録し、[daily-publish](../daily-publish/design.md)側がこれを検知してPRを作成しない判断に使う
