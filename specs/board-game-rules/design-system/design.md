# 設計: board-game-rules デザインシステム

## サマリ
board-game-rules(ボドゲのトリセツ)の見た目の系統を揃える基盤整備。**Step0(UIデザイン確定)の要否宣言: 不要**(新しい見た目・レイアウトを作らず、確定済みAnalog Hearthの既存部品を写すカタログを作るだけのため)。処理はランタイムのビジネスロジックではなく、(1)`specs/board-game-rules/DESIGN.md`をトークン+chromeルールの一元管理先として作る、(2)`app/board-game-rules/styleguide/page.tsx`に共通部品カタログを作る、(3)`styleguide.png`をキャプチャする、(4)DESIGN.mdをStitchに反映して運用を検証する、の4つの**オーサリング/ビルド手順**として書く(下記「処理フロー」参照)。主要な設計判断は、トークン値の一次情報を`app/globals.css`(色・フォント)と`game-registration/design.md`(角丸・階層表現)から転記して集約すること、session依存の共通部品(`FavoriteButton`/`LoginStatus`)は状態ごとに実物とレプリカを使い分けて見せること(後述「styleguideページを作る手順」)、既存`LoginStatus.tsx`がAnalog Hearthトークンを使っていない不整合を今回は変更せずDESIGN.mdに記録するにとどめること(後述「既知の不整合」)。既存register/favoritesの見た目・構造は変更しない。画面遷移図は単一ページのため省略する(後述「画面設計」参照)。

## 処理フロー

