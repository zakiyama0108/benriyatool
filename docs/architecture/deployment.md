# デプロイメント図

mainマージから本番(benriyatool.com)反映までの経路をまとめたプロジェクト共通ドキュメント。使用サービス全体の構成は[インフラ構成図](infrastructure.md)を参照。

```mermaid
flowchart TD
    pr["実装PR(feature/*ブランチ)"]
    ci["CI(ci.yml)<br>lint → テスト+カバレッジ → spec-coverage → ビルド"]
    merge["ユーザーがGitHub UIでmainへマージ"]
    migrate["migrateジョブ(deploy.yml)<br>supabase/migrations/の未適用SQLを本番DBへ適用"]
    deploy["deployジョブ(deploy.yml)<br>依存インストール → ビルド → Wranglerでデプロイ"]
    prod["Cloudflare Workers<br>本番(benriyatool.com)"]
    check["/release-check<br>デプロイ完了確認・本番スモークチェック"]

    pr -->|PRの作成・更新で実行| ci
    ci -->|全チェック通過が前提| merge
    merge -->|mainへのpushで実行| migrate
    migrate -->|スキーマ適用の完了後にのみ| deploy
    deploy -->|静的ファイル一式を配信に反映| prod
    prod -.->|マージのたびに実施| check
```

この図の正となる定義は[ci.yml](../../.github/workflows/ci.yml)・[deploy.yml](../../.github/workflows/deploy.yml)・[wrangler.toml](../../wrangler.toml)。

## 経路の補足(各定義ファイルのコメントが正)

- **マイグレーションが先、デプロイが後**: 新コードが前提とするスキーマ変更を先に適用してからデプロイする(順序が逆転するとINSERT失敗が握りつぶされて気づけない)。マイグレーションの適用済み判定はDB内の管理テーブルが担い、二重適用されない(基盤は[ADR-0003](../adr/0003-db-schema-migration-ci.md))
- **Supabaseへの接続はSession Pooler経由**: GitHub ActionsランナーはIPv6不可のため、IPv4対応のPooler(ポート5432)で接続する
- **環境変数の埋め込み**: `NEXT_PUBLIC_SUPABASE_URL`・`NEXT_PUBLIC_SUPABASE_ANON_KEY`はビルド時に静的成果物へ埋め込まれる(GitHub ActionsのSecretsで管理し、ビルドステップでのみ渡す)
- **サーバー環境は本番のみ**: ステージング環境はなく、mainマージ=本番反映。マージ後は毎回[/release-check](../../.claude/skills/release-check/SKILL.md)で確認する

## 更新ルール

CIの構成・デプロイ先・ビルド手順を変えるPRでは、この図を同じPRで更新する。図の陳腐化は[/spec-audit](../../.claude/skills/spec-audit/SKILL.md)(四半期)で棚卸しする。
