# よく使うコマンド
- 開発サーバー: `npm run dev`
- テスト: `npm test`(watchは `npm run test:watch`、カバレッジ計測は `npm run test:coverage`)
- Lint: `npm run lint`
- ビルド: `npm run build`

# フォルダ構成
`specs/` `app/` `__tests__/` はすべて「アプリ名 → 機能名 or components/lib」という同じ階層規約に従う(アプリ名はURLパスと対応)。

```
specs/<アプリ名>/<機能名>/requirements.md, design.md, tasks.md
app/<アプリ名>/{components,lib}/
__tests__/<アプリ名>/{components,lib}/
```

- サイト全体に関わるもの(ルーティング・共通レイアウト・法的ページ)は `specs/` 直下(hub-site, legal)、`app/` 直下(components, legal)に置く
- 新しいアプリを追加する時は3つのフォルダを同名で並べて作るだけでよい

# コーディング規約
- 回答・コメントは日本語で書く
- 関数・型には役割と非自明な計算式・定数の根拠をコメントする。名前で意図が伝わる場合は不要
- シンプルさを優先し、過剰な抽象化はしない(仕様変更が頻繁なため)

# 開発ワークフロー
機能開発は以下の順で進める。各ステップの詳細手順は `.claude/skills/` 内の同名Skillを参照し、各ステップの完了時には次のステップを案内する。

```
/consult(任意: 方針の壁打ち)
→ /requirement(要件定義) → /design(設計・タスク分解) → /spec-review(仕様レビュー) → /pr(仕様承認PR)
→ 承認後: /implementation(TDD実装) → /implementation-review(コードレビュー) → /pr(実装PR)
→ マージ後: /release-check(デプロイ・本番確認・ブランチ掃除)
```

- レビューで指摘が出たら `/resolve`(指摘修正)→ 再レビュー → `/pr` と進む
- バグ修正・既存機能の小規模改修は `/fix` から入る(承認の要否は/fix内で判断)
- ワークフローと直交する知識は `architecture-workflow`(アプリ全体像の文書化)、`claude-settings`(許可コマンド追加)を参照する

# 定期作業
開発ループの外で、以下を定期的に実行する(詳細は同名Skill)。

- `/law-revision-check` — 給付率・上限額など法令由来の前提値の改定確認(毎年7月・4月、制度変更のニュース時)
- `/dependency-update` — npm依存パッケージの更新(月1回、脆弱性報告時は随時)
- `/data-check` — Supabase保存データの健全性確認(月1回)
- `/spec-audit` — 仕様書・skip.json・architecture.mdの棚卸し(四半期に1回)
- `/retrospective` — ワークフローと実態のずれの振り返り・Skill更新(月1回〜四半期に1回)

@AGENTS.md
