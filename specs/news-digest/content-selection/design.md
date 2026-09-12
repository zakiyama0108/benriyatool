# 設計: カテゴリ・情報源と採用基準

## サマリ
週次でカテゴリごとに情報源(固定リスト)から候補記事を収集し、採用基準を判定して1週間分のトピックを選び出す。ai-dev-digestの選定ロジックと異なり、「複数の主要メディアが同時に報じているか」「専用枠で最も重要なものはどれか」はいずれも見出し・内容の意味的な比較を要する判断のため、収集は決定的なコード(RSS/公開ページ取得)、候補のグループ化・重要度判断はClaude Code CLIのヘッドレス実行(エージェントの推論)に委ねる(下記「設計の前提」)。件数上限の適用・掲載済み記事の除外は決定的なコードで行う。

## 設計の前提(エージェントの推論とコードの役割分担)

ai-dev-digest(`content-selection/design.md`)は「採用基準を満たすか」の判定を決定的なコードに任せていたが、これは平均再生回数・いいね数といった数値比較で完結する基準だったため成立していた。本specの採用基準は性質が異なる:

- 総合・経済/ビジネスの採用基準([4]、複数の主要メディアの同時報道)は、「NHKの記事と共同通信の記事が同じ出来事を報じているか」という見出し・内容の意味的な一致判定を要する。異なる媒体は見出しの文言・URLが一致しないため、単純な文字列一致・URL一致では判定できない(ai-dev-digestが requirements.md#話題の重複掲載の抑制-15 で「文字N-gram類似度では安定して切り分けられなかった」として実装を見送った問題と同種)
- 神奈川ローカル・育児の専用枠([5]、「その週で最も重要と判断されるもの」)も、複数の候補から重要度が最も高い1件を選ぶという意味的な判断を要する

この2点のみ、Claude Code CLIのヘッドレス実行(エージェントの推論)に委ねる。一方、次は決定的なコードに任せる(要件はロジックの実装形態まで指定していないため設計判断):

- 各情報源からの新着候補の収集(RSS・公開ページの取得)
- 掲載済み記事の再掲抑制([8]、元URL一致判定)
- カテゴリごとの掲載件数上限の適用([6][7])

## データ設計(情報源・採用基準)

情報源・採用基準は本specの`requirements.md`(人間が読む正の仕様)と、実行時にコードが読み込む機械可読データの二重管理とする。[monthly-review](../monthly-review/requirements.md)の月次見直しPRは、同じ変更を`requirements.md`とこの機械可読データの両方に加える(片方だけの変更はレビューで差し戻す。ai-dev-digestと同じ運用)。

- `content/news-digest/watchlist.json` — requirements.md#情報源(固定リスト)-2の情報源をそのまま構造化したもの
- `content/news-digest/criteria.json` — requirements.md#採用基準・#1週あたりの掲載件数で使う数値・設定

```ts
// app/news-digest/lib/watchlistTypes.ts
export type CategoryId = 'general' | 'business' | 'kanagawa' | 'childcare'

export type WatchlistEntry = {
  id: string // 例: "nhk-news-web", "kanagawa-shimbun"
  category: CategoryId
  name: string // 例: "NHK NEWS WEB"
  channels: Array<
    | { type: 'rss'; feedUrl: string }
    | { type: 'official-page'; url: string } // 公式RSSがない情報源(神奈川県公式サイトのお知らせ等)向け
  >
}

export type Criteria = {
  weeklyTopicCountMax: Record<CategoryId, number> // requirements.md#1週あたりの掲載件数-6(general:3, business:2, kanagawa:1, childcare:1)
  minCorroboratingSources: number // requirements.md#採用基準-4(初期値2)。総合・経済/ビジネスにのみ適用
}
```

`criteria.json`の初期値:
```json
{
  "weeklyTopicCountMax": { "general": 3, "business": 2, "kanagawa": 1, "childcare": 1 },
  "minCorroboratingSources": 2
}
```

`watchlist.json`はrequirements.md#情報源(固定リスト)-2の11件(総合3・経済/ビジネス3・神奈川ローカル2・育児3)をそのまま構造化する。各情報源の実際のRSSフィードURL・公開ページURLは、tasks.mdの実装タスクで運営者と確認しながら確定する(設計時点では未確認のURLを推測で埋めない)。

## 処理フロー

### 情報源から候補を収集する処理(決定的なコード)
- 対象: `watchlist.json`に登録された11件の情報源
- 手順:
  1. 公式RSSフィードを持つ情報源はフィードを取得し、直近1週間以内に公開された記事を候補として抽出する(requirements.md#データ取得方法-1)
  2. 公式RSSがない情報源(神奈川県公式サイトのお知らせ等)は、公開ページを取得し、直近1週間以内の新着項目を候補として抽出する
  3. 取得できなかった情報源(一時的な障害等)は、その情報源だけを候補から除外して処理を続ける(1件の取得失敗で週次実行全体を止めない)
  4. 取得した各候補について、発信者名・見出し(原文タイトル)・元URL・公開日時・カテゴリを記録する
  5. 情報源ごとの収集件数(取得失敗・0件はその旨)を標準エラー出力に記録する(requirements.md#情報源の健全性監視-3)
- 関連するビジネスルール: requirements.md#データ取得方法-1、requirements.md#情報源の健全性監視-3

### 掲載済み記事を除外する処理(決定的なコード)
- 対象: 収集した候補すべて
- 手順:
  1. `content/news-digest/articles/*.json`の全記事の全トピックから元URL(`sourceUrl`)を集めた集合を作る(期間で絞らず全記事を対象にする)
  2. 候補の元URL(`url`)と集合内のURLを、ホスト名の小文字化・クエリ文字列とフラグメントの除去・末尾スラッシュの統一で正規化してから突き合わせ、一致した候補を除外する(requirements.md#掲載済み記事の再掲抑制-8。正規化方針はai-dev-digest/content-selection/design.md「掲載済み記事を除外する処理」と同じ)
- 実行主体: `scripts/news-digest/collect-and-select.ts`
- 関連するビジネスルール: requirements.md#掲載済み記事の再掲抑制-8

### 候補をグループ化し採用基準を判定する処理(エージェントの推論)
- 対象: 掲載済み記事の除外を通過した候補(カテゴリごと)
- 手順:
  1. 総合・経済/ビジネスの候補について、見出し・本文冒頭(取得できる範囲)を読み、同じ出来事を報じている候補同士をグループにまとめる(異なる情報源・異なる見出しでも同一の出来事なら1グループにする)
  2. 各グループについて、含まれる情報源の数(`minCorroboratingSources`=2以上か)を判定する。2以上のグループを「採用基準を満たす候補」とする(requirements.md#採用基準-4)。グループ内で最も詳しく報じている1件(または公開日時が最も新しい1件)を代表候補として残す
  3. 神奈川ローカル・育児の候補について、その週で最も重要と判断される1件を選ぶ(requirements.md#採用基準-5)。判断基準は「運営者(読者)の生活・地域・仕事への影響度」とする([content-generation/requirements.md#重要度](../content-generation/requirements.md)の重要度基準と同じ観点)。選んだ1件が偶然[4]の複数メディア基準も満たす場合は、その旨も記録する(基準未達バッジを付けないため)
  4. 応答は指定のJSON形式(候補ごとに`heading`・`category`・`sourceName`・`sourceUrl`・`sourcePublishedAt`・`meetsCriteria`(2社以上の裏付けがあるか)・`corroboratingSources`(裏付けた情報源名の配列)のみを返す。要約本文はこの時点では書かない(content-generationの領分)
  5. 判定に迷う場合(グループ化が曖昧、情報源の内容が薄い等)は、無理に基準を満たすと判定せず、`meetsCriteria: false`として扱う(過大な採用を避けるための安全側の判断)
- 実行主体: `scripts/news-digest/collect-and-select.ts`からClaude Code CLI(`claude -p`)をヘッドレス起動する。WebFetch/WebSearchで各候補の元記事を確認できる(content-generation/design.md「設計の前提」と同じツール利用方針)
- 関連するビジネスルール: requirements.md#採用基準-4〜5

### 1週分のトピックを選び出す処理(決定的なコード)
- 対象: エージェントが判定した候補一覧
- 手順:
  1. 総合・経済/ビジネスは、`meetsCriteria: true`の候補を公開日時が新しい順に`weeklyTopicCountMax`(総合3・経済/ビジネス2)まで採用する。`meetsCriteria: true`の候補が0件のカテゴリは、その週その カテゴリの掲載なしとする(requirements.md#1週あたりの掲載件数-7。架空の話題を作らない)
  2. 神奈川ローカル・育児は、エージェントが選んだ1件をそのまま採用する。基準未達判定( [4]を満たさない)の場合は`belowCriteria: true`とし、乖離内容(裏付けメディア数が1以下である旨)を`belowCriteriaReason`に設定する(requirements.md#採用基準-5)。その週に候補が1件もない場合のみ、そのカテゴリの掲載なしとする
  3. 全カテゴリが掲載なしになった場合は「候補不足によりスキップ」として扱う(下記「エラーハンドリング」参照)
- 関連するビジネスルール: requirements.md#1週あたりの掲載件数-6〜7

## エラーハンドリング

- 個々の情報源の取得失敗は「その情報源を除外して続行」とし、収集処理全体を失敗させない(処理フロー参照)
- 全カテゴリで掲載候補が0件の週のみ記事生成をスキップする。これは[weekly-publish](../weekly-publish/requirements.md)側の実行が失敗したことにはせず、「その週は正常に0件と判断した」結果として扱う(CI失敗やPR作成失敗とは区別する)
- エージェントのグループ化・判定処理が指定のJSON形式で応答しなかった場合、そのカテゴリの判定を「候補なし」として扱い、他のカテゴリの処理は継続する(1カテゴリの判定失敗で週次実行全体を止めない)

## 関連するファイル(抜粋)

```
content/news-digest/watchlist.json (新規: 情報源の固定リスト)
content/news-digest/criteria.json (新規: 採用基準の数値)
app/news-digest/lib/watchlistTypes.ts (新規: 型定義)
app/news-digest/lib/candidateTypes.ts (新規: Candidate/SelectionResultの型定義)
app/news-digest/lib/selection.ts (新規: 掲載済み記事の除外・件数上限の適用ロジック。純粋関数でテスト可能)
app/news-digest/lib/fetchCandidates.ts (新規: 各情報源のRSS/公開ページへの問い合わせ処理)
scripts/news-digest/collect-and-select.ts (fetchCandidates実行→掲載済み除外→エージェントによるグループ化・判定→件数上限適用までを行い、選定結果JSONを標準出力するCLI。GitHub Actionsのワークフローから呼び出される)
```

`selection.ts`(掲載済み記事の除外・件数上限の適用)は入出力が純粋なデータのみで、通常のvitestで完全にテストできる。エージェントによるグループ化・判定は決定的な単体テストになじまないため、`collect-and-select.ts`のオーケストレーション(エージェント応答のJSONパース・不正応答時のフォールバック)のみをテスト対象とする。

## セキュリティ

- 各情報源のRSS・公開ページ閲覧は認証不要の公開エンドポイントのみを使い、非公式APIや利用規約を超えた高頻度アクセスは行わない(requirements.md#データ取得方法-1)。アクセス頻度は週1回の実行分のみ
- WebFetch/WebSearchによる候補確認はClaude Code CLIの既存サブスクリプション枠内で行い、追加の従量課金APIキーは発行・保存しない(requirements.md#データ取得方法-2)

## ログ

- 標準出力(stdout)は[weekly-publish](../weekly-publish/design.md)がそのままパースする選定結果JSON専用とし、ログ用途には使わない
- 収集・選定の実行結果として、情報源ごとの取得件数・カテゴリごとの採用件数・専用枠の基準未達件数を標準エラー出力(stderr)に記録する(GitHub Actionsのワークフロー実行ログとして残る)
- 上記の情報源ごとの取得件数のうち、0件だった情報源は警告(`WARN`)と分かる形で出力する(requirements.md#情報源の健全性監視-3)
- 候補不足によるスキップが発生した場合はその旨を明確に標準エラー出力(stderr)へ記録する。weekly-publish側は標準出力のJSONの`status`フィールドを見てPRを作成しない判断に使う
