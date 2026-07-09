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

# 特定タスクの知識
仕様作成・TDD実装・Claude Code設定変更などの詳細手順は `.claude/skills/` 内の各Skillを参照する。

@AGENTS.md
