# タスク: board-game-rules デザインシステム

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## T0. DESIGN.mdの執筆(`specs/board-game-rules/DESIGN.md`)
- design.md「DESIGN.mdをトークン+chromeルールの真実の源として作る手順」の手順1〜6に従い、`specs/board-game-rules/DESIGN.md`を新規作成する(デザイントークン・階層表現方針・共通chromeルール・真実の源の優先順位・既知の不整合)
- 値は`app/globals.css`(色・フォント)と[game-registration/design.md#デザイントークンanalog-hearth](../game-registration/design.md#デザイントークンanalog-hearth)(角丸・階層表現の例外)から転記する。新しい値は作らない
- (TDD対象外: ドキュメント執筆のため)

## T1. 既存design.mdの参照付け替え
- `game-registration/design.md`「デザイントークン(Analog Hearth)」節の値の表・箇条書きを削除し、「トークンの定義は[DESIGN.md](../DESIGN.md)を参照する」の一文に置き換える(T0の後に実施)
- `favorite/design.md`「お気に入り一覧画面」節に、「トークンの定義は[DESIGN.md](../DESIGN.md)を参照する」の一文を追加する
- (TDD対象外: ドキュメント修正のため)

## T2. styleguideページ(`app/board-game-rules/styleguide/page.tsx`)
- 🔴 次を検証するレンダリングのスモークテストを`__tests__/board-game-rules/styleguide/page.test.tsx`に書く(`useSession`は`{ session: null, loading: false }`をモックし、`adminAuth`の`signInWithGoogle`/`signOut`もモックする。register/page.test.tsxと同じ方針):
  - トークン見本セクション(配色8色のスウォッチ・フォント見本・角丸見本)が表示されること
  - 共通ナビ`BoardGameNav`が表示されること(ナビの項目リンクが見えること)
  - ボタン・カード・パンくずの静的マークアップ見本が表示されること
  - `PhotoUploader`が表示され、ファイル選択操作ができること(選択後にプレビューが増えること)
  - `FavoriteButton`(未ログイン実部品)が何も表示しないこと、および「未登録」「登録済み」2種の静的レプリカが両方表示されること
  - `LoginStatus`(未ログイン実部品)のログインボタンが表示されること、およびログイン中の静的レプリカ(アカウント名+お気に入り一覧導線+ログアウト相当の見た目)が表示されること
  - ページ内に文字列「styleguide」を含む見出し・キャプションが存在すること(styleguide.pngキャプチャの`wait-for text=styleguide`用)
- 🟢 design.md「styleguideページを作る手順」「画面設計」に沿って`app/board-game-rules/styleguide/page.tsx`を実装する
- 🔵 静的マークアップ見本(ボタン・カード・パンくず・レプリカ2種)が重複していれば、ページ内のローカルな小コンポーネントに整理する(過剰な共通コンポーネント化はしない)

## T3. styleguide.pngのキャプチャ
- design.md「styleguide.pngをキャプチャする手順」に従い、`npm run dev`起動→`run-benriyatool`の`driver.mjs`で`/board-game-rules/styleguide`を撮影→`app/board-game-rules/styleguide/styleguide.png`にコピーする
- Readツールで撮影結果を確認し、真っ白・エラーでないことを確かめてからコミットする
- (TDD対象外: キャプチャ作業のため)

## T4. DESIGN.mdのStitch反映(検証)
- design.md「DESIGN.mdをStitchに反映する手順(検証)」に従い、`mcp__stitch__upload_design_md`→`mcp__stitch__get_project`→`mcp__stitch__create_design_system_from_design_md`→`mcp__stitch__list_design_systems`の順で手動実行する
- 作成されたデザインシステムの`assetId`を控え、分かった利点・難点をDESIGN.mdまたはdesign.mdに追記する(A工程判断材料)
- (TDD対象外: Stitch MCPツールを使う手動検証のため)

## 補足
- **DESIGN.mdと`app/globals.css`のトークン値整合を確認する自動テストは、過剰と判断し見送る**(理由: DESIGN.mdはT0でglobals.cssから一度だけ転記する散文ドキュメントであり、正規表現でのMarkdown解析は表記ゆれで壊れやすく、値がズレた場合の運用は「コードの実装値を正としてDESIGN.mdを直す」(design.md「真実の源の優先順位」)というレビュー時の目視確認に委ねる方が単純で確実なため)
- T2の`styleguide/page.tsx`は`app/**/page.tsx`のため、vitest.config.tsのカバレッジ計測対象からは除外される(既存の他page.tsxと同様)
- **spec-coverage(`npm run check:spec-coverage`)への対処(vitestカバレッジとは別スクリプト)**: 本specのrequirements.md冒頭「> ステータス: 仕様確認中(未実装)」行がある間は`scripts/check-spec-coverage.mjs`のフォルダ除外対象だが、実装完了・仕様承認でこの行を外すと、doc-only/手動検証の要件項目・design.md見出しが「❌テスト未対応」でCIを落とす。T2のスモークテスト([4]の一覧確認)以外の項目——requirements.mdの機能要件[1][2][3](DESIGN.md記載内容)・[5](png同居)・[6](新規部品を作らない方針)・[7][8](Stitch手動検証)、ビジネスルール[1]〜[6]、概要・ユーザーストーリー・ユースケース図・スコープ外・依存関係、およびdesign.mdの各処理フロー見出し・エラーハンドリング・関連するファイル・セキュリティ・ログ・画面設計——は、実装時に`scripts/spec-coverage-skip.json`へ理由付きで登録する(既存のikukyu/life-money-simのdoc-only項目と同じ運用。登録は「WIP行を外すコミット」と同じPRで行い、CIが緑であることを確認する)。この登録作業をT0〜T4とは別の実装タスクとして必ず実施する。
