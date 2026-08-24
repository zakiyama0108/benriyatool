# 要件定義: 管理画面(モデレーション)

> ステータス: 仕様確認中(未実装)

## 概要
- 機能名: 管理画面(モデレーション)
- 目的: 運営者本人だけがログインして、複数ゲームを横断する運用(通報内容の確認、利用者から届く登録依頼([game-registration/requirements.md](../game-registration/requirements.md))の確認・処理)を行えるようにする
- 優先度: 中

## ユーザーストーリー
- 運営者として、通報された内容をまとめて確認し、対応の要否を判断したい
- 運営者として、通報された内容から対象ゲームを開いて、その場で対処(編集・削除)したい
- 運営者として、管理画面を自分以外に開かれない・操作されないようにしたい
- 運営者として、届いた登録依頼をまとめて確認し、写真をもとにゲームを登録したい
- 運営者として、新しい登録依頼が届いたらすぐに気づけるようにしたい
- 運営者として、登録依頼に添付されたゲーム紹介画像を確認したい
- 運営者として、投稿者が紹介画像を用意しなかった場合でも、登録時に自動的に画像を用意したい
- 運営者として、共通ナビから管理画面へ素早く到達したい
- 運営者として、管理画面から一覧など他の画面へ戻り、迷わず回遊したい
- 運営者として、管理画面が他の画面と同じ見た目・同じナビで、違和感なく使いたい

