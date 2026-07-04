# よく使うコマンド
- 開発サーバー: `npm run dev`
- テスト: `npm test`(watchは `npm run test:watch`)
- Lint: `npm run lint`
- ビルド: `npm run build`

# 開発ワークフロー
1. **仕様を書く**: `specs/<アプリ名>/<機能名>/` に requirements.md → design.md → tasks.md の順で作成する(各ステップの書き方は @docs/spec-workflow.md)
2. **TDDで実装する**: `feature/<機能名>` ブランチを切り、🔴Red(失敗するテスト)→🟢Green(最小実装)→🔵Refactorのサイクルを機能ごとに完結させてから次に進む。テストの`describe`/`it`名とコメントの書き方は @docs/test-comment-guideline.md に従う
3. **PRを出す**: `npm run check:spec-coverage` でdesign.mdの各仕様項目に対応するテストが書かれているか棚卸しし(❌は「本当に漏れか、単なる構造的見出しか」を判断する)、`gh pr checks <PR番号>` でCIが通っていることを確認してから作成し、GitHub UI上でdiffを確認・承認してmainにマージする

# フォルダ構成
`specs/` `app/` `__tests__/` はすべて「アプリ名 → 機能名 or components/lib」という同じ階層規約に従う(アプリ名はURLパスと対応)。

```
specs/<アプリ名>/<機能名>/requirements.md, design.md, tasks.md
app/<アプリ名>/{components,lib}/
__tests__/<アプリ名>/{components,lib}/
```

- サイト全体に関わるもの(ルーティング・共通レイアウト・法的ページ)は `specs/` 直下(hub-site, legal)、`app/` 直下(components, legal)に置く
- 変更頻度が低く設計が単純な機能は requirements.md のみで可(例: legal)
- 新しいアプリを追加する時は3つのフォルダを同名で並べて作るだけでよい

# Claude Code設定
- `.claude/settings.json` の `permissions.allow` にコマンドを追加する時は、JSON標準はコメント不可のため @.claude/permissions.md に説明を1行追記する(同じPR内で行う)

# コーディング規約
- 回答・コメントは日本語で書く
- 関数・型には役割と非自明な計算式・定数の根拠をコメントする。名前で意図が伝わる場合は不要(コードを読むだけでは「なぜその式か」が分からないため)
- シンプルさを優先し、過剰な抽象化はしない(このアプリは仕様変更が頻繁で、抽象化コストが将来の変更を阻害しやすいため)

@AGENTS.md
