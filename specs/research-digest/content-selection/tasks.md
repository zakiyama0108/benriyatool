# タスク分解: ジャンル別の研究発見・論文の選定

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: ジャンル設定ファイルの読み込み(仕様: requirements.md#機能要件-1、requirements.md#ジャンル-1〜10、design.md「データ設計」)
  - 🔴 `genres.json`の記載順でジャンルが返ること、`active: false`のジャンルが収集対象から外れラベルは引けること、`id`の重複・`label`が空の場合に例外になることを確認するテストを書く
  - 🟢 `content/research-digest/genres.json`(requirements.md#ジャンルの10ジャンル)と`app/research-digest/lib/genres.ts`を実装する

- Task 2: 配信済みURL・DOIの正規化と配信済みの一覧(仕様: requirements.md#配信済みの研究の除外-1、design.md「配信済みの一覧を作る処理」)
  - 🔴 `normalizeUrl`がスキーム・ホスト名の大文字小文字、末尾スラッシュ、`#`以降、`utm_`クエリの違いを同一視すること、`normalizeDoi`が大文字小文字・`https://doi.org/`・`doi:`の違いを同一視することを確認するテストを書く。`buildDeliveredIndex(articles)`が正規化URLの集合・DOIの集合・ジャンル/見出し/論文名の一覧を返すことを確認するテストを書く
  - 🟢 `app/research-digest/lib/deliveredIndex.ts`に実装する

- Task 3: Claudeが返した候補の検証(仕様: design.md「バリデーション」)
  - 🔴 定義外の影響度・順位が0以下・必須項目が空・`http(s)`以外のURL・`10.`で始まらないDOI・未来の発表年・真偽値でない`isPreprint`・長さ上限超え・制御文字を含む候補が捨てられ、理由が返ることを確認するテストを書く。`https://doi.org/`付きのDOIは正規化されて受け付けられることも確認する
  - 🟢 `app/research-digest/lib/candidateValidation.ts`に`validateCandidates(raw, today)`を実装する

- Task 4: ジャンルごとの採用と候補なしの記録(仕様: requirements.md#機能要件-2〜4、requirements.md#影響度-3、requirements.md#候補が見つからないジャンル-1、design.md「ジャンルごとに1本を採用する処理」)
  - 🔴 `selectGenres(candidatesByGenre, genres, delivered)`について次を確認するテストを書く: 影響度の大きい候補が採用される/同じ影響度では順位の小さい候補が採用される/配信済みのURLまたはDOIの候補は除かれる/同じ回の別のジャンルで採用済みのURL・DOIは除かれる/候補が残らないジャンルは`no-candidate`になる/有効な全ジャンルがジャンル順で結果に含まれる/各ジャンルの候補件数が返る
  - 🟢 `app/research-digest/lib/selectGenres.ts`に実装する

- Task 5: ジャンルごとの収集CLI(仕様: design.md「ジャンルごとに候補を集める処理」「エラーハンドリング」)
  - 🔴 Claude CLIの呼び出しを差し替え可能にし、`collectForGenre`について次を確認するテストを書く: 応答JSONから候補が取り出される/JSONを取り出せない場合は1回だけやり直す/2回とも失敗したら候補0件として返り例外にしない/利用上限への到達でやり直さずに打ち切りの例外を投げる
  - 🟢 `scripts/research-digest/collect-candidates.ts`を実装する。`requirements.md`を実行時に読み込み、その内容(採用基準・影響度・配信済みの研究の除外)をプロンプトに含める(別ファイルへの複製・転記はしない)。あわせてジャンルの説明、配信済みの一覧、応答JSONの形もプロンプトに含める。許可ツールはWebSearch・WebFetchに限る

- Task 6: 収集・選定のまとめCLI(仕様: design.md「収集状況を記録する処理」「ログ」)(TDD対象外。Task 1〜5の関数を順に呼ぶだけのため)
  - `scripts/research-digest/collect-and-select.ts`を実装する。配信済みの一覧→ジャンルごとの収集→検証→採用を行い、選定結果(採用した候補・候補なしのジャンル)を標準出力にJSONで出す。ジャンルごとの候補件数・候補なしのジャンルの一覧を標準エラー出力に出す
