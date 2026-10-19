---
name: ai-dev-digest-feedback-review
description: ai-dev-digestの運営者フィードバックと掲載実績をもとにウォッチリスト・採用基準の見直し案を作らせるときに使う。「ai-dev-digestのフィードバックを元に改善して」等と頼まれたら起動する。月次GitHub Actions(毎月2日 07:00 JST)と同じ見直しを、任意のタイミングで前倒し実行する。
---

> ワークフロー上の位置: 定期作業(開発ループ外)。見直し案はPR(自動マージなし)で提示されるので、運営者がレビュー・マージする。仕様変更を伴う議論が必要な提案なら [/consult](../consult/SKILL.md) か [/fix](../fix/SKILL.md) へ

# このSkillの役割

見直しロジックそのものは書かない。手順の唯一の情報源は [specs/ai-dev-digest/watchlist-review/](../../../specs/ai-dev-digest/watchlist-review/design.md)(材料の集め方・見直し案の粒度・PRの出し方)と、その実体である [.github/workflows/ai-dev-digest-monthly.yml](../../../.github/workflows/ai-dev-digest-monthly.yml)。このSkillが担うのは **月次ワークフローを前倒しで起動し、結果を運営者に報告する** ことだけ。

このSkillは`disable-model-invocation`を付けていない(他の定期作業Skillと異なる)。理由は [README.md](../README.md#起動者誰がskillを起動できるか) の「定期作業Skillの自律起動」欄に記載。会話で「フィードバックを元に改善して」と頼まれたら起動してよい。

# 実行タイミング

- 「ai-dev-digestのフィードバックを元に改善(を検討)して」「たまったフィードバックを見て」等と頼まれたとき
- 月次routine(毎月1日 22:00 UTC = 2日 07:00 JST)の定期実行を待たずに前倒ししたいとき

月次routineは止めない。このSkillはそれと同じワークフローを手動`workflow_dispatch`で追加起動するだけで、両者は共存する。

# Step1 重複を確認する

同じ月の見直しがすでに走っていないか見る。

```bash
gh run list --workflow=ai-dev-digest-monthly.yml -L 5
gh pr list --state all --search "ウォッチリスト・採用基準見直し" -L 5
git ls-remote --heads origin 'refs/heads/ai-dev-digest/watchlist-review/*'
```

- 当月の`ai-dev-digest/watchlist-review/<年月>`ブランチ・PRがすでにある → 二重に作らない。既存PRを運営者に案内して終了(未レビューなら「これを見てほしい」、レビュー済みなら追加起動の要否を確認)
- 直近で実行済みだが材料0件で変更なしだった → 新しいフィードバックが入った可能性がなければ再実行の価値は薄い。運営者に確認する

# Step2 ワークフローを起動する

```bash
gh workflow run ai-dev-digest-monthly.yml
```

`collectReviewData.ts`で直近1ヶ月の基準未達記録・フィードバックを集計 → Claude Code CLIをヘッドレス起動して見直し案を検討 → 変更があればブランチ作成・コミット・PR作成、まで自動で進む(自動マージはしない)。所要時間の目安は5〜15分(Claude Codeの推論ステップが大半)。

# Step3 完了を待って結果を確認する

```bash
RUN_ID=$(gh run list --workflow=ai-dev-digest-monthly.yml -L 1 --json databaseId --jq '.[0].databaseId')
until [ "$(gh run view "$RUN_ID" --json status --jq .status)" = completed ]; do sleep 30; done
gh run view "$RUN_ID" --json conclusion,jobs --jq '{conclusion, steps: [.jobs[0].steps[] | {name, conclusion}]}'
gh pr list --state open --search "ウォッチリスト・採用基準見直し" -L 3
```

- **PRが作成された**: PRのURLと、本文の「判断材料の表」(対象フィードバック・実績 / 提案内容 / 適用した場合の懸念)を運営者に要約して伝える
- **材料が両方0件で変更なし**: 直近1ヶ月に基準未達記録もフィードバックもなかった、と報告する(正常。PRは作られない)
- **ワークフローが失敗**: `gh run view "$RUN_ID" --log-failed`で失敗ステップを確認。DB接続失敗はフィードバックなしで続行する設計(design.mdのエラーハンドリング)なので、それ以外の失敗を調査する

# ローカルにDB読み取り情報がある場合(任意)

`.env.local`に`SUPABASE_READONLY_DB_URL`が設定されている環境なら、ワークフローを起動せずに材料だけ先に見ることもできる:

```bash
cd scripts/ai-dev-digest/collect-review-data && npm install
npx tsx collectReviewData.ts "$(date -u -d '-1 month' +%Y-%m-%d)"
```

出力(基準未達記録・フィードバックのJSON)を見て、見直しの余地がありそうかを判断してからStep2に進む。見直し案の作成・PR化まで会話内で手作業でやると watchlist-review/design.md の手順を複製することになるので、実際の提案作成はワークフローに任せる。

# 完了時の次ステップ案内

結果(PR作成の有無・提案の要点・懸念点)を運営者に報告する。

- PRが作られた → 運営者が内容を確認してマージする。マージ後は [/release-check](../release-check/SKILL.md) のStep3(マージ済みブランチ掃除)だけ行う。提案が新しい判定ロジックを含む場合はワークフローが実装・テストも同じPRに入れている(watchlist-review/design.md 手順6)ので、CIの結果も見る
- 提案内容について運営者が方針を詰めたい場合 → [/consult](../consult/SKILL.md)
- 材料0件で変更なし → 報告のみで完了