### DESIGN.mdをトークン+chromeルールの真実の源として作る手順
- 対象: `specs/board-game-rules/DESIGN.md`(新規)
- 手順:
  1. `specs/board-game-rules/DESIGN.md`を新規作成する。
  2. 「デザイントークン(Analog Hearth)」節に、配色8色(背景`bgr-bg`/カード`bgr-card`/縁線`bgr-line`/見出し`bgr-heading`/サブテキスト`bgr-subtext`/アクセント1`bgr-primary`・押下`bgr-primary-active`/アクセント2`bgr-accent`)を`app/globals.css`の`@theme`(`--color-bgr-*`)の現行16進値をそのまま転記する。フォントは`--font-heading`/`--font-body`が参照する`next/font/google`変数名とフォールバック順をそのまま転記する。角丸(標準UI 8px/大コンテナ16px/チップ4px)はコードのCSS変数ではなくTailwindユーティリティクラス(`rounded-lg`等)として各画面に散っているため、一次情報を[game-registration/design.md#デザイントークンanalog-hearth](../game-registration/design.md#デザイントークンanalog-hearth)から転記する(globals.cssにトークン変数がないことをDESIGN.mdに明記し、今後CSS変数化するかは別途判断とする)。
  3. 「影を使わず、トーン差+1px罫線(`bgr-line`)で階層を表現する」方針を明記する。あわせて[game-registration/design.md#デザイントークンanalog-hearth](../game-registration/design.md#デザイントークンanalog-hearth)が定める唯一の例外(アップロード写真サムネイルのポラロイド風表現にのみ軽い影を使う)もそのまま転記し、方針とコードの実態が食い違わないようにする。
  4. 「共通chromeルール」節に、(a)サイドバー共通ナビ(`BoardGameNav`)がchromeの中心であること、(b)コード側`app/board-game-rules/components/BoardGameNav.tsx`が真実の源であり、Stitchで新しい画面を生成するたびにchromeを描き直させないこと、(c)トークンの実体は`app/globals.css`であり、DESIGN.mdは実体を転記した参照用ドキュメントであること、を明記する。
  5. 「真実の源の優先順位」節に、DESIGN.mdとコード(`app/globals.css`)の値が食い違った場合はコードの実装値を正とし、DESIGN.mdを実装に合わせて直す運用を明記する(requirements.md#真実の源の優先順位-6)。
  6. 「既知の不整合」節に、`LoginStatus.tsx`がAnalog Hearthトークン(`bgr-*`)ではなくTailwindの`gray-*`/`emerald-*`を直書きしていることを記録する。**今回はスコープ外として変更しない**(既存register画面の見た目・構造を変えないという合意スコープを優先する。対応要否・時期は別specで判断する。承認済み: 2026-08-16に別途対応で合意)。
  7. `game-registration/design.md`「デザイントークン(Analog Hearth)」節の値の表・箇条書きを削除し、「トークンの定義は[DESIGN.md](../DESIGN.md)を参照する」という一文に置き換える(見出し自体・Stitchプロジェクトへの参照・ナビゲーション節などトークン値以外の記述は残す)。
  8. `favorite/design.md`「お気に入り一覧画面」節は元々トークン値の表を持たない(Stitchプロジェクト名・デザインシステム名「Analog Hearth」への言及のみ)ため、値の削除は発生しない。代わりに、同節の冒頭に「トークンの定義は[DESIGN.md](../DESIGN.md)を参照する」の一文を追加し、参照先を明示する(追加位置は「確定デザインの出所」段落の直後)。
- 関連するビジネスルール: requirements.md#DESIGN.mdトークンchromeルールの一元管理-1、requirements.md#DESIGN.mdトークンchromeルールの一元管理-2、requirements.md#DESIGN.mdトークンchromeルールの一元管理-3、requirements.md#デザインシステムの土台analog-hearth-1、requirements.md#デザインシステムの土台analog-hearth-2、requirements.md#共通chromeとトークンの分離pr-207のルール-3、requirements.md#真実の源の優先順位-6

### styleguideページを作る手順
- 対象: `app/board-game-rules/styleguide/page.tsx`(新規)
- 注意(フォルダ名): アンダースコアを付けない(`_styleguide`にしない)。Next.js 16では`_`始まりのフォルダはprivate folderとしてルーティングから除外され、`npm run dev`でも`/board-game-rules/_styleguide`が404になり、下記「styleguide.pngをキャプチャする手順」の生きたURLに遷移できないため(このアプリのstyleguideは非機微なトークン・空状態部品のみを載せるため、公開ルートになっても実害はない。PR #207の`_styleguide`規約はこの理由で`styleguide`へ是正済み)。
- 手順:
  1. トークン見本セクションを作る: 配色8色をスウォッチ(色見本+トークン名+16進値)で並べる、見出しフォント・本文フォントの見本テキストを表示する、角丸3段階(8px/16px/4px)の見本枠を並べる。
  2. 共通chromeセクションを作る: `BoardGameNav`をそのまま表示する(`active`は代表として`"register"`を渡す)。
  3. 共通部品カタログセクションを作る。並べる部品と実物/レプリカの扱いは次の判断による(**session/クライアント依存の部品は、状態を確実に見せるためレプリカと実物を使い分ける**。具体的な使い分け・並び順は実装時に微調整してよい):
     - **ボタン**: 独立コンポーネントは存在しないため、register/favorites画面で使われている主要ボタンのTailwindクラス(`bg-bgr-primary`系の主要ボタン、押下色`bgr-primary-active`)をそのまま複製した静的マークアップ見本を置く(有効/無効の2状態)。
     - **カード**: 同様に独立コンポーネントがないため、`bg-bgr-card border border-bgr-line rounded-lg`パターンの静的マークアップ見本を置く。
     - **パンくず**: register画面の「べんりやつーる › ボドゲのトリセツ › 登録依頼」パターンを静的マークアップ見本として置く。
     - **フォーム部品(`PhotoUploader`)**: session非依存のため実部品をそのまま置く。styleguideページ側で`useState<File[]>([])`を持つラッパーとして動かす(実際のファイル選択・削除の見た目を確認できる)。
     - **お気に入りトグル(`FavoriteButton`)**: 未ログインではコンポーネント自体が`null`を返す仕様のため、実部品をそのまま置いても何も表示されず確認にならない。そこで、**実部品(未ログイン状態、何も表示されないことそのものを示す)を1つ**と、**「未登録」「登録済み」2状態の静的レプリカ(実コンポーネントと同じTailwindクラスを複製したマークアップ)**を並べて置く。
     - **ログイン導線(`LoginStatus`)**: `useSession`はセッションが無ければ確実に「未ログイン」の見た目(ログインボタン)を返すため、実部品をそのまま置いて未ログイン時の実際の見た目を見せる。あわせて、ログイン中の見た目(アカウント名+お気に入り一覧導線+ログアウト)は実セッションなしでは再現できないため、静的レプリカを並べて置く。
  4. ページ内のどこかに文字列「styleguide」を含む見出し・キャプションを置く(下記「styleguide.pngをキャプチャする手順」の`wait-for text=styleguide`が拾えるようにするため。具体的な文言は実装時に決める)。
  5. `styleguide`はSupabase呼び出し・セッション情報を露出しない静的カタログとする方針を守る(下記セキュリティ参照)。新しい見た目・新しい共通部品はこのページのために作り起こさない(requirements.md#共通部品カタログstyleguideページ-6)。
- 関連するビジネスルール: requirements.md#共通部品カタログstyleguideページ-4、requirements.md#共通部品カタログstyleguideページ-5、requirements.md#共通部品カタログstyleguideページ-6

### styleguide.pngをキャプチャする手順
- 対象: `app/board-game-rules/styleguide/styleguide.png`(新規)
- 手順: [run-benriyatool](../../../.claude/skills/run-benriyatool/SKILL.md)の「スタイルガイドのキャプチャ」に従う(実装フェーズで実施、TDD対象外)。
  1. `npm run dev`でローカルサーバーを起動する。
  2. `node .claude/skills/run-benriyatool/driver.mjs`で`http://localhost:3000/board-game-rules/styleguide`へ遷移し、`wait-for text=styleguide`で描画完了を待ち、`screenshot styleguide`で撮影する。
  3. `.claude/skills/run-benriyatool/screenshots/styleguide.png`を`app/board-game-rules/styleguide/styleguide.png`にコピーする。
  4. Readツールで実際に画像を見て、真っ白・エラーでないことを確認してからコミットする。
  5. 以後、共通部品(chromeや本ページに並べた部品)を変更したコミットでは、同じコミットで本手順を再実行し撮り直す([/implementation](../../../.claude/skills/implementation/SKILL.md)「共通部品(chrome)を変更したときのstyleguide.png撮り直し」)。

### DESIGN.mdをStitchに反映する手順(検証)
- 対象: Stitchプロジェクト`10756296516233709248`(board-game-rules、既存)
- 位置づけ: TDD対象外の**手動検証手順**。DESIGN.mdの内容をStitch側のデザインシステムとして反映できるか、既存プロジェクトに同居させて運用が回るかを確かめる(requirements.md#stitch連携design.md一元管理の検証-7、requirements.md#stitch連携design.md一元管理の検証-8)。
- 手順:
  1. `mcp__stitch__upload_design_md`を呼ぶ。`projectId`は既存の board-game-rules プロジェクト`10756296516233709248`、`designMdBase64`は`specs/board-game-rules/DESIGN.md`の内容をbase64化して渡す。
  2. `mcp__stitch__get_project`で対象プロジェクトを取得し、手順1で生成されたscreen instanceの`id`と`sourceScreen`を控える。
  3. `mcp__stitch__create_design_system_from_design_md`を呼ぶ。`projectId`と、手順2で控えた`selectedScreenInstance`を渡してデザインシステムを作成する。
  4. `mcp__stitch__list_design_systems`で作成されたデザインシステムの`assetId`を控える(以後board-game-rulesの画面生成で`designSystem`として使い回すため)。
  5. 検証で分かった利点・難点(反映の手間、Stitch側の表現力とDESIGN.mdの表現のズレなど)をDESIGN.mdまたは本design.mdに追記し、A工程(DESIGN.md一元管理を全アプリの恒久ルールにするか)の判断材料として残す。
- **Stitchが`DESIGN.md`に期待する正確なフォーマットは実装時点で未確認のため、手順1の`upload_design_md`の実行結果を見て内容・構成を調整する前提とする**(requirements.md#stitch連携design.md一元管理の検証-7が「具体的な手順は設計・実装で確定する」と織り込み済み)。
- 複数アクター(開発者・Stitch MCPツール)間のやり取りだが、分岐のない一直線の手動ツール呼び出し手順のため、シーケンス図は付けず上記の番号付き手順を正とする(検討の上での省略)。

## エラーハンドリング
- `styleguide`は静的な確認ページで、外部通信・DB書き込みを行わないため例外要因はほぼない。`FavoriteButton`(未ログイン)・`LoginStatus`は`useSession`経由でSupabaseの`auth.getSession()`を呼ぶが、失敗時も各コンポーネント側の既存の扱い(未ログイン相当の表示)に委ね、本ページで追加のエラー処理は行わない。
- Stitchへの反映(検証手順)は手動作業のため、`upload_design_md`や`create_design_system_from_design_md`が失敗・期待通りの結果にならない場合は、DESIGN.mdの記述形式を調整して手動でリトライする(自動リトライの仕組みは作らない)。

## 関連するファイル(抜粋)
```
specs/board-game-rules/DESIGN.md (新規: トークン+chromeルールの一元管理)
app/board-game-rules/styleguide/page.tsx (新規: 共通部品カタログ)
app/board-game-rules/styleguide/styleguide.png (新規: 上記のキャプチャ)
specs/board-game-rules/game-registration/design.md (変更: デザイントークン節をDESIGN.md参照に付け替え)
specs/board-game-rules/favorite/design.md (変更: デザイントークンの参照先としてDESIGN.mdへの言及を追加)
app/board-game-rules/components/BoardGameNav.tsx (既存: 共通ナビ。styleguideで表示)
app/board-game-rules/components/FavoriteButton.tsx (既存: styleguideで実物+レプリカを表示)
app/board-game-rules/components/LoginStatus.tsx (既存: styleguideで実物+レプリカを表示)
app/board-game-rules/components/PhotoUploader.tsx (既存: styleguideでラッパー付きで表示)
app/globals.css (既存: デザイントークンの実体。DESIGN.mdはこの値を転記する)
```

## セキュリティ
- `styleguide`は開発者向けの確認用ページであり、利用者向けの公開機能ではない(requirements.md「依存関係・非機能要件」)。hub-siteのトップページカード・metadataの対象外とする。
- 静的カタログという性質上、Supabase呼び出しは`PhotoUploader`(ファイル選択のみ、送信しない)・`FavoriteButton`(未ログイン状態のみ実表示)・`LoginStatus`(未ログイン状態のみ実表示)の各既存部品が内部で行う`getSession()`程度にとどめ、本ページ自身が新たにSupabaseクライアントを呼ぶ処理は追加しない。ログイン中の見た目は静的レプリカで見せるため、本ページの閲覧によってセッション情報・個人情報が露出することはない。
- DESIGN.md・styleguideページはトークン値・共通部品の見た目という非機微情報のみを扱う。

## ログ
- 静的な確認ページであり、処理の開始・終了・失敗といった記録すべき運用ログは発生しない。既存部品(`FavoriteButton`/`LoginStatus`)が内部で出すログ(コンソールのエラー出力等)はそれぞれの既存design.mdの方針をそのまま踏襲し、本ページ独自のログは追加しない(検討の上で不要と判断)。

## 画面設計
`app/board-game-rules/styleguide/page.tsx`は次のセクション構成の単一ページとする(requirements.md#共通部品カタログstyleguideページ-4)。単一ページで完結し画面遷移がないため、画面遷移図は省略する(検討の上での判断)。

- **トークン見本**: 配色8色のスウォッチ(色+トークン名+16進値)/見出しフォント・本文フォントの見本テキスト/角丸3段階(8px・16px・4px)の見本枠。値は[DESIGN.md](../DESIGN.md)(実体は`app/globals.css`)を参照する。
- **共通chrome**: `BoardGameNav`をそのまま表示する。
- **共通部品カタログ**: ボタン(静的マークアップ見本、有効/無効)/カード(静的マークアップ見本)/パンくず(静的マークアップ見本)/フォーム部品`PhotoUploader`(実部品、ローカルstateラッパー)/お気に入りトグル`FavoriteButton`(未ログイン実部品+「未登録」「登録済み」レプリカ2種)/ログイン導線`LoginStatus`(未ログイン実部品+ログイン中レプリカ)。各部品の扱いの判断根拠は上記「styleguideページを作る手順」を参照。

見た目自体はStep0を実施せず、既に確定済みのAnalog Hearth([game-registration/design.md#デザイントークンanalog-hearth](../game-registration/design.md#デザイントークンanalog-hearth)、Stitchプロジェクト`10756296516233709248`)と、実装済みの`BoardGameNav.tsx`をそのまま写す。
