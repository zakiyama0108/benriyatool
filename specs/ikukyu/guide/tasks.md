# タスク分解: ガイド記事(育休給付金の解説記事3本)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

**実装着手前の確認(全タスク共通の前提)**:
- `node_modules/next/dist/docs/` の該当ガイド(App Routerのページ追加・Metadata API・静的エクスポート)を読む(AGENTS.md: このNext.jsは学習データと差分がある)
- `site-name-structured-data` specのWebSite構造化データ実装(作業ブランチ `feature/website-jsonld`)の完了状況を確認し、マージ済みならそのJSON-LD出力パターン(エスケープ処理を含む)に合わせる。未マージなら着手順をユーザーに相談する
- 数値はすべて `app/ikukyu/lib/calculator.ts` の公開関数から導出する。calculator.ts・dateUtils.ts には一切手を入れない

## Task 1: 月額給付額ヘルパー(`app/ikukyu/guide/lib/monthlyBenefit.ts`)

月給から「67%月額・50%月額・上乗せ後80%月額・上限適用フラグ」を返す関数を作る。

- 1日あたり給付額の導出は公開関数経由で行う(例: `calcPaternityBenefit`(28日固定)の総額÷28で67%と13%の日額、`calcMamaChildcare50` を1日分の期間で呼んで50%の日額)。月額は日額×30
- 🔴 テスト(`__tests__/ikukyu/guide/lib/monthlyBenefit.test.ts`): 代表月給(20万/30万/50万)で「賃金日額(月給÷30、上限適用)×率×30」と一致すること、上限適用フラグが正しいこと、80%月額=67%月額+13%月額であること、月給が0以下・導出結果が負値や欠落の場合に例外を投げること(design.mdのビルド失敗ガード)
- 🟢 実装 → 🔵 導出ロジックの整理

## Task 2: 上限ライン探索と手取り概算(`monthlyBenefit.ts` に追加)

- 上限適用となる最小月給を二分探索で特定する関数と、その結果から賃金日額上限を逆算する関数
- 就労時手取り概算(額面×80%)の定数と関数(概算率は1か所で定義)
- 🔴 テスト: 「探索結果の月給では上限適用、その1円下では未適用」という境界性質のテスト+現行定数での具体値(483,330円/日額16,110円。定数改定時にこのitだけ更新する旨をコメント)
- 🟢 実装 → 🔵 整理

## Task 3: 記事3の月次世帯シミュレーション(`app/ikukyu/guide/lib/householdSimulation.ts`)

世帯モデル(夫35万・妻28万、出産予定日固定)とパターンA/B/Cから月次の世帯収入推移を組み立てる。

- 給付の暦月日割り配分、就労月の手取り概算計上、混在月の按分、`null`給付の除外
- パターンAではママの上乗せ額(bonusAmount)を集計に含めない
- 上乗せ額は上乗せ対象期間に日割りで配分する(design.md手順4)
- 🔴 テスト(`householdSimulation.test.ts`): design.mdの手順に沿って「パターンAに上乗せが含まれないこと」「B・Cで夫婦双方に上乗せが計上されること(Bはパパ28日分・Cはパパ14日分)」「月次合計が各給付の日割り+就労手取りの合算と一致すること」「累計差額が算出できること」「給付の欠落・負値を検出した場合に例外を投げること(ビルド失敗ガード)」
- 🟢 実装 → 🔵 整理

## Task 4: 記事共通コンポーネント(`app/ikukyu/guide/components/`)

design.mdのコンポーネント設計の7つ(StatTiles / ArticleTable / CalloutCard / SimulatorCta / FaqSection / SourcesFooter / ArticleJsonLd)と、テーマカラー定義(`lib/theme.ts`: mint/sky/pink → Tailwindクラス)。

