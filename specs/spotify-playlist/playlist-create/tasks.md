> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## 1. PKCE補助関数
- `app/spotify-playlist/lib/pkce.ts`
- Web Crypto API(`crypto.getRandomValues`)を用いたcode_verifierのランダム生成、code_verifierからcode_challenge(SHA-256 + base64url)を導出する関数、同じくWeb Crypto APIを用いたCSRF対策用stateのランダム生成関数をテストする
- 参照: design.md#spotifyでログインする処理

## 2. 認可URLの構築
- `app/spotify-playlist/lib/spotifyAuth.ts`
- client_id・redirect_uri・code_challenge・state・scope(`playlist-modify-private`)を含む認可URL(`https://accounts.spotify.com/authorize`)を組み立てる関数をテストする
- code_verifier・stateをsessionStorageに保存することをテストする(design.md#spotifyでログインする処理)
- 参照: design.md#spotifyでログインする処理

## 3. 認可コードからのトークン交換
- `app/spotify-playlist/lib/spotifyAuth.ts`
- URLの`code`・`state`パラメータを読み取り、sessionStorageの保存済みstateと一致するかを確認する関数(不一致時はエラーを返し、sessionStorageのcode_verifier・stateも削除することをテストする)
- URLに`error`パラメータが付いている場合(利用者が認可を拒否した場合)、ログインを中断する結果を返し、sessionStorageのcode_verifier・stateも削除することをテストする(requirements.md#機能要件-1)
- 一致した場合に認可コード+code_verifierでトークン発行エンドポイント(`https://accounts.spotify.com/api/token`)へリクエストし、アクセストークン・リフレッシュトークン・有効期限を得る関数(fetchはモック)。成功時・通信エラー等で失敗した時のいずれもsessionStorageのcode_verifier・stateを削除することをテストする
- 参照: design.md#spotifyでログインする処理

## 4. トークンの保存・復元・破棄
- `app/spotify-playlist/lib/spotifyAuth.ts`
- 取得したトークン一式をlocalStorageに保存する関数、保存済みトークンを読み出す関数、破棄(ログアウト)する関数をテストする
- 参照: design.md#ログアウトする処理

## 5. アクセストークンの自動リフレッシュ
- `app/spotify-playlist/lib/spotifyAuth.ts`
- 保存済みアクセストークンの有効期限が切れている、または残り60秒未満の場合にリフレッシュトークンで再発行する関数。リフレッシュ失敗時は保存内容を破棄しエラーを返すことをテストする
- 同時に複数回呼び出されても、実際のリフレッシュリクエストは1回だけ発行され、いずれの呼び出しもその結果を受け取ることをテストする(design.md#アクセストークンを自動更新する処理、重複発行の防止)
- 参照: design.md#アクセストークンを自動更新する処理、design.md#ログイン状態を復元する処理次回訪問時

## 6. ログイン状態の初期化(マウント時の分岐)
- `app/spotify-playlist/lib/spotifyAuth.ts`(初期化関数)
- 「URLに認可コードがある場合」「保存済みリフレッシュトークンがある場合」「どちらもない場合」の3分岐で、それぞれ正しい状態(ログイン中/未ログイン)になることをテストする。判定が完了するまでの間は「判定中」の状態を返すことをテストする(design.md#画面設計、初期化中)
- ログイン中になる場合は、GET /v1/meで取得したユーザーID・表示名・プロフィール画像を状態に含むことをテストする(design.md#セキュリティ、トークンとは別にメモリ内のみで保持する)
- トークン交換は成功したがGET /v1/meが失敗した場合、トークンを保存せずログイン失敗(未ログイン)として扱うことをテストする(design.md#spotifyでログインする処理)
- URLに認可コード・またはerrorパラメータがある場合、成功・失敗のいずれの結果でもURLからそれらのクエリパラメータが取り除かれることをテストする(design.md#spotifyでログインする処理)
- 参照: design.md#ログイン状態を復元する処理次回訪問時

## 7. 曲検索API
- `app/spotify-playlist/lib/spotifyApi.ts`
- 曲名で検索し(`limit=5`)、0件/1件/複数件それぞれの場合に呼び出し元が判定しやすい形(未ヒット/自動採用/候補一覧)で結果を返す関数をテストする(fetchはモック)
- 「もっと見る」用に`offset`を指定して追加の5件を取得する関数もテストする
- 通信エラー時にエラーを返すことをテストする
- レート制限(429)を受けた場合、Retry-Afterをエラー情報として返す(自動リトライはしない)ことをテストする
- 呼び出し前にタスク5の自動リフレッシュ処理を経由してアクセストークンを取得することをテストする(design.md#アクセストークンを自動更新する処理)
- 参照: design.md#曲名を一括検索する処理、design.md#エラーハンドリング、design.md#アクセストークンを自動更新する処理

## 8. 自ユーザー情報取得・プレイリスト作成・曲追加API
- `app/spotify-playlist/lib/spotifyApi.ts`
- `GET /v1/me`でユーザーIDを取得する関数
- 非公開(`public: false`)でプレイリストを新規作成する関数
- 作成したプレイリストに曲(トラックURI配列)を追加する関数
- いずれも通信エラー時にエラーを返すことをテストする
- いずれも呼び出し前にタスク5の自動リフレッシュ処理を経由してアクセストークンを取得することをテストする(design.md#アクセストークンを自動更新する処理)
- レート制限(429)を受けた場合、Retry-Afterをエラー情報として返す(自動リトライはしない)ことをテストする(design.md#エラーハンドリング)
- 参照: design.md#プレイリストを作成する処理、design.md#エラーハンドリング

## 9. 曲名入力・一括検索の状態管理
- `app/spotify-playlist/page.tsx`
- テキストエリアの内容を改行で分割し、各行の前後の空白を除いたうえで空(元から空行、または空白のみの行)になる行を除いた曲名一覧を作る処理、「検索する」押下で曲ごとの検索状態(検索中→結果に応じた状態)に遷移する処理をテストする
- 曲名が100件を超える場合、上位100件のみが検索対象になり、101件目以降が対象外である旨の注記が表示されることをテストする(requirements.md#曲名の入力-2)
- 再度「検索する」を押した場合に前回の結果・採用候補が破棄され、新しい曲名一覧で検索し直されることをテストする
- 曲名の検索を同時実行数を絞った小さなバッチ単位で呼び出すことをテストする
- 一部の曲の検索が失敗しても他の曲の検索・表示状態が継続することをテストする(design.md#エラーハンドリング)
- 検索中は「検索する」ボタンがローディング表示になり無効化される(連打で二重検索できない)ことをテストする(design.md#画面設計)
- 参照: design.md#曲名を一括検索する処理、design.md#状態管理、design.md#パフォーマンス、design.md#画面設計

## 10. 候補選択・もっと見る
- `app/spotify-playlist/components/SongResultCard.tsx`
- 複数候補のうち1件を選ぶと採用確定になること、「もっと見る」を押すと追加の5件がその曲の候補一覧に追加されることをテストする
- 既に採用確定している曲について、同じ一覧から別の候補を選び直すと採用候補が新しい選択で上書きされることをテストする(requirements.md#候補の確定方法-5)
- 取得済みの候補数がSpotify側の全候補数に達したら「もっと見る」が非表示になることをテストする(design.md#曲名を一括検索する処理)
- 参照: design.md#候補を選択する処理、design.md#曲名を一括検索する処理

## 11. 作成ボタンの有効・無効化とプレイリスト作成
- `app/spotify-playlist/components/CreateBar.tsx` / `app/spotify-playlist/page.tsx`
- 採用候補0件、またはプレイリスト名未入力のとき「プレイリストを作成」が無効であることをテストする
- 押下時に「対象曲(採用確定のみ)を入力順にまとめる→(ログイン時取得済みのユーザーIDで)プレイリスト未作成なら新規作成→曲追加」の順に呼び出され、いずれかが失敗したら完了状態にならずエラー表示になることをテストする
- 曲追加が失敗した後に再度「プレイリストを作成」を押すと、新規プレイリストを作成せず保持済みのプレイリストIDへの曲追加からやり直すことをテストする(design.md#プレイリストを作成する処理、空プレイリストの残留防止)
- 作成中は「プレイリストを作成」ボタンがローディング表示になりさらに無効化されることをテストする(design.md#画面設計)
- プレイリスト作成APIがプレイリスト名を理由とするバリデーションエラー(400系)で失敗した場合、汎用の通信エラーメッセージではなく入力の見直しを促す専用メッセージになることをテストする(design.md#エラーハンドリング)
- 参照: design.md#プレイリストを作成する処理、design.md#画面設計、design.md#エラーハンドリング

## 12. 作成完了表示・もう一度作る
- `app/spotify-playlist/page.tsx`
- 作成成功時に、作成したプレイリストへのリンクを含む完了状態になることをテストする
- 完了状態ではテキストエリア・「検索する」ボタン・候補選択が操作不可(閲覧のみ)になることをテストする(design.md#画面設計)
- 「もう一度作る」を押すと曲名入力・検索結果・採用候補・プレイリスト名が初期状態に戻り、ログイン状態は維持されることをテストする
- 完了状態でも「ログアウト」を操作でき、押下すると未ログイン表示に戻り曲名入力・検索結果・完了表示がすべて破棄されることをテストする(design.md#ログアウトする処理)
- 参照: design.md#作成後にもう一度作る処理、design.md#画面設計、design.md#ログアウトする処理

## 13. ログイン導線・ログアウト導線(ヘッダー表示)
- `app/spotify-playlist/page.tsx`
- ログイン状態の判定中は、ゲート画面・曲名入力画面のどちらでもなく全画面ローディング表示になることをテストする(design.md#画面設計、初期化中)
- 未ログイン時はゲート画面(説明文+「Spotifyでログイン」ボタンのみ)を表示し、他の要素を一切表示しないことをテストする
- ログイン時はヘッダーに表示名・プロフィール画像・「ログアウト」・共有端末向け注記を表示し、押下でログアウト処理が呼ばれ未ログイン表示に戻ることをテストする(design.md#セキュリティ)
- アクセストークンのリフレッシュに失敗した場合、一時的な通知を表示してから未ログイン表示に切り替わることをテストする(design.md#アクセストークンを自動更新する処理)
- 参照: design.md#画面設計、design.md#ログアウトする処理

## 14. styleguideページ
- `app/spotify-playlist/styleguide/page.tsx`(新規アプリ初回UIの共通部品一覧。ヘッダー・フッター・主要ボタン・カード・中立バッジ等を並べる)
- `app/spotify-playlist/styleguide/styleguide.png`(上記のキャプチャ)
- 参照: [design](../../../.claude/skills/design/SKILL.md)「共通chromeとトークンの一貫性」

## 15. トップページへのツールカード追加・ファビコン設定・sitemap・メタ情報
- `app/page.tsx`に`/spotify-playlist`(曲名からプレイリスト作成)へのツールカードが表示されることをテストする(`__tests__/page.test.tsx`に追加)。それに合わせて`app/page.tsx`にツールカードを1件追加する(新規アプリの初回公開画面のため)
- `app/spotify-playlist/icon.*`にファビコンを追加する(ダーク背景+緑の音符モチーフ、[hub-site/requirements.md#機能要件-4](../../hub-site/requirements.md#機能要件-4)で確定済みのデザイン)。静的アセットの追加のみでロジックを持たないため、TDD対象外(`specs/hub-site/tasks.md`「ファビコンの追加」と同じ扱い)
- `app/sitemap.ts`に`/spotify-playlist/`を追加し、`__tests__/sitemap.test.ts`で含まれること・`/spotify-playlist/styleguide/`は含まれないことをテストする([hub-site/requirements.md#機能要件-5](../../hub-site/requirements.md#機能要件-5))
- `app/spotify-playlist/layout.tsx`にtitle/descriptionを実装し(requirements.md#メタ情報-1)、`__tests__/spotify-playlist/layout.test.ts`でテストする。あわせて[hub-site/requirements.md#機能要件](../../hub-site/requirements.md#機能要件)の`/spotify-playlist`のメタ情報を暫定直接定義から本spec参照へ移設する

## 16. プライバシーポリシーの更新
- `app/legal/page.tsx`(仕様: requirements.md#非機能要件依存関係制約条件、[specs/legal/requirements.md](../../legal/requirements.md))
- 「1. 収集する情報」に、曲名からプレイリスト作成でログインした利用者のSpotifyの表示名・プロフィール画像・ユーザーIDを取得すること、これらは画面表示のためブラウザ上でのみ一時的に保持し運営者のサーバー・データベースには送信・保存しないこと(design.md#セキュリティ)を追記する
- 「2. 情報の利用目的」に、取得した情報は利用者ご自身のSpotifyアカウントへの新規プレイリスト作成にのみ使用する旨を追記する
- いずれもlife-money-sim・ai-dev-digest・board-game-rulesの既存記載パターンを踏襲する
- コンテンツ変更のみのためテスト対象外

## 補足(実装前に確認)
- Spotify Developer Dashboardでのアプリ登録(Client ID発行)と、redirect URIとして本番`https://benriyatool.com/spotify-playlist/`・ローカル開発用URL(例: `http://127.0.0.1:3000/spotify-playlist/`)の両方の登録が完了していることを確認する(requirements.md#非機能要件依存関係制約条件)
- 発行されたClient IDを`NEXT_PUBLIC_SPOTIFY_CLIENT_ID`としてビルド環境の環境変数に設定する(design.md#セキュリティ)

## 17. 本番ログイン不具合の修正(GitHub Secrets配線漏れ・エンドポイント移行対応)
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`をGitHub Secretsに登録し、`.github/workflows/ci.yml`・`.github/workflows/deploy.yml`の`npm run build`ステップに環境変数として渡す(初回実装時に補足のみで実際の配線を書き漏らしていた)
- 2026年2月のSpotify Web API移行に伴い、プレイリスト作成エンドポイントを`/users/{user_id}/playlists`から`/me/playlists`へ、曲追加エンドポイントを`/playlists/{id}/tracks`から`/playlists/{id}/items`へ変更する(`app/spotify-playlist/lib/spotifyApi.ts`)。`/me/playlists`はユーザーID指定が不要になるため、`getCurrentUserId`の呼び出し・関数自体を削除し、design.md#プレイリストを作成する処理の手順番号も追随して整理する(`__tests__/spotify-playlist/lib/spotifyApi.test.ts`・`__tests__/spotify-playlist/page.test.tsx`)
