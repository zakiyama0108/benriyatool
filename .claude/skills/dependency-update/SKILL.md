---
name: dependency-update
description: npmの依存パッケージを定期更新するときに使う(目安: 月1回)。npm outdated/auditの確認、Next.js更新時の注意、更新PRの出し方を扱う。
---

> ワークフロー上の位置: 定期作業(開発ループ外)。更新後は [/pr](../pr/SKILL.md)(実装PR) → [/release-check](../release-check/SKILL.md)

# 実行タイミング

- 月1回を目安に実行する
- `npm audit`で脆弱性が報告されたとき(随時)

# Step1 現状の確認

```bash
npm outdated        # 更新可能なパッケージの一覧
npm audit           # 既知の脆弱性
```

# Step2 更新方針を決める

- **patch / minor**: まとめて更新してよい(`npm update`)。semver上は互換だが、テスト・ビルドで検証は必ず行う
- **major**: 1パッケージずつ個別に更新し、リリースノートで破壊的変更を確認してから上げる
- **Next.js / React**: majorに限らず注意。このリポジトリのNext.jsは学習データと異なる可能性があるため(AGENTS.md参照)、更新したら`node_modules/next/dist/docs/`の関連ガイドを読み直し、非推奨警告に対応する。静的エクスポート(`output: "export"`)とCloudflare Workers配信(wrangler.toml)が前提なので、この構成に影響する変更がないかを最優先で確認する
- 脆弱性対応は他の更新と混ぜず、単独で先に出してよい
- Next.jsのメジャー/マイナー更新はE2Eテスト導入の判断タイミングでもある(現状は未導入。判断基準は[docs/adr/0005](../../../docs/adr/0005-e2e-testing-strategy.md)を参照)

# Step3 更新と検証

`feature/update-deps-<YYYYMM>`ブランチを切ってから更新する。

```bash
npm update <または npm install <pkg>@<version>>
npm test && npm run lint && npm run build
npm run dev   # 主要画面(トップ・/ikukyu)を触って表示・計算を確認
```

- 仕様(specs/)の変更は伴わないため仕様承認ゲートは不要
- テスト・ビルドが壊れた場合、その修正が仕様に触れるなら[/fix](../fix/SKILL.md)の判断に切り替える
- lockfileの差分が意図したパッケージだけか`git diff package-lock.json --stat`で確認する

# Step4 PR

[/pr](../pr/SKILL.md)の実装PRテンプレートで作成する。本文の「変更内容」に更新したパッケージと新旧バージョン、majorがあればリリースノートの要点を書く。

# 完了時の次ステップ案内

PRマージ後、[/release-check](../release-check/SKILL.md)で本番確認とブランチ掃除を行う。