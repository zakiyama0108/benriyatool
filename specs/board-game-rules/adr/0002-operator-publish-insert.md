# 0002. 下書きの「公開する」操作を運営者本人のログインセッションからの直接INSERTで行う

> board-game-rules アプリ固有のADR。全アプリ横断の技術選定は[docs/adr/](../../../docs/adr/)を参照する。

## ステータス
承認済み(2026-08-29)

## コンテキスト
- board-game-rules の登録依頼は、運営者のローカル環境(launchd定期ポーリング+ヘッドレスClaude Code)が写真解析・ルール本文生成を行い、生成物を下書きとして `board_game_rules_game_requests` に書き戻す。運営者は管理画面で下書きを確認し「公開する / 再調整を依頼 / 破棄」を選ぶ([admin/requirements.md#登録実行・下書きレビュー](../admin/requirements.md))。
- 「公開する」は下書きの内容で `board_game_rules_games` に1行を新規作成(INSERT)する操作である。当初の壁打ち(`/consult`)では、下書きを `board_game_rules_games` へ非公開INSERT(`deleted_at` を立てる)しておき公開時に解除する案だったが、直近の[adr/0001](0001-moderation-on-detail-and-physical-delete.md)で `deleted_at` 列自体が廃止され物理削除に一本化されたため、この案は採れない。
- `board_game_rules_games` への INSERT を実現する経路は次の2つが考えられる:
  1. 運営者本人のログインセッション(Google OIDC + RLS)から直接 INSERT する
  2. ローカル環境(service_role 相当)に「公開キュー」を処理させ、ローカル環境が INSERT する
- [ADR-0007](../../../docs/adr/0007-runtime-llm-server-and-writable-admin.md) の決定3は、管理画面・詳細画面に運営者本人の書き込みを認める例外を定めているが、その範囲は「ゲーム情報の**編集・削除**、コメントの削除」であり、論拠も「利用者が投稿する**公開コンテンツの事後モデレーション**」だった。コンテンツの**新規作成(publish)**はこの文言にも論拠にも含まれていないため、別途の意思決定が必要になる。

## 決定
**「公開する」操作は、運営者本人のログインセッションから `board_game_rules_games` へ直接 INSERT する(上記経路1)。この publish-INSERT 権限を、[ADR-0007](../../../docs/adr/0007-runtime-llm-server-and-writable-admin.md) 決定3の「運営者本人に限定した管理画面の書き込み例外」の拡張として認める。**

1. `board_game_rules_games` に、`admin_emails` に載る運営者本人(`authenticated`)のみを許可する INSERT ポリシー(`admin can insert games`)を追加する。anon・運営者以外の authenticated には INSERT を一切与えない(スキーマ・RLSの詳細は[game-registration/design.md#追加マイグレーション(登録実行・下書きレビュー)](../game-registration/design.md))。これは既存の `admin can update games` / `admin can delete games` と同一パターン(テーブル GRANT は全 authenticated、RLS の `with check` で運営者本人に限定)。
2. 例外を認める論拠は「運営者が下書きを一件ずつ目視で確認したうえで確定させる操作であり、匿名の書き込み・自動の無人書き込みではない」こと。ADR-0007 が守ろうとした「匿名の書き込みを DB に到達させない」「無人でコンテンツを増やさない」という性質は、この運用でも保たれる(生成は無人だが、`board_game_rules_games` への到達は運営者の明示操作が必ず挟まる)。
3. ローカル環境(service_role 相当)は `board_game_rules_game_requests`(下書き・状態カラム)のみを更新し、`board_game_rules_games` へは書き込まない。games への書き込みが発生するのは運営者の「公開する」操作のときだけとする。
4. ADR-0006 のテンプレート・ADR-0007 の本文は変更しない。本 ADR を board-game-rules 固有の拡張として参照する。

## 検討した代替案

| 候補 | 見送り理由 |
| --- | --- |
| 経路2(ローカル環境が「公開キュー」を処理して INSERT する) | 公開が運営者のMacのオンライン状態・ポーリング周期に依存し、下書きを確認してから実際に公開されるまでにラグが出る。運営者本人が「今この下書きでよい」と判断した瞬間に即時公開できることが運用上のUX要件(手戻りの少なさ)であり、そのためだけに service_role のキュー処理経路を増やすのは複雑。RLS INSERT ポリシー1本の追加で済む経路1の方が単純 |
| 下書きを `board_game_rules_games` へ非公開INSERT(論理削除フラグ)しておき公開時に解除 | [adr/0001](0001-moderation-on-detail-and-physical-delete.md)で `deleted_at` 列が廃止済み。復活させると物理削除への一本化が崩れ、公開SELECTのRLS・取得クエリに再び「非公開行を除外する条件」が必要になる |
| 管理画面を読み取り専用のまま維持し、公開は SQL エディタ/`registerGame.ts` の手動起動で行う | 下書きレビュー→公開のループを管理画面内で完結させる要件を満たせない。`registerGame.ts` の手動フローは自動化が止まった場合のフォールバックとして残すが、通常運用の経路にはしない |

## 影響

**良い点**
- RLS INSERT ポリシー1本の追加で「公開する」を即時・オフライン非依存にできる。service_role を使う新経路を増やさない。
- 認可の書き方が既存の `admin can update/delete games` と揃い、レビュー・検証の観点が増えない。

**懸念点**
- ADR-0007 決定3の「編集・削除」に「新規作成」が加わり、運営者本人に許す書き込みの範囲が広がる。今後さらに範囲を広げる要求が出た場合は、都度この ADR の延長として妥当かを判断する。
- publish-INSERT は `board_game_rules_games` の CHECK 制約(`rules_simple` / `rules_detailed` の文字数上限)に従う。上限を超える下書きは「公開する」を押した時点で INSERT が失敗するため、どの項目が長すぎるかを運営者に表示し「再調整を依頼」で短縮できるようにする([admin/design.md](../admin/design.md)エラーハンドリング)。
- 運営者アカウントが乗っ取られた場合、編集・削除に加えて新規ゲームの投入も可能になる。緩和は ADR-0006 の運用(パスキー・2段階認証の維持)に依存する。
