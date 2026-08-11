# 要件定義: お気に入りのボードゲーム

## 概要
- 機能名: お気に入りのボードゲーム
- 目的: ログイン中の利用者が気になったボードゲームをお気に入り登録し、専用の一覧からいつでも見返せるようにする
- 優先度: 中

## ユーザーストーリー
- 利用者として、気になったボードゲームをお気に入り登録し、あとでまとめて見返したい
- 利用者として、お気に入りに登録したかどうかを一覧・詳細のどちらでもひと目で分かるようにしたい
- 利用者として、不要になったお気に入りを解除したい
- 利用者として、自分がお気に入り登録した内容は他の利用者から見られたくない

## 機能要件

### お気に入りの登録・解除
- [1] ログイン中の利用者は、ゲーム一覧・ゲーム詳細のどちらからでもお気に入り登録・解除ができる(トグル操作)
- [2] 未ログインの訪問者には、お気に入り登録の操作(ボタン等)自体を表示しないか、操作するとログインを促す
- [3] あるゲームが既にお気に入り登録済みかどうかが、一覧・詳細の表示上で分かる

### お気に入り一覧
- [4] ログイン中の利用者は、自分がお気に入り登録したゲームの一覧を、専用の画面で確認できる
- [5] 一覧の各項目から、そのゲームの詳細画面へ遷移できる
- [6] 一覧の各項目から、お気に入りを解除できる(詳細画面に戻らなくても一覧画面だけで完結する)
- [7] 一覧は、お気に入り登録した日時の新しい順に並べる
- [8] 自分が登録したお気に入りのみが一覧に表示され、他の利用者のお気に入りは表示・参照できない

## ビジネスルール・制約

### 表示範囲・権限
- [1] お気に入りの閲覧・登録・解除は、いずれもログイン中の本人の登録内容に限定する。実際のアクセス制御はDB側(RLS)で担保し、画面側の表示出し分けだけに頼らない(根拠: [docs/adr/0001-user-input-database.md](../../../docs/adr/0001-user-input-database.md)が予告する「ログインが必要なアプリ」向けパターン。[ai-dev-digest/bookmark/design.md](../../ai-dev-digest/bookmark/design.md)で同パターンが既に実装済みのため、これを踏襲する)
- [2] ログイン基盤は[user-auth/requirements.md](../user-auth/requirements.md)のGoogle OIDCを利用する。運営者判定(`isAuthorizedAdmin()`)は利用しない(利用者全員が対象のため)

### 件数の制約
- [3] 1利用者が登録できるお気に入り件数の上限は設けない(根拠: 個人開発の小規模運用が前提であり、[ai-dev-digest/bookmark/requirements.md](../../ai-dev-digest/bookmark/requirements.md)と同じ判断)

## 依存関係
- お気に入り対象となるゲームの識別子は[game-registration/requirements.md](../game-registration/requirements.md)で登録されるゲームのIDに従う
- 認証・DB設計のパターンは[docs/adr/0001-user-input-database.md](../../../docs/adr/0001-user-input-database.md)、および先行実装の[ai-dev-digest/bookmark/design.md](../../ai-dev-digest/bookmark/design.md)を参照する
- ログイン状態は[user-auth/requirements.md](../user-auth/requirements.md)に従う
- お気に入りの保存(本人のログインに紐づく利用)を新設するため、[specs/legal/requirements.md](../../legal/requirements.md)のプライバシーポリシーの更新要否を[user-auth](../user-auth/requirements.md)・[comment](../comment/requirements.md)と合わせて確認する(favorite自体は`user_id`+`game_id`のみで直接のPII本文は持たないが、他specと粒度を揃える)

## スコープ外
- お気に入りの共有・公開(自分以外の利用者への表示)
- お気に入り一覧での検索・絞り込み・並び替え(登録日時の新しい順で固定表示する)
- お気に入りにメモを添える機能