- 🔴 テスト(`__tests__/ikukyu/guide/components/`): 表が行・列・上限バッジを正しく描画すること、FaqSectionのQ&AがFAQPage JSON-LDと同一データ源であること、ArticleJsonLdが `<` エスケープ済みのJSON-LDを出力すること
- 🟢 実装(デザインは承認済みモックアップ「案B ポップカードUI」準拠) → 🔵 整理

## Task 5: 記事1ページ(`app/ikukyu/guide/tedori-10wari/page.tsx`)

- 5ケース表(67%月額/80%月額/手取り概算との差額)・上限ラインの注意カード・FAQ・参考資料・CTA・Metadata・JSON-LD(Article+FAQPage)。テーマ=ミント
- 🔴 テスト: 表の金額セルがTask1/2のヘルパー出力と一致すること、metadataとJSON-LDが設定されていること
- 🟢 実装 → 🔵 整理
- 完了時: 使用した計算関数と入力値を添えてユーザーに数値の算出根拠を報告する(記事2・3も同様)

## Task 6: 記事2ページ(`app/ikukyu/guide/hayamihyo/page.tsx`)

- 9段階早見表(67%/50%/80%月額)・月給帯アンカー付き目次・帯別セクション・手取り感覚の補足・FAQ・CTA(冒頭と末尾)。テーマ=スカイ
- 🔴 テスト: 全9行の金額がヘルパー出力と一致すること、目次アンカーと帯別セクションのidが対応すること
- 🟢 実装 → 🔵 整理

## Task 7: 記事3ページ(`app/ikukyu/guide/fufu-ikukyu/page.tsx`)

- 世帯モデルと前提の明記・パターンA/B/C月次推移表・差額まとめ・FAQ・CTA。テーマ=ピンク
- 🔴 テスト: 表の金額がTask3の出力と一致すること、前提(ボーナス除外・振込は後払い等)の記載があること
- 🟢 実装 → 🔵 整理

## Task 8: 記事一覧ページ(`app/ikukyu/guide/page.tsx`)

- タイトル+説明・記事カード3枚(タイトル・要約・テーマカラー)・シミュレーターCTA・Metadata。構造化データなし(design.md画面設計参照)
- 🔴 テスト: 3記事へのリンクが存在すること、各カードにテーマカラーが適用されること
- 🟢 実装 → 🔵 整理

## Task 9: サイト組み込みと公開前確認

- 記事間の相互リンク(関連記事)を3記事に設置し、パンくずの「ガイド」を一覧ページへリンク
- `public/sitemap.xml` に4URL(記事3本+一覧)を追記
- `npm run lint` / `npm test` / `npm run build`(静的エクスポート)が通ることを確認
- /run-benriyatool で3記事+一覧ページのスクリーンショットを撮り、モックアップとの見た目の乖離・モバイル表示を確認する

## Task 10: トップページ・シミュレーター画面への導線追加(2026-08-03)

サイトマップには登録済みだが、トップページ・シミュレーター画面のどちらからもリンクされておらず、検索流入以外で発見できなかったため追加する。

- [x] 🔴 Red: `__tests__/page.test.tsx`にトップページから`/ikukyu/guide`へのリンクが存在することを検証するテストを書く(仕様コメント: `specs/hub-site/requirements.md#機能要件-3`)
- [x] 🟢 Green: `app/page.tsx`のツールカード一覧の下にテキストリンクを追加する
- [x] `app/ikukyu/page.tsx`のヘッダー直下にも同様のテキストリンクを追加する(この画面は`saveResult.ts`経由で`app/lib/supabaseClient.ts`を読み込むため、vitest実行時に環境変数エラーで直接レンダリングするユニットテストが書けない。`vitest.config.mts`が`page.tsx`をカバレッジ対象外としている既存方針に合わせ、`npm run build`と実機確認(/run-benriyatool)でリンクの表示・遷移を確認する)
- [x] `specs/hub-site/requirements.md`にもトップページ側の導線をビジネスルールとして追記する
