# 0005. E2Eテストの導入方針

## ステータス
採用

## コンテキスト
- 実装PRのマージ前確認は現状、単体テスト(`npm test`)+[run-benriyatool](../../.claude/skills/run-benriyatool/SKILL.md)のドライバ(playwright-core+システムChromeでdevサーバーを実機操作)で行っている
- ブラウザ横断の自動回帰テスト(E2E)は未導入。`@playwright/test`・Cypress等の導入要否を2026-07-12の[/consult](../../.claude/skills/consult/SKILL.md)で検討した
- このリポジトリは静的エクスポート(`output: "export"`)+Cloudflare Workers配信([docs/adr/0001](0001-user-input-database.md))が前提で、ユーザー入力はSupabaseへ直接書き込む構成のため、E2Eを書く場合は本番相当のビルド成果物と実DBへの書き込みが絡む

## 決定
**E2Eテスト(`@playwright/test`)は当面導入しない。導入するのはNext.jsのメジャー/マイナー更新([/dependency-update](../../.claude/skills/dependency-update/SKILL.md))のタイミングに限る。**

導入する場合の方針:
- スモーク1本のみ(フォーム入力→計算→合計表示のアサーション)。網羅的な回帰スイートは目指さない
- `npm run build`+`out/`配信に対して実行する(devサーバーではなくデプロイ実物を検証する)
- `page.route()`でSupabaseへのリクエストを遮断する(本番`<アプリ名>_results`テーブルへのゴミデータ防止)
- 導入時はこのADRのステータスを更新し、実装内容を追記する

## 検討した代替案

| 候補 | 見送り理由 |
| --- | --- |
| 今すぐ`@playwright/test`を導入する | 現状run-benriyatoolドライバによる実機確認で実質同等の検証ができており、自動回帰の必要性が緊急ではない。個人開発でメンテコストに見合わない |
| Cypress | このプロジェクトの構成(静的エクスポート+Supabase直書き)ではPlaywrightと比較して優位性がなく、将来導入する場合も`@playwright/test`で揃える方がrun-benriyatoolドライバ(playwright-core)と技術スタックが重複せず一貫する |

## 影響

**良い点**
- 個人開発の規模に見合わないテスト基盤への投資を避けられる
- 導入トリガーをNext.js更新時に固定したことで、「そのうちやる」で塩漬けにならず、判断のタイミングが明確

**懸念点**
- E2E不在の間は、実装PRごとのrun-benriyatoolによる実機確認の徹底が回帰防止の頼みになる。抜け漏れがあれば本番でしか気づけない
- 次のNext.js更新まで判断を先送りするため、その間に重大な回帰バグが起きた場合はこのADRを見直し前倒し導入を検討する
