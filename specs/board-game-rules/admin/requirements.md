# 要件定義: 管理画面(モデレーション)

> ステータス: 仕様確認中(未実装)

## 概要
- 機能名: 管理画面(モデレーション)
- 目的: 運営者本人だけがログインして、登録されたゲームの編集・削除、通報内容の確認、コメントの削除、投稿写真の照合閲覧を行えるようにする。即時公開の運用([game-registration/requirements.md#公開ポリシー](../game-registration/requirements.md))を、事後のモデレーションで支える
- 優先度: 中

## ユーザーストーリー
- 運営者として、誤りのある登録内容を自分で修正したい
- 運営者として、不適切な登録・重複登録を削除したい
- 運営者として、通報された内容をまとめて確認し、対応の要否を判断したい
- 運営者として、登録内容に疑義が出たとき、投稿された元写真を照合用に確認したい
- 運営者として、不適切なコメントを削除したい
- 運営者として、管理画面を自分以外に開かれない・操作されないようにしたい

## 機能要件

### ログイン・アクセス制御
- [1] 管理画面のURLを開いたとき、ログインしていない場合は管理機能を一切表示せず、ログインを促す
- [2] Googleアカウントでログイン(OIDC)できること。既存アプリの管理画面と同じ運営者アカウントを使う
- [3] 運営者本人以外のアカウントでログインした場合、管理機能を表示せず、操作できない旨を表示する
- [4] ログアウトできること

### ゲームの編集・削除
- [5] 登録済みのゲームを一覧で確認できる(通報件数の多い順・新しい順など、対応が必要なものを見つけやすい並びは設計で確定する)
- [6] 個々のゲームの分類情報・ルール本文(簡単版・詳しい版)を編集して上書き保存できる
- [7] 個々のゲームを削除できる。削除したゲームは一覧・詳細・絞り込みの対象から外れる([game-list/requirements.md#表示対象](../game-list/requirements.md)、[game-detail/requirements.md#表示対象](../game-detail/requirements.md))

### 通報の確認
- [8] 通報([report/requirements.md](../report/requirements.md))された内容を一覧で確認できる。各通報には対象ゲーム・通報日時・理由テキストを表示する
- [9] 通報の一覧から対象ゲームの編集・削除に進める

### 投稿写真の照合閲覧
- [10] 個々のゲームについて、投稿時にアップロードされた元写真を運営者だけが閲覧できる(根拠: 登録内容の疑義の照合用。[game-registration/requirements.md#写真の取り扱い](../game-registration/requirements.md))

### コメントの削除
- [11] 不適切なコメントを削除できる([comment/requirements.md#機能要件-10](../comment/requirements.md))。コメントの編集はできない

## ビジネスルール・制約

### アクセス制御・権限
- [1] 管理機能を利用できるのは運営者本人のアカウントのみとする。ログインしていない状態・運営者以外のアカウントでは、管理機能を利用できず、投稿写真も取得できないこと(根拠: [docs/adr/0006-admin-screen-oidc-rls.md](../../../docs/adr/0006-admin-screen-oidc-rls.md))
- [2] アクセス制御は画面上の表示の出し分けではなく、DB側のルール(RLS)で担保する(根拠: 静的サイトのため画面側だけの制御は迂回されうる)
- [3] 本管理画面は、ADR-0006のテンプレートが定める「読み取り専用」の例外とし、ゲームの編集・削除、コメントの削除という書き込み操作を認める(根拠: 利用者が投稿する公開コンテンツのモデレーションが必要なため。[docs/adr/0007-runtime-llm-server-and-writable-admin.md](../../../docs/adr/0007-runtime-llm-server-and-writable-admin.md))

### 認証手段とパスキー
- [4] 既存アプリの管理画面(`ikukyu/admin`・`life-money-sim/admin`)と同一の認証方針(Google OIDC、同じ運営者アカウント、パスキー・2段階認証の運用)とする(根拠: [docs/adr/0006-admin-screen-oidc-rls.md](../../../docs/adr/0006-admin-screen-oidc-rls.md))。Google OIDC自体の設定は新規に不要
- [5] Supabase AuthのRedirect URLs(URL Configuration)の許可リストに、本管理画面の戻り先URL(`https://benriyatool.com/board-game-rules/admin/**`)を本番公開前に登録する(根拠: 既存の`life-money-sim/admin`で登録漏れによるリダイレクト不具合が発生した教訓)

### 通報への対応方針
- [6] 通報があっても対象を自動非表示・自動削除にはせず、必ず運営者の判断を挟む([report/requirements.md#通報後の扱い](../report/requirements.md))

## 非機能要件
- [1] 主にPC・スマートフォンの双方から利用しうる(外出先で通報に気付いて対応する場面を想定)。表示が破綻しない程度に配慮する
- [2] 静的エクスポート構成を維持する。ただしゲームの編集・削除・写真閲覧はDB(RLS経由)への操作で行い、[game-registration/requirements.md](../game-registration/requirements.md)の写真解析用サーバー関数とは別に、モデレーション専用のサーバーを新設しない

## 依存関係
- 認証方式(Google OIDC)とDB読み取り権限(RLS)の方針は[docs/adr/0006-admin-screen-oidc-rls.md](../../../docs/adr/0006-admin-screen-oidc-rls.md)、書き込み権限の例外は[docs/adr/0007-runtime-llm-server-and-writable-admin.md](../../../docs/adr/0007-runtime-llm-server-and-writable-admin.md)に従う
- 編集・削除の対象データは[game-registration/requirements.md](../game-registration/requirements.md)、通報は[report/requirements.md](../report/requirements.md)、コメントは[comment/requirements.md](../comment/requirements.md)に従う
- 投稿写真という機微になりうる情報・利用者コメントの管理経路が新設されるため、[specs/legal/requirements.md](../../legal/requirements.md)のプライバシーポリシーの更新要否を確認する

## スコープ外
- 複数の管理者アカウント・権限ロールの管理(利用者は運営者本人のみ)
- 管理画面ドメイン自身をパスキー(WebAuthn)の登録先とする実装(根拠: [docs/adr/0006-admin-screen-oidc-rls.md](../../../docs/adr/0006-admin-screen-oidc-rls.md)と同じ)
- 通報者・コメント投稿者へのペナルティ管理(アカウントBAN等)
- 編集・削除操作の履歴管理(監査ログ)