ゲーム1件ごとの編集・削除・紹介画像差し替え・元写真照合・コメント削除は、そのゲームの詳細画面で行う([game-detail/requirements.md#運営者向けの操作管理者ログイン時](../game-detail/requirements.md))。

## 機能要件

### ログイン・アクセス制御
- [1] 管理画面のURLを開いたとき、ログインしていない場合は管理機能を一切表示せず、ログインを促す
- [2] Googleアカウントでログイン(OIDC)できること。既存アプリの管理画面と同じ運営者アカウントを使う
- [3] 運営者本人以外のアカウントでログインした場合、管理機能を表示せず、操作できない旨を表示する
- [4] ログアウトできること
- [18] 運営者本人としてログインしている場合に限り、board-game-rulesの共通ナビ(左サイドバー)に管理画面(`/board-game-rules/admin/`)への導線を表示する。未ログイン・運営者以外のアカウントでは表示しない。これは運営者が管理画面へ素早く到達するための利便であって、アクセス制御ではない(保護は下記[ビジネスルール2]のRLSが担い、導線の表示有無にかかわらず未権限者は管理機能を利用できない)。運営者判定は既存の共通運営者判定を再利用し、新規のロジックは持たない(判定の実装詳細は[admin/design.md](design.md)を正とする)

### 通報の確認
- [5] 通報([report/requirements.md](../report/requirements.md))された内容を一覧で確認できる。各通報には対象ゲーム・通報日時・理由テキストを表示する
- [6] 通報の一覧から対象ゲームの詳細画面へ遷移できる。編集・削除はその詳細画面の管理者導線([game-detail/requirements.md#運営者向けの操作管理者ログイン時](../game-detail/requirements.md))で行う

### 登録依頼の確認
- [7] 利用者から送信された登録依頼(写真+分類情報。[game-registration/requirements.md](../game-registration/requirements.md))を一覧で確認できる。未処理/処理済みを区別して表示する
- [8] 依頼の写真・入力済み分類情報を参考に、外部ツール(ローカルのバッチ登録処理)でゲームを登録できる。登録処理自体は管理画面の外で行う(本specのスコープ外。[game-registration/requirements.md](../game-registration/requirements.md)参照)。登録が完了した依頼は、管理画面から処理済みとして記録できる
- [9] 不要な依頼(スパム・重複・情報不足など)を削除できる

### ゲーム紹介画像の確認・自動補完
- [10] 登録依頼の確認画面で、依頼に添付されたゲーム紹介画像(あれば)を確認できる([game-registration/requirements.md#ゲーム紹介画像のアップロード](../game-registration/requirements.md))
- [11] 登録依頼にゲーム紹介画像が添付されていない場合、登録依頼からゲームを登録するローカルツールが画像検索を行い、見つけた画像をそのまま転載せずAI画像加工を施したうえで登録する(根拠: [game-registration/requirements.md#ゲーム紹介画像の取り扱い](../game-registration/requirements.md)の著作権配慮の方針に従う)

### 画面レイアウト・回遊導線
- [19] 管理画面に、board-game-rules共通の左サイドバーナビ(一覧・登録依頼・お気に入り・管理へのリンク)を、他画面(一覧・登録依頼・お気に入り)と同じ体裁で表示する。管理画面を表示している間は「管理」を現在地として示す
- [20] 画面上部にパンくず(べんりやつーる › ボドゲのトリセツ › 管理)を表示し、上位画面へ遷移できる。左サイドバーを表示しない狭幅(スマートフォン)でもパンくずで他画面へ回遊できるようにする(根拠: 非機能要件[1]の外出先での対応を、狭幅でも回遊手段が残る形で満たす)
- [21] サイドバー・パンくずの導線は運営者が画面間を移動するための利便であって、アクセス制御ではない(未権限者の保護は下記[ビジネスルール2]のRLSが担い、導線の表示有無にかかわらず未権限者は管理機能を利用できない)

## ビジネスルール・制約

### アクセス制御・権限
- [1] 管理機能を利用できるのは運営者本人のアカウントのみとする。ログインしていない状態・運営者以外のアカウントでは、管理機能を利用できず、投稿写真も取得できないこと(根拠: [docs/adr/0006-admin-screen-oidc-rls.md](../../../docs/adr/0006-admin-screen-oidc-rls.md))
- [2] アクセス制御は画面上の表示の出し分けではなく、DB側のルール(RLS)で担保する(根拠: 静的サイトのため画面側だけの制御は迂回されうる)
- [3] 本管理画面と、詳細画面に載る管理者導線は、ADR-0006のテンプレートが定める「読み取り専用」の例外とし、運営者本人による書き込み操作(ゲームの編集・削除、コメントの削除、紹介画像の差し替え、登録依頼の処理)を認める(根拠: 利用者が投稿する公開コンテンツのモデレーションが必要なため。[docs/adr/0007-runtime-llm-server-and-writable-admin.md](../../../docs/adr/0007-runtime-llm-server-and-writable-admin.md))。詳細画面側でも書き込みは運営者本人に限定する(RLSで担保。[game-detail/requirements.md#運営者向けの操作管理者ログイン時](../game-detail/requirements.md))

### 認証手段とパスキー
- [4] 既存アプリの管理画面(`ikukyu/admin`・`life-money-sim/admin`)と同一の認証方針(Google OIDC、同じ運営者アカウント、パスキー・2段階認証の運用)とする(根拠: [docs/adr/0006-admin-screen-oidc-rls.md](../../../docs/adr/0006-admin-screen-oidc-rls.md))。Google OIDC自体の設定は新規に不要
- [5] Supabase AuthのRedirect URLs(URL Configuration)の許可リストに、本管理画面の戻り先URL(`https://benriyatool.com/board-game-rules/admin/**`)を本番公開前に登録する(根拠: 既存の`life-money-sim/admin`で登録漏れによるリダイレクト不具合が発生した教訓)。なお[user-auth](../user-auth/requirements.md)が登録する利用者ログインの戻り先`https://benriyatool.com/board-game-rules/**`は本管理画面の`/admin/**`を包含するため、その広域エントリが登録されていれば管理画面の戻り先も兼ねられる(別エントリの二重登録は必須ではない。詳細は[admin/design.md](design.md)・[user-auth/tasks.md](../user-auth/tasks.md))

### 通報への対応方針
- [6] 通報があっても対象を自動非表示・自動削除にはせず、必ず運営者の判断を挟む([report/requirements.md#通報後の扱い](../report/requirements.md))

### 通知
- [7] 新しい登録依頼が届いたら、運営者に通知が届く(具体的な通知手段は[game-registration/design.md](../game-registration/design.md)で確定)

### ゲーム紹介画像の自動補完
- [8] ゲーム紹介画像の画像検索・AI加工に使う外部APIは、無料枠の範囲で運用できるものを選定する(根拠: `/consult`での判断。Webアプリ側には課金構造を持ち込まない既存方針([game-registration/requirements.md](../game-registration/requirements.md))を、運営者ローカルツールの追加機能でも維持する)

## 非機能要件
- [1] 主にPC・スマートフォンの双方から利用しうる(外出先で通報に気付いて対応する場面を想定)。表示が破綻しない程度に配慮する
- [2] 静的エクスポート構成を維持する。通報・登録依頼の確認はDB(RLS経由)への操作で行い、モデレーション専用のサーバーを新設しない([game-registration/requirements.md](../game-registration/requirements.md)により、本アプリはランタイムサーバー機能を持たない)

## UI/UX要件
- [1] 管理画面の見た目を、board-game-rules共通のデザイン(配色・カード・タイポグラフィ・共通ナビ)に踏襲し、一覧・登録依頼・お気に入りの各画面と一貫させる(根拠: 運営者が画面間を行き来するため見た目が揃っている方が迷いにくい。管理画面だけがデザインから乖離している状態を解消する)
- [2] 通報一覧・登録依頼一覧・ログイン/権限なし表示など管理画面内の各要素も、共通デザインのカード・ボタン・見出しの体裁に揃える(独自の見た目を持ち込まない)

## 依存関係
- 認証方式(Google OIDC)とDB読み取り権限(RLS)の方針は[docs/adr/0006-admin-screen-oidc-rls.md](../../../docs/adr/0006-admin-screen-oidc-rls.md)、書き込み権限の例外は[docs/adr/0007-runtime-llm-server-and-writable-admin.md](../../../docs/adr/0007-runtime-llm-server-and-writable-admin.md)に従う
- ゲームの編集・削除・紹介画像差し替え・元写真照合・コメント削除は詳細画面で行う。それらの要件・ルールは[game-detail/requirements.md](../game-detail/requirements.md)に従う。編集・削除の対象データは[game-registration/requirements.md](../game-registration/requirements.md)、通報は[report/requirements.md](../report/requirements.md)、コメントは[comment/requirements.md](../comment/requirements.md)に従う
- 登録依頼(写真+分類情報)の保存構造・通知手段は[game-registration/design.md](../game-registration/design.md)で確定する
- 投稿写真という機微になりうる情報・利用者コメントの管理経路があるため、[specs/legal/requirements.md](../../legal/requirements.md)のプライバシーポリシーの更新要否を確認する
- ゲーム紹介画像の取り扱い方針(著作権配慮・削除ポリシー)は[game-registration/requirements.md#ゲーム紹介画像の取り扱い](../game-registration/requirements.md)に従う
- モデレーションの詳細画面集約・削除方針の背景は[adr/0001](../adr/0001-moderation-on-detail-and-physical-delete.md)
- 管理画面の見た目・共通ナビ(BoardGameNav)・パンくずの体裁(UI/UX要件[1][2]・機能要件[19][20])は、他画面と同じboard-game-rules共通デザインに従う。共通デザインのトークンと共通chrome(ナビ・パンくず等の枠)の定義は[design-system/requirements.md](../design-system/requirements.md)および[DESIGN.md](../DESIGN.md)に従う

## スコープ外
- 複数の管理者アカウント・権限ロールの管理(利用者は運営者本人のみ)
- 管理画面ドメイン自身をパスキー(WebAuthn)の登録先とする実装(根拠: [docs/adr/0006-admin-screen-oidc-rls.md](../../../docs/adr/0006-admin-screen-oidc-rls.md)と同じ)
- 通報者・コメント投稿者へのペナルティ管理(アカウントBAN等)
- 登録依頼からゲームを登録する処理そのもの(LLMによる解析・生成を含む)。管理画面はあくまで依頼の確認・処理済みマーク・削除にとどまり、登録処理はローカルツールで行う([game-registration/requirements.md](../game-registration/requirements.md)参照)
- 編集・削除操作の履歴管理(監査ログ)
- 通報一覧・登録依頼一覧の取得ロジック・並び順・データ構造そのものの変更(機能要件[19][20]とUI/UX要件は管理画面の見た目と回遊導線を対象とし、モデレーション機能の動作は変えない)
