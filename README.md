# ikukyu (benriyatool.com)

育休・出産のお金に関するツールを集めたサイト。Next.jsの静的エクスポートをCloudflare Workersで配信している。

## アプリ一覧

| アプリ | パス | 概要 | 詳細 |
|---|---|---|---|
| 育休給付金シミュレーター | `/ikukyu` | 産休・育休中にもらえる給付金の総額と内訳を事前に試算する | [architecture.md](specs/ikukyu/architecture.md) |

アプリごとの詳細(設計方針・システム構成・機能マップ)は各 `specs/<アプリ名>/architecture.md` を参照。新規アプリを追加したらこの表に1行追加する。

## インフラ・デプロイ

プロジェクト共通のインフラ構成(使用クラウドサービス・無料枠の境界)とデプロイ経路は以下を参照。

- [インフラ構成図](docs/architecture/infrastructure.md) — 使用している全クラウドサービスと役割・データの流れ・課金/無料枠の境界
- [デプロイメント図](docs/architecture/deployment.md) — mainマージから本番反映までの経路(CI・マイグレーション・配信)

## 開発

```bash
npm run dev    # 開発サーバー
npm test       # テスト
npm run lint   # Lint
npm run build  # ビルド
```

フォルダ構成・コーディング規約・開発ワークフローは [CLAUDE.md](CLAUDE.md) を参照。
