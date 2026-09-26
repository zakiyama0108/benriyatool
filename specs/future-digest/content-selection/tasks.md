# タスク分解: ジャンル・時間軸別の未来予測記事の選定

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: ジャンル設定ファイルの読み込み(仕様: requirements.md#機能要件-1、requirements.md#ジャンル-1〜10、design.md「データ設計」)
  - 🔴 `genres.json`の記載順でジャンルが返ること、`active: false`のジャンルが収集対象から外れラベルは引けること、`id`の重複・`label`が空・`themes`が文字列配列でない・`lineExcluded`が真偽値でない場合に例外になること、`lineExcluded: true`のジャンルが1つ以上存在すること(LB1対応)を確認するテストを書く
  - 🟢 `content/future-digest/genres.json`(requirements.md#ジャンルの10ジャンル。個人的注目分野に`themes: ["AR・VR", "若返り"]`)と`app/future-digest/lib/genres.ts`を実装する

- Task 2: 次の回数の決定(仕様: requirements.md#時間軸の切り替え-1〜2、design.md「その回の時間軸2区分を決める処理」)
  - 🔴 記事0件で1、`issueNumber`が1・2の記事があれば3、`issueNumber`が飛んでいても最大値+1になることを確認するテストを書く
  - 🟢 `app/future-digest/lib/issue.ts`に`nextIssueNumber(articles)`を実装する(時間軸2区分は[article-detail/tasks.md](../article-detail/tasks.md)のTask 2の`horizonsForIssue`を使う)

- Task 3: 配信済みURLの正規化と配信済みの一覧(仕様: requirements.md#配信済みの記事・予測の除外-1〜2、design.md「配信済みの一覧を作る処理」)
  - 🔴 `normalizeUrl`がスキーム・ホスト名の大文字小文字、末尾スラッシュ、`#`以降、`utm_`クエリの違いを同一視し、それ以外のクエリは残すことを確認するテストを書く。`buildDeliveredIndex(articles)`が全予測の正規化URLの集合と、ジャンル・時間軸・見出し・元記事タイトルの一覧を返すことを確認するテストを書く
  - 🟢 `app/future-digest/lib/deliveredIndex.ts`に実装する

- Task 4: Claudeが返した候補の検証(仕様: design.md「バリデーション」)
  - 🔴 今回の時間軸以外・定義外の影響度・順位が0以下・必須項目が空・`http(s)`以外のURL・長さ上限超え・制御文字を含む候補が捨てられ、捨てた理由が返ることを確認するテストを書く
  - 🟢 `app/future-digest/lib/candidateValidation.ts`に`validateCandidates(raw, horizons)`を実装する

- Task 5: 枠ごとの採用・候補なしの記録・収集失敗ジャンルの合流(仕様: requirements.md#機能要件-3〜5、requirements.md#影響度-3、requirements.md#候補が見つからない枠-1、requirements.md#収集失敗-1、design.md「枠ごとに1本を採用する処理」)
  - 🔴 `selectSlots(candidates, genres, horizons, deliveredUrls, collectionFailedGenres)`について次を確認するテストを書く: 影響度の大きい候補が採用される/同じ影響度では順位の小さい候補が採用される/配信済みURLの候補は除かれる/同じ回の別の枠で採用済みのURLは除かれる/候補が残らない枠は`no-candidate`になる/`collectionFailedGenres`に含まれるジャンルは候補の有無に関わらず両時間軸が分類ラベルつきの`collection-failed`になる/有効な全ジャンル×2時間軸の枠(候補あり・候補なし・収集失敗を合わせて)が過不足なく結果に含まれ、ジャンル順・時間軸の近い順に並ぶ/各枠の候補件数が返る(収集失敗の枠は候補件数を持たない)
  - 🟢 `app/future-digest/lib/selectSlots.ts`に実装する

- Task 6: ジャンルごとの収集CLI(仕様: design.md「ジャンルごとに候補を集める処理」「エラーハンドリング」)
  - 🔴 Claude CLIの呼び出しを差し替え可能にし、`collectForGenre`について次を確認するテストを書く: 応答JSONから候補が取り出される/JSONを取り出せない場合は1回だけやり直す/2回とも失敗したら分類ラベル(`invalid-format`)つきの収集失敗を示す結果として返り例外にしない(候補0件の`no-candidate`とは区別する)/呼び出しが設定したタイムアウト値を超えたら1回だけやり直し、2回とも超えたら`timeout`の分類ラベルで返る/その他の異常終了は2回とも失敗したら`other`の分類ラベルで返る/利用上限への到達を示す応答では、やり直さずに打ち切りを示す例外を投げる(収集失敗にはしない)/応答の形(時間軸ごとの候補配列)自体が読めない・満たさない場合は`invalid-format`の収集失敗として扱う(候補単位のバリデーションで個々の候補が捨てられ0件になった場合は`no-candidate`のまま返す。境界ケースのテストを含める)【推測】
  - 🟢 `scripts/future-digest/collect-candidates.ts`を実装する。`requirements.md`を実行時に読み込み、その内容(採用基準・影響度・配信済みの記事・予測の除外)をプロンプトに含める(別ファイルへの複製・転記はしない)。あわせてジャンルの説明(注目テーマ)、時間軸の定義、配信済みの一覧、応答JSONの形、性・恋愛ジャンルの収集時の制約もプロンプトに含める。許可ツールはWebSearch・WebFetchに限る

- Task 7: 収集・選定のまとめCLI(仕様: design.md「収集状況を記録する処理」「ログ」)(TDD対象外。Task 1〜6の関数を順に呼ぶだけで、ジャンルの合流・採用ロジックはTask 5・6でテスト済みのため)
  - `scripts/future-digest/collect-and-select.ts`を実装する。回数・時間軸の決定→配信済みの一覧→ジャンルごとの収集(収集に失敗したジャンルの一覧を`collectionFailedGenres`として保持)→検証→`selectSlots`による枠ごとの採用・候補なしの記録・収集失敗ジャンルの合流を行い、選定結果(回数・採用した候補・候補なしの枠・収集失敗の枠)を標準出力にJSONで出す。枠ごとの候補件数・候補なしの枠の一覧・収集失敗の枠の一覧(分類ラベル別)を標準エラー出力に出す
