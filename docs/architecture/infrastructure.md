# インフラ構成図

べんりやつーる(benriyatool.com)が使っている全クラウドサービスと役割・データの流れ・課金/無料枠の境界をまとめたプロジェクト共通ドキュメント。アプリ単位の構成(画面・テーブルの使い方)は各`specs/<アプリ名>/architecture.md`のシステム構成図を参照。

構成は「利用者」「運営者(ブラウザ経由で管理画面を使う人)」「開発者」の3つの視点に分けて描く(1枚に混ぜると経路が読み取りにくいため)。3図の正となる定義はいずれも[wrangler.toml](../../wrangler.toml)・[.github/workflows/](../../.github/workflows/)・[docs/adr/](../adr/)(選定理由)。

## 利用者から見た構成

一般ユーザーがツールを使うときの経路。サーバー処理はなく、計算はブラウザ内で完結する。

```mermaid
flowchart LR
    user["利用者のブラウザ"]
    workers["Cloudflare Workers<br>静的ファイルの配信(benriyatool.com)"]
    db[("Supabase Postgres<br>計算結果の保存先")]

    user -->|ページ取得| workers
    user -->|計算結果を保存 - anonキーでINSERTのみ・閲覧は不可| db
```

## 運営者から見た構成

運営者がブラウザで管理画面(`/ikukyu/admin`)を開き、保存データを閲覧するときの経路。

```mermaid
flowchart LR
    operator["運営者のブラウザ<br>(/ikukyu/admin)"]
    workers["Cloudflare Workers<br>管理画面も同じ静的配信"]
    auth["Supabase Auth"]
    google["Google<br>(OIDCの認証元)"]
    db[("Supabase Postgres<br>保存データ")]

    operator -->|管理画面のページ取得| workers
    operator -->|Googleでログイン| auth
    auth -->|認証を委譲| google
    operator -->|保存データの閲覧 - RLSで許可された本人のみSELECT| db
```

認証・RLSの方針は[ADR-0006](../adr/0006-admin-screen-oidc-rls.md)が正。

## 開発者から見た構成

開発者がコードを変更してから本番・DBに反映されるまでの経路。ブラウザからの利用経路とは独立している。

```mermaid
flowchart LR
    dev["開発者"]
    repo["GitHubリポジトリ"]
    actions["GitHub Actions"]
    workers["Cloudflare Workers<br>本番配信"]
    db[("Supabase Postgres")]

    dev -->|PR作成・mainへマージ| repo
    repo -->|CI・デプロイのワークフローを実行| actions
    actions -->|DBマイグレーションを適用| db
    actions -->|静的ファイルをデプロイ| workers
    actions -->|週次ヘルスチェックping - 無料枠の一時停止対策| db
```

mainマージから本番反映までの経路の詳細は[デプロイメント図](deployment.md)が正。

## 各サービスの役割

| サービス | 役割 | 関連する決定 |
|---|---|---|
| Cloudflare Workers | Next.js静的エクスポート(`out/`)の配信。カスタムドメイン`benriyatool.com`のみで公開(workers.devサブドメインは無効) | [wrangler.toml](../../wrangler.toml) |
| Supabase Postgres | ユーザー入力・計算結果の保存。anonキーはINSERTのみ、閲覧はRLSで許可された運営者のみ | [ADR-0001](../adr/0001-user-input-database.md)、[ADR-0006](../adr/0006-admin-screen-oidc-rls.md) |
| Supabase Auth | 管理画面の運営者ログイン(Google OIDC) | [ADR-0006](../adr/0006-admin-screen-oidc-rls.md) |
| GitHub Actions | PR時のCI(lint・テスト・spec-coverage・ビルド)、mainマージ時のマイグレーション適用+デプロイ、週次のSupabaseヘルスチェック | [ADR-0003](../adr/0003-db-schema-migration-ci.md)、[deployment.md](deployment.md) |

## 課金/無料枠の境界

全サービスを無料枠で運用しており、課金中のサービスはない([ADR-0001](../adr/0001-user-input-database.md)の前提「無料枠に収まる範囲で運用」)。

| サービス | プラン | 無料枠の注意点 |
|---|---|---|
| Cloudflare Workers | 無料プラン | 静的アセット配信は無料。サーバー処理(Workerスクリプトの実行)を増やす場合はリクエスト数上限に注意 |
| Supabase | Free | APIアクセスが目安1週間ないとプロジェクトが自動一時停止される。対策として週次ヘルスチェック([supabase-health-check.yml](../../.github/workflows/supabase-health-check.yml))でpingしている |
| GitHub Actions | 無料 | パブリックリポジトリのため実行時間の課金なし |
| Google OIDC | 無料 | Supabase Auth経由で利用。Google Cloud側のOAuthクライアント設定のみ(課金対象の利用なし) |

## ネットワーク構成図を作らない理由

フルマネージドサービスの利用のみで、VPC・サブネット・独自DNS/CDN経路などのネットワーク境界を自分で設計していないため、ネットワーク構成図は作成しない(この図が兼ねる。基準は[architecture-workflow](../../.claude/skills/architecture-workflow/SKILL.md)の「クラウド・インフラ系の図」)。

## 更新ルール

ホスティング変更・CI変更・外部サービス追加など、インフラ・デプロイ構成を変えるPRでは、この図を同じPRで更新する。図の陳腐化は[/spec-audit](../../.claude/skills/spec-audit/SKILL.md)(四半期)で棚卸しする。現状はサービス数が少なくMermaidで足りるため、Draw.ioへの昇格(アイコン・配置に意味が出てきた場合)も同棚卸しで見直す。
