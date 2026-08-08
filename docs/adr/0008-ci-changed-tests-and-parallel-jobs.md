# 0008. CIのテスト絞り込み(vitest --changed)とジョブ並列化

## ステータス
採用

## コンテキスト
- `__tests__/`配下のテストが99ファイル(ai-dev-digest 27・board-game-rules 19・ikukyu 29・life-money-sim 21・components/legal 各1)まで増え、CIの体感速度が問題視された([/consult](../../.claude/skills/consult/SKILL.md) 2026-08-08)
- 実測(直近の成功run、1ジョブ内でlint→test→build→spec-coverageを直列実行)では合計106秒のうち`npm run test:coverage`が53秒と約半分を占め、他のステップ(npm ci 16秒・lint 13秒・build 13秒・spec-coverage 0秒)は既に軽量だった
- 「変更したアプリのテストだけ流す」という案(`specs/<アプリ名>/`↔`__tests__/<アプリ名>/`のフォルダ命名規約を使った手動振り分け)も検討したが、`app/components/`・`app/lib/`が4アプリ(ai-dev-digest/board-game-rules/ikukyu/life-money-sim)すべてから参照されている実態を確認した。フォルダ名ベースの振り分けだとこれら共有コード変更時に「どのアプリ分を流すか」を手動リストとして別途保守する必要があり、漏れると気づけない
- `deploy.yml`(mainへのpush時)は元々テストを実行せずbuildのみ行う構成だった。これまではPR側のCIが常に全テストを実行していたため実質的な安全網になっていた

## 決定
**PRのCI(`ci.yml`)は、変更ファイルの依存グラフから影響するテストのみをVitestの`--changed`機能で実行する。あわせてlint/test/buildを並列ジョブに分割する。**

- `npm run test:changed`(`vitest run --changed origin/main --coverage`)を新設し、`ci.yml`のtestジョブから呼ぶ。フォルダ名ではなく実際のimport関係で判定するため、共有コード変更時は影響する全アプリのテストが自動的に選ばれる
- `origin/main`との差分を取るため、testジョブのcheckoutは`fetch-depth: 0`(全履歴取得)にする
- `ci.yml`を「lint+spec-coverage」「test」「build」の3並列ジョブに分割する。互いに依存しないため、待ち時間は合計ではなく最も遅いジョブに近づく
- 上記でPR側のテストが変更影響分のみになる分の安全網として、`deploy.yml`のdeployジョブ(ビルド前)で`npm run test:coverage`による全テスト実行を追加する。mainへの反映経路のどこかで必ず一度は全テストを通す

## 検討した代替案

| 候補 | 見送り理由 |
| --- | --- |
| フォルダ名(アプリ名)ベースの手動振り分け | 元々の提案。実装は単純だが、`app/components`・`app/lib`のような複数アプリ共有コードを変更した際に「どのアプリ分を流すか」の対応表を別途保守する必要があり、更新漏れが静かな回帰見逃しに直結する |
| Turborepo/Nxなどのモノレポツール導入 | このリポジトリはアプリごとのフォルダ分けはあるが単一のNext.jsアプリ(package.jsonが1つ)であり、ビルドキャッシュ・タスクグラフ管理を導入するほどの規模ではない。個人開発のメンテコストに見合わない |
| 現状維持(全テスト常時実行) | test:coverageが53秒と全体の半分を占めており、テスト数は今後も増え続ける見込みのため、根本対策を先送りするだけになる |

## 影響

**良い点**
- 典型的な単一アプリのみを触るPRでは、testジョブの実行時間が変更に影響する分だけに短縮される
- フォルダ命名規約ではなく実際のimport関係で判定するため、共有コード変更時の見逃しリスクが手動振り分け案より低い
- ジョブ並列化により、テスト範囲の絞り込みと独立してCI全体の待ち時間も短縮される

**懸念点**
- lint/test/buildの3ジョブそれぞれが個別に`npm ci`するオーバーヘッド(1ジョブあたり約16秒)が増える。並列実行のため体感の待ち時間には現れない。このリポジトリはパブリックリポジトリでGitHub Actionsの実行時間は課金対象外([infrastructure.md](../architecture/infrastructure.md)「課金/無料枠の境界」)なのでコスト面の懸念もない
- Vitestの依存グラフ解析は静的なimportを追跡するため、動的import・実行時にしか決まらない依存関係がある場合は影響テストの検出漏れが理論上あり得る。この残余リスクはdeploy.ymlのフルスイート実行で最終的に検知する(ただしmainへの反映後に気づく形になり、PR段階では気づけない)
- `origin/main`との差分比較になるため、testジョブのcheckoutが`fetch-depth: 0`(全履歴)になりlintジョブ等より若干重くなる。現状のリポジトリ規模では無視できる差
