# タスク: ボードゲームの新規登録(写真からのルール生成)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## T0. マイグレーション適用(実装より先に単独PRで適用)
- `board_game_rules_games`テーブルとRLSポリシー(anonは`photo_paths`を除く列単位SELECT・INSERT、authenticatedの全列SELECT・INSERT、運営者のSELECT/UPDATE、readonlyのSELECT)、およびCHECK制約(下限≤上限、ルール本文の防御上限=簡単版4000字・詳しい版jsonb全体40000字)を`supabase/migrations/`に追加し、mainマージでCI適用する
- 元写真の非公開Storageバケットとポリシー(運営者のみSELECT、サイズ・MIME・枚数の量的制約)は[admin](../admin/tasks.md)のT0で作成・適用する(登録処理はそこへ写真を保存する側。同一PRにまとめてよいが、確定適用の責務はadmin側に置く)
- design.md「データベース設計」T0の実機確認(anonのis_official制限、運営者のみis_official=true、削除済みの非表示、下限>上限のCHECK拒否、`anon`の`select photo_paths`拒否、ルール本文の上限超過CHECK拒否)を行う
- (TDD対象外: マイグレーションの適用と手動確認)

## T1. 共通型と章立て定義(`lib/games.ts`, `lib/rulesChapters.ts`)
- 🔴 共通章立てのキー(overview/setup/turn_flow/victory/scoring/special)↔表示見出しの対応と、ゲーム型(必須/任意項目)の整合をテストする
- 🟢 ゲームの型定義と、章キー↔見出しの対応を実装する(game-list/game-detailと共有)
- 🔵 型の置き場所・命名を整理する

## T2. 解析用プロンプトと出力スキーマ(`worker/boardGameRules/prompt.ts`)
- 🔴 出力スキーマが全項目・簡単版/詳しい版(章立て構造)・Web検索由来フラグを表現でき、章キーが共通定義と一致することをテストする
- 🟢 解析用プロンプト(著作権配慮の指示・共通章立ての指示を含む)と構造化出力スキーマを定義する
- 🔵 プロンプト文言・スキーマを整理する

## T3. 解析関数(`worker/boardGameRules/analyze.ts`)
- 🔴 Turnstile検証失敗時はLLMを呼ばず拒否を返すこと、検証成功時は画像+Web検索でAnthropicAPIを呼び結果を整形して返すこと、LLM失敗時はエラーを返すことを、Turnstile検証とAnthropic呼び出しをモックしてテストする
- 🟢 Turnstile検証→画像解析(`claude-opus-4-8`、画像入力+`web_search_20260209`、ストリーミング)→結果整形の解析関数を実装する。写真枚数・サイズの上限もここで弾く
- 🔵 エラー分岐・ログ出力(件数/所要時間/失敗種別、キー・写真中身は出さない)を整理する

## T4. Workersエントリと配線(`worker/index.ts`, `wrangler.toml`)
- 🔴 解析APIパスへのPOSTが解析関数に振り分けられ、それ以外がASSETSへフォールバックすることをテストする
- 🟢 `worker/index.ts`でルーティングを実装し、`wrangler.toml`に`main`と`[assets] binding`を追加(静的配信は維持)。着手前に`node_modules/next/dist/docs/`とCloudflare公式ドキュメントでStatic Assets+Workerの最新設定を確認する
- 🔵 Secrets(Anthropic APIキー・Turnstileシークレット)の受け渡しを整理する

## T5. Turnstileウィジェット(`components/Turnstile.tsx`)
- 🔴 ウィジェット読み込み後にトークンが取得され`onToken`が呼ばれることをテストする
- 🟢 Turnstileウィジェットの表示とトークン取得を実装する
- 🔵 読み込み失敗時の扱いを整理する

## T6. 解析クライアント(`lib/analyzeClient.ts`)
- 🔴 写真+トークンを解析関数へ送り、成功時に解析結果、失敗時にエラーを返すことをテストする(fetchをモック)
- 🟢 解析関数を呼ぶラッパーを実装する
- 🔵 タイムアウト・エラー整形を整理する

## T7. プレビュー・修正フォーム(`components/GamePreviewForm.tsx`)
- 🔴 全項目が編集可能なこと、Web検索由来の印が表示されること、必須項目(名前・人数下限上限・時間下限上限)が未入力/下限>上限だと確定操作が無効なこと、確定時に保存対象が親へ渡ることをテストする
- 🟢 解析結果を編集可能に表示し、必須検証・下限≤上限検証・Web検索由来の印を扱うフォームを実装する
- 🔵 入力補助・表示を整理する

## T8. ゲーム保存(`lib/games.ts`に保存関数を追加)
- 🔴 確定時に、元写真を非公開Storageへ保存しパスを控え、ゲーム情報(全項目+写真パス+運営者登録タグ)をINSERTすること、運営者判定でis_officialが決まること、写真保存/INSERT失敗時にエラーを返すことをテストする(Supabaseクライアント・adminAuthをモック)
- 🟢 写真Storage保存→INSERTの保存関数を実装する。is_officialはログイン中かつ`isAuthorizedAdmin`がtrueのときのみtrue
- 🔵 失敗時の握り方(入力保持・二重登録防止)を整理する

## T9. 登録画面(`register/page.tsx`)
- 🔴 状態遷移(入力待ち→解析中→プレビュー→保存中→完了、失敗時の差し戻し)が設計どおりであること、解析中/保存中の待機表示、確定後の詳細画面への案内をテストする
- 🟢 アップロード→Turnstile→解析依頼→プレビュー→確定の一連を組み立てる
- 🔵 待機表示・エラー表示・二重操作防止を整理する

## T10. 利用規約への追記(`app/legal/page.tsx`)
- 🔴 利用規約に、ルール解説が独自再構成であること・権利者の申し出に速やかに対応する旨の条項が含まれることをテストする(表示テスト)
- 🟢 利用規約(知的財産の条項)に該当条項を追記する(requirements.md#利用規約への反映-8)
- 🔵 文言を整える

## 補足
- プライバシーポリシーの更新要否(ログイン導入・利用者投稿の保存)は[user-auth](../user-auth/requirements.md)・[favorite](../favorite/requirements.md)・[comment](../comment/requirements.md)と合わせて確認する
- Supabase AuthのRedirect URLs・Google OIDC設定は[admin/design.md](../admin/design.md)のリリース前チェックに従う(本specの登録自体はログイン不要のため直接は依存しないが、運営者登録タグの確認には運営者ログインが必要)
