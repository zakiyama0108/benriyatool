# 要件定義: 利用者ログイン(任意)

> ステータス: 仕様確認中(未実装)

## 概要
- 機能名: 利用者ログイン(任意)
- 目的: 利用者がGoogleアカウントで任意にログインできるようにする。ログインすることで`favorite`(お気に入り)の登録・一覧、`comment`(コメント)の投稿ができるようになる。ログインしなくてもゲームの閲覧・絞り込み・新規登録(`game-registration`)・通報(`report`)は引き続き利用できる
- 優先度: 中

## ユーザーストーリー
- 利用者として、Googleアカウントで任意にログインし、お気に入りのボードゲームを登録・コメント投稿ができるようにしたい
- 利用者として、ログインしなくてもゲームの閲覧・絞り込み・新規ゲームの登録はこれまでどおり使いたい(ログインを必須にされたくない)
- 利用者として、ログアウトできるようにしたい

## 機能要件

### ログイン・ログアウト
- [1] 画面上に「Googleでログイン」の操作を表示する。未ログイン状態でも、ゲームの閲覧・絞り込み・新規登録・通報はすべて制限なく利用できる
- [2] ログイン操作でGoogleアカウントによるOIDCログインを開始できる
- [3] ログイン中は、ログイン中であることが分かる表示(アカウント名・アイコン等)とログアウト操作を表示する
- [4] ログアウトできる

## ビジネスルール・制約

### 認証方式
- [1] 認証はSupabase Auth経由のGoogle OIDCとする(既存アプリの管理画面・利用者ログインと同じ認証基盤。根拠: [docs/adr/0006-admin-screen-oidc-rls.md](../../../docs/adr/0006-admin-screen-oidc-rls.md))。ただし本機能は許可リスト(`admin_emails`)によるアクセス制御を適用しない。Googleアカウントを持つ人であれば誰でもログインできる
- [2] ログインは利用者の任意選択とする。未ログイン状態であることを理由に、ゲームの閲覧・絞り込み・新規登録・通報の利用を制限しない

### 運営者判定
- [3] ログイン中のアカウントが運営者本人(既存の`isAuthorizedAdmin()`相当の判定)かどうかを、他機能(`game-registration`の運営者登録タグ付与、`admin`のアクセス制御)から参照できるようにする

## 非機能要件
- [1] ログイン状態はSupabase Authの標準セッション管理に従い、ページをリロードしてもログイン状態を維持する

## 依存関係
- 認証基盤(Supabase Auth・Google OIDC)の技術的な方針は[docs/adr/0006-admin-screen-oidc-rls.md](../../../docs/adr/0006-admin-screen-oidc-rls.md)を踏襲するが、同ADRが定める許可リスト(`admin_emails`)によるアクセス制御は本機能自体には適用しない
- ログイン状態は[favorite/requirements.md](../favorite/requirements.md)の登録・一覧機能、[comment/requirements.md](../comment/requirements.md)の投稿機能、[game-registration/requirements.md](../game-registration/requirements.md)の運営者登録タグ付与、[admin/requirements.md](../admin/requirements.md)のアクセス制御の前提となる
- Googleアカウントによるログイン(氏名・メールアドレス等の新たな個人情報の取得)を新設するため、[specs/legal/requirements.md](../../legal/requirements.md)のプライバシーポリシーの更新要否を確認する

## スコープ外
- パスワード認証・メールリンクなどGoogle以外のログイン手段
- 複数のGoogleアカウントの統合・アカウント削除機能
- ゲームの新規登録・通報を行うためのログイン必須化(いずれも匿名のまま利用できる。[game-registration/requirements.md](../game-registration/requirements.md)、[report/requirements.md](../report/requirements.md)参照)
