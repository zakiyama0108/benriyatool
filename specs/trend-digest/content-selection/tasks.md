# タスク分解: ジャンル別情報源と採用基準

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: ウォッチリスト・採用基準データの作成(仕様: requirements.md#グループとジャンル、requirements.md#ジャンルごとの情報源・採用基準、requirements.md#情報源の地域区分)
  - `app/trend-digest/lib/watchlistTypes.ts`に型を定義する(TDD対象外。型定義のみのため)。`Edition`/`Genre`は[article-detail](../article-detail/tasks.md)のTask 2で定義される`app/trend-digest/lib/types.ts`からimportして再利用し、本specでは再定義しない(design.md「データ設計(ウォッチリスト・採用基準)」参照)。`SourceRegion`を追加し、`WatchlistEntry.sources`の各要素に`region`を、`Criteria`に`history`を持たせる
  - `content/trend-digest/watchlist.json`にdesign.mdの初期値(全19ジャンル。各情報源に`region`、カルチャー編に`dev-trends`を含む)をそのまま作成する
  - `content/trend-digest/criteria.json`にdesign.mdの初期値(`dev-trends`の`genreCriteria`と`history`の閾値を含む)を作成する
  - 🔴 `watchlist.json`の全ジャンルが`GENRE_ORDER`の19ジャンルと過不足なく一致すること、`criteria.json`の`genreCriteria`が全19ジャンルを網羅すること、固定リストジャンルの全情報源に`region`があることを確認するテストを書く

- Task 2: 候補・選定結果の型定義(仕様: design.md「候補の型(前提)」)
  - 🔴 型自体はTask 3〜4のテストから間接的に検証する
  - 🟢 `app/trend-digest/lib/candidateTypes.ts`に`Candidate`(順位・採用基準の判定結果・地域情報の4項目を含む)・`SelectedTopic`・`SelectionResult`を定義する。`PublishableCandidate`は掲載可否の絞り込みがなくなったため削除する

- Task 3: 掲載する話題の並べ替え(仕様: requirements.md#掲載する話題の選び方-4〜6・-8、design.md「掲載する話題を選ぶ処理」手順4)
  - 🔴 **3階層の優先順位のテストを書く**: 未掲載の話題が掲載済みの話題より先に来ること(継続度・注目度が掲載済みの方が高くても未掲載が優先されること) / 未掲載どうしは継続度ラベルが高い順、同じなら注目度ラベルが高い順、それも同じなら強さが大きい順になること / 掲載済みどうしは注目度ラベルが高い順、同じなら継続度ラベルが高い順、それも同じなら掲載回数が少ない順になること
  - 🔴 **並びが決定的であることのテストを書く**: すべての比較項目が同値の話題どうしは正規化タイトルの昇順で並び、入力の順序を変えても結果が変わらないこと
  - 🔴 ラベルの比較に`DURATION_LABEL_ORDER`・`HEAT_LABEL_ORDER`([trend-history](../trend-history/tasks.md)のTask 1)が使われ、比較順を本specで二重に定義していないことを確認するテストを書く
  - 🟢 `app/trend-digest/lib/selection.ts`に`compareCandidates(a, b)`を実装する。ラベルの判定は[trend-history](../trend-history/tasks.md)のTask 6〜8の結果を受け取るだけで、ここでは再判定しない

- Task 4: 各ジャンル1件の選定と取得できなかったジャンルの扱い(仕様: requirements.md#機能要件-5、requirements.md#掲載件数-1〜3、design.md「掲載する話題を選ぶ処理」)
  - 🔴 ジャンルごとに1件だけが選ばれること、対象editionの全ジャンル分(エンタメ編9件・カルチャー編10件)が結果に並ぶこと、結果が`GENRE_ORDER`順に並ぶことを確認するテストを書く
  - 🔴 **採用基準を満たした候補があるジャンルは候補の中から選ばれること**、**候補が0件で観測項目があるジャンルは観測項目の中から選ばれること**(各ジャンル必ず1件を掲載する回帰テスト。requirements.md#掲載件数-1)、その際も同じ並べ替えが使われることを確認するテストを書く
  - 🔴 観測項目も0件のジャンルが`unavailableGenres`に入り、`topics`には入らないことを確認するテストを書く(requirements.md#掲載件数-3)
  - 🔴 対象editionの全ジャンルで観測項目が0件のときだけ`status: 'skipped'`になること、1ジャンルでも項目があれば`status: 'ok'`になることを確認するテストを書く
  - 🔴 掲載件数に上限が効いていないことを確認するテストを書く: カルチャー編で10件、エンタメ編で9件がそのまま返ること(旧`perEditionMax`による10件打ち切りが残っていないことの回帰テスト)
  - 🔴 同一話題の突き合わせが前後の空白・全角半角・大文字小文字の違いを吸収することを確認するテストを書く(requirements.md#掲載する話題の選び方-8)
  - 🟢 `app/trend-digest/lib/selection.ts`に`selectEditionTopics(genreObservations, judgements, genreOrder): SelectionResult`を実装する。`normalizeTitle`は[trend-history](../trend-history/tasks.md)と共用し、正規化ルールを二重に持たない

- Task 5: 掲載件数の上限値の削除(仕様: requirements.md#掲載件数-2、design.md「データ設計(ウォッチリスト・採用基準)」)
  - `app/trend-digest/lib/watchlistTypes.ts`の`Criteria`から`perGenreMax`・`perEditionMax`を削除し、`content/trend-digest/criteria.json`からも両キーを削除する
  - 🔴 既存の`__tests__/trend-digest/lib/watchlistData.test.ts`が`perGenreMax`・`perEditionMax`が正の整数であることを検証しているため、この検証を削除し、`newEntryLookbackWeeks`と`history`の各値が正の整数であることの検証に置き換える
  - 🔵 旧`narrowGenreCandidates`・`filterPublishableCandidates`・`excludeUnchangedTopics`と、それらに対応する既存テスト(`__tests__/trend-digest/lib/selection.test.ts`の再掲抑制・ジャンル内の絞り込み・配信全体の絞り込みのdescribe)を削除する。掲載可否の絞り込みと再掲抑制は仕様から無くなったため、置き換えではなく撤去する

- Task 6: 固定リストジャンルの候補収集・判定(仕様: requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-1〜9、design.md「固定リストジャンルの候補を収集・判定する処理」)
  - 🔴 情報源のレスポンス(順位付き一覧)をモックし、`rankThreshold`以内の項目が候補になること、`newEntryOrRisingRank`ジャンルは新規ランクイン(過去記事に同名タイトルがない)または順位変動が候補条件になること、`rankThreshold`と`newEntryOrRisingRank`の両方を持つジャンル(books-comics)は両方を満たす項目のみが候補になること(順位内でも新規ランクインでなければ候補にならない、新規ランクインでも順位圏外なら候補にならない)、1つの情報源が失敗しても他の情報源の結果は返ることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/fetchFixedListCandidates.ts`を実装する。情報源の`region`から日本での強度・海外での強度を数える処理は[trend-history](../trend-history/tasks.md)のTask 11で追加する

- Task 7: WebSearchジャンルの候補収集・判定(仕様: requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1〜7、design.md「WebSearchジャンルの候補を収集・判定する処理」)(TDD対象外。Claude Code CLIのヘッドレス起動を伴い、検索・判定自体に検証可能な決定的ロジックがないため)
  - `scripts/trend-digest/collect-websearch-candidates.ts`を実装する。対象ジャンルの`searchHints`をプロンプトに含めてClaude Code CLI(`claude -p ... --output-format json`)をヘッドレス起動し、独立情報源数が`minIndependentSources`以上の話題を候補としたJSON配列を生成する。あわせて、閾値未満の話題も含む観測項目の一覧(上位`maxObservationsPerSource`件まで)を返し、履歴へ引き渡す([trend-history/requirements.md#機能要件](../trend-history/requirements.md)-1〜3)
  - `dev-trends`(開発手法・開発サービス)には、個々のリリース・アップデートのニュースを候補にせず、複数の情報源が開発の進め方・道具立ての変化として論じている潮流だけを候補にする指示をプロンプトに含める(ai-dev-digestとの重複を避けるため)
  - 地域情報を返す指示の追加は[trend-history](../trend-history/tasks.md)のTask 12で行う

- Task 8: 収集+選定のCLI化(仕様: design.md「関連するファイル」)
  - TDD対象外(Task 3〜4・6の薄い呼び出しのみのため)
  - `scripts/trend-digest/collect-and-select.ts`を実装する。edition・実行日を引数に取り、固定リスト・WebSearch双方の観測項目を収集し、観測ログを書き出したうえで(→[trend-history](../trend-history/tasks.md)のTask 3・13)、履歴からの継続度ラベル・注目度ラベル・掲載実績の判定結果を使って各ジャンル1件を選び、選定結果(SelectionResult)をJSONとして標準出力する

- Task 9: 情報源・ジャンルごとの取得件数ログ(仕様: requirements.md#情報源の健全性監視-1〜2、design.md「ログ」)
  - 🔴 収集処理がジャンルごとの観測項目数と候補件数を分けて返し、項目が0件のジャンル・情報源が`WARN`として区別できること、掲載する話題を候補から選んだか観測項目から選んだかがジャンルごとに出ること、選んだ話題の継続度ラベル・注目度ラベル・報告回数が出ること、対象editionの全ジャンルで項目が0件のときその旨が出ることを確認するテストを書く
  - 🟢 `collect-and-select.ts`が情報源・ジャンルごとの観測項目数・候補件数と選定の内訳を集計し、0件のものを`WARN`付きでstderrに出力する
- Task 10: ウォッチリスト・採用基準データの更新(仕様: requirements.md#選定方式、requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)、design.md「データ設計」)
  - `content/trend-digest/watchlist.json`をdesign.mdの新しい初期値(音楽=Billboard JAPANのみ、日本/海外映画=興行通信社+映画.com+Filmarks、日本ドラマ/バラエティ=ビデオリサーチ、書籍漫画=トーハン+日販、流行りの言葉=Google公式トレンドRSS、ゲーム=Steam公式API+ファミ通、旅行観光=じゃらんnet、ファッション/ガジェット家電=WebSearchへ変更)に更新する
  - `content/trend-digest/criteria.json`の`genreCriteria`をdesign.mdの新しい初期値(japanese-drama/varietyがrankThreshold方式に変更、fashion/gadgetsがwebsearchに変更、WebSearchジャンルの`minIndependentSources`を3に引き上げ)に更新する

- Task 11: 情報源取得の共通処理の修正(仕様: requirements.md#データ取得方法-2、design.md「固定リストジャンルの候補を収集・判定する処理」)
  - 🔴 Content-Type/metaでShift-JIS等を指定したレスポンスが正しくデコードされること、User-Agent未設定時に403を返すテストダブルに対して一般的なブラウザUser-Agentが付与されることを確認するテストを書く
  - 🟢 `scripts/trend-digest/fetchSourcePage.ts`にUser-Agent付与・文字コード判定(Content-Type/metaのcharsetを読み取ってデコード)を実装する

- Task 12: サイトごとの専用パーサー(仕様: design.md「サイトごとの専用パーサー」)
  - 🔴 実際に取得したHTMLを`__tests__/trend-digest/fixtures/sourceParsers/`に保存し、各パーサーがタイトル・順位(・前週順位/NEW表記があれば)を正しく抽出することを確認するテストを、9サイト(billboardJapan/kogyoTsushin/eigaCom/filmarks/videoResearch/tohan/nippan/famitsu/jalan)それぞれで書く。トーハン・日販は順位がCSSクラス名(`rank-Nth`)で表現される点を必ずテストに含める
  - 🟢 `scripts/trend-digest/sourceParsers/`配下に9パーサーを実装する

- Task 13: 構造化データ情報源の取得・パース(仕様: design.md「データ設計」`FixedListSourceFormat`)
  - 🔴 Netflix TSV(タブ区切り、Japan行の抽出)・Google公式トレンドRSS(XML、item要素の抽出)・Steam公式Web API(JSON、ranksの抽出)それぞれのサンプルレスポンスを入力に、順位付き一覧へ正しく変換されることを確認するテストを書く
  - 🟢 `scripts/trend-digest/fetchStructuredSource.ts`に`structured-tsv`/`structured-rss`/`structured-json-api`の取得・パース処理を実装する

- Task 14: 固定リストジャンル収集処理のformat別ディスパッチへの更新(仕様: design.md「固定リストジャンルの候補を収集・判定する処理」)
  - 🔴 情報源の`format`に応じて`fetchStructuredSource`または`sourceParsers/<parserId>`が呼び分けられること、books-comicsのように複数情報源(トーハン・日販)の結果が正しく合算され、同一作品はより高い順位の`strength`が採用されることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/fetchFixedListCandidates.ts`を新しいwatchlist構造(`format`/`parserId`)に合わせて更新する

- Task 15: WebSearchジャンルの独立言及基準の更新(仕様: requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)、design.md「WebSearchジャンルの候補を収集・判定する処理」)(TDD対象外。Task 6と同じ理由)
  - `scripts/trend-digest/collect-websearch-candidates.ts`のプロンプトを更新する。独立した言及元にSNS投稿・口コミ増加を含めること、単一メディアの特集記事のみでは採用しないこと、`minIndependentSources`(3件)未満は候補にしないこと、言及元の内訳を`note`に含めて返すことを反映する

- Task 16: アニメを併用ジャンル(固定リスト+WebSearch)に変更(仕様: requirements.md#選定方式-7、requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-9、requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-11、design.md「併用ジャンル(アニメ)の候補を収集・判定する処理」)
  - `app/trend-digest/lib/watchlistTypes.ts`の`SelectionMethod`に`'hybrid'`を追加し、`HybridGenreCriteria`(`fixedList`・`webSearch`をそれぞれ持つ)を`GenreCriteria`に追加する(TDD対象外。型定義のみのため)
  - `content/trend-digest/watchlist.json`のanimeエントリを`method: 'hybrid'`に変更し、`sources`をFilmarksアニメ話題ランキング(`filmarksAnimeTrend`)・AniLab日本ウィークリーアニメランキング(`anilabJapanWeekly`)の2件に、`searchHints`をdesign.mdの初期値に更新する。`content/trend-digest/criteria.json`のanimeエントリをdesign.mdの`hybrid`形式に更新する
  - 🔴 実際に取得したHTMLを`__tests__/trend-digest/fixtures/sourceParsers/`に保存し、`filmarksAnimeTrend`・`anilabJapanWeekly`がタイトル・順位(AniLabは前週比の順位変動の表記も)を正しく抽出することを確認するテストを書く
  - 🟢 `scripts/trend-digest/sourceParsers/filmarksAnimeTrend.ts`・`anilabJapanWeekly.ts`を実装し、`scripts/trend-digest/fetchSourcePage.ts`の`HTML_PARSERS`に登録する。あわせて、animeを`NETFLIX_CATEGORY_BY_GENRE`から外す(Netflixデータをアニメの情報源として使わなくなったため、対応付けの欠落による例外は発生しなくなる)
  - 🔴 `scripts/trend-digest/collect-and-select.ts`の`collectGenreObservations`が、`method: 'hybrid'`のジャンルで固定リスト側(`genreCriteria.fixedList`)・WebSearch側(`genreCriteria.webSearch`)の両方を呼び出し、観測項目を1つの配列に結合すること、いずれか一方の観測が0件でも他方の観測は結果に残ること、結合後の各観測項目の`method`が収集元(`fixed-list`/`websearch`)を正しく反映することを確認するテストを書く
  - 🟢 `collectGenreObservations`に`hybrid`分岐を実装する
  - 🔴 `scripts/trend-digest/collect-websearch-candidates.ts`の`collectWebSearchGenre`が、`method: 'hybrid'`のジャンルで`genreCriteria.webSearch`を使って収集できること(`method !== 'websearch'`の例外を`hybrid`では投げないこと)を確認するテストを書く
  - 🟢 `collectWebSearchGenre`の分岐を更新する

- Task 17(月次見直し・2026-10): 地域枠(グルメ)の追加、ファッション・ガジェット家電のWebSearch化、流行りの言葉の情報源修正(仕様: requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-12、requirements.md#情報源(固定リスト)、design.md「掲載する話題を選ぶ処理」)
  - 対応1: `WebSearchGenreCriteria`に`focusAreas?: string[]`、`Candidate`に`area?: string`を追加。グルメの`criteria.json`に`focusAreas: ["小田原", "茅ヶ崎", "横浜"]`を設定し、WebSearch応答から`area`を取り込む(`collectWebSearchCandidates.ts`)
  - 対応2(設計の見直し): 地域枠は当初「ジャンル内の絞り込み(1ジャンル最大2件)で最下位の枠を対象エリアの話題に差し替える」案で検討されていたが、同時期に[trend-history](../trend-history/requirements.md)の導入で「各ジャンル1件」の選定方式(`selectEditionTopics`)に変わっていたため、2件前提の設計をそのまま使えなくなっていた。`selectEditionTopics`に`criteria`引数を追加し、候補プールに対象エリアの話題が1件以上あればそのジャンルの最終選定対象を対象エリアの話題のみに絞る方式に設計し直した(design.md「掲載する話題を選ぶ処理」手順4参照)
    - 🔴 対象エリアの話題が候補にあれば強さ(strength)に関わらずそちらが選ばれること、対象エリアの話題が複数あれば通常の並べ替えで最上位が選ばれること、対象エリアの候補が0件なら通常どおりプール全体から選ばれること、対象外の地域名は地域枠として扱われないこと、focusAreas未指定のジャンルでは地域による優先が働かないことを確認するテストを`__tests__/trend-digest/lib/selection.test.ts`に書く
    - 🟢 `selectEditionTopics`に`resolveFocusAreas`を実装し、`scripts/trend-digest/collect-and-select.ts`の呼び出しに`criteria`を渡す
  - 対応3: ファッション・ガジェット家電は、固定リストで試したWWD JAPAN・Engadget・ZOZO・価格.comの汎用HTMLパースが実績として順位表を抽出できていなかったため、WebSearchジャンル(`minIndependentSources: 2`)に変更。グルメ・流行りの趣味も候補0件が続いていた実績を踏まえ`minIndependentSources`を2に調整(`watchlist.json`・`criteria.json`・`__tests__/trend-digest/lib/watchlistData.test.ts`を更新)
  - 対応4: 流行りの言葉は、JS描画で順位表を抽出できなかった`trends.google.co.jp/trending`から、RSSの`<item><title>`を順位化する`structured-rss`形式(`trends.google.com/trending/rss?geo=JP`)に変更

- Task 18(情報源複数化・2026-10): music・travelへの補助情報源追加、sns-buzz・gourmet・gadgets・economy-money・dev-trendsの併用ジャンル化(仕様: requirements.md#選定方式-8、requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-1・8・10〜14、design.md「併用ジャンルの候補を収集・判定する処理」)
  - 候補URLはすべて`curl -A "Mozilla/5.0"`で実際に取得し、構造化されたランキング・一覧が実在することを確認したうえで採用した(WebFetchのみに頼らない)。FlixPatrol(海外ドラマ・サブスク動画)・ZOZOTOWN・楽天市場(ファッション)はいずれもbot対策で403となり採用を見送った(design.md「補足(2026-10次の情報源複数化見直しで検証し見送った候補)」参照)
  - `app/trend-digest/lib/watchlistTypes.ts`の`FixedListSourceFormat`に`'structured-atom'`を追加する(Qiita人気記事フィードがAtom形式のため。TDD対象外。型定義のみ)
  - `scripts/trend-digest/fetchStructuredSource.ts`の`parseGoogleTrendsRss`を`parseRssTitlesInOrder`に改称し、`<title><![CDATA[...]]></title>`形式(Zenn公式トレンドRSS)にも対応させる。Atom形式(`<entry><title>`)用に`parseAtomTitlesInOrder`を新規追加する
    - 🔴 CDATAありのRSS(Zenn)・CDATAなしのRSS(Google)がいずれもタイトル・掲載順どおりの順位で抽出できること、Atomの`<entry>`からも同様に抽出できることを確認するテストを書く
    - 🟢 上記2関数を実装する
  - `scripts/trend-digest/sourceParsers/`に9パーサーを新規追加する: `kworbSpotifyJapan.ts`(音楽)・`rakutenTravelSales.ts`(旅行・観光)・`yahooRealtimeSearch.ts`(SNSバズり。CSSクラス名がビルドごとに変わるNext.jsアプリのため`__NEXT_DATA__`のJSONから抽出)・`tabelogRank.ts`(グルメ)・`kakakuRanking.ts`(ガジェット・家電)・`yahooFinanceVolumeIncrease.ts`・`nikkeiAccessRanking.ts`(経済・お金)・`githubTrending.ts`・`hatenaBookmarkIt.ts`(開発手法・開発サービス)
    - 🔴 実際に取得したHTMLを`__tests__/trend-digest/fixtures/sourceParsers/`に保存し、各パーサーがタイトル・順位を正しく抽出することを確認するテストを書く。価格.com・食べログは順位表示部に入れ子の`<table>`/`<li>`があり単純な非貪欲マッチでは手前で途切れるため、20件すべてが欠落なく抽出されることを明示的に確認する
    - 🟢 9パーサーを実装し、`scripts/trend-digest/fetchSourcePage.ts`の`HTML_PARSERS`に登録する
  - `content/trend-digest/watchlist.json`を更新する: music・travelに2件目の情報源(kworb.net・楽天トラベル)を追加。sns-buzz・gourmet・gadgets・economy-money・dev-trendsの`method`を`websearch`から`hybrid`に変更し、固定リスト側の`sources`を追加する(既存の`searchHints`は変更しない)
  - `content/trend-digest/criteria.json`を更新する: 上記5ジャンルの`genreCriteria`を`websearch`形式から`hybrid`形式(`fixedList: { rankThreshold: 10 }` + 既存の`webSearch`設定をそのまま移す)に変更する
    - 🔴 `__tests__/trend-digest/lib/watchlistData.test.ts`を更新する。`WEBSEARCH_GENRES`を`['hobby', 'fashion']`に、`HYBRID_GENRES`を`['anime', 'sns-buzz', 'gourmet', 'gadgets', 'economy-money', 'dev-trends']`に変更し、sns-buzz・gourmetが固定の情報源を持つこと、fashionは持たずgadgetsは持つことを確認するテストに更新する
  - `scripts/trend-digest/collect-and-select.ts`の`collectGenreObservations`・`scripts/trend-digest/collect-websearch-candidates.ts`の`collectWebSearchGenre`は、`method: 'hybrid'`をジャンル名に関わらず汎用的に処理する実装(Task 16でアニメ用に実装済み)のため変更不要。既存の`__tests__/trend-digest/scripts/collect-and-select.test.ts`のテストケースをアニメ以外のジャンルでも成立することの確認に使う
