---
name: pr
description: PRを作成するときに使う。仕様承認PR(3点セット)と実装PRの2種類のテンプレート、仕様承認ゲートの運用、作成前チェック(impl-pr-reviewer・spec-coverage・CI)を扱う。
---

> ワークフロー上の位置: [/requirement](../requirement/SKILL.md)完了時に**早期仕様PR**を作成 → [/design](../design/SKILL.md)が同じPRに追加コミット → [/spec-review](../spec-review/SKILL.md) → **仕様承認PR(早期仕様PRがそのまま昇格)** → 承認後 [/implementation](../implementation/SKILL.md) … [/implementation-review](../implementation-review/SKILL.md) → **実装PR** → ユーザーがGitHub UIでマージ → [/release-check](../release-check/SKILL.md)

> **次フェーズのモデル:** 基本は **Sonnet**(トークン消費を抑えるため下流工程は原則Sonnetで運用する)
> - 仕様承認PR → [/implementation](../implementation/SKILL.md) へ: 複雑な計算ロジック・複数の状態管理を伴う実装のみ **Opus** を検討する。なお後続の[/implementation-review](../implementation-review/SKILL.md)は安全網として原則Opusを使うため、ここは無理にOpusを選ばなくてよい
> - 実装PR → [/release-check](../release-check/SKILL.md) へ: 確認作業は機械的なため **Sonnet** で十分

# 前提条件

- **仕様承認PR**: [/spec-review](../spec-review/SKILL.md)で指摘なし(🟢のみ)の結果を得ていること。レビュー未実施なら/spec-reviewから始める
- **実装PR**: [/implementation-review](../implementation-review/SKILL.md)で指摘なし(🟢のみ)の結果を得ていること。レビュー未実施なら/implementation-reviewから始める

# 共通ルール

- 作業は必ず`feature/<機能名>`ブランチで行い、mainに直接pushしない(マージ後の後続作業も同様に新しいブランチを切る)。複数の機能を並行して進める場合は[parallel-work](../parallel-work/SKILL.md)(worktree)を使い、ブランチの切り替えはしない
- featureブランチの作成・push・PR作成はユーザーへの確認なしで進めてよい
- 作成後は`gh pr checks <PR番号>`でCIが全てpassすることを確認する
- ユーザーへの報告にはPR番号だけでなく完全なURLを明記する。URLは装飾なしの単独行に置く(`**`や括弧・日本語をURLに連結するとリンク検出が巻き込んで開けなくなる)
- mainへのマージはユーザーがGitHub UI上でdiffを確認して行う(こちらからマージしない)。例外は[autopilot](../autopilot/SKILL.md)モードのみ(同Skillに定めた条件を満たした場合に限り自動マージする)

# PRの種類

作るPRの種類に応じて、該当する参照ファイル**だけ**を読む(もう一方の内容は不要なので読まない)。

- **実装PR**(実装完了・[/implementation-review](../implementation-review/SKILL.md)通過後に作る): [references/impl-pr.md](references/impl-pr.md) — impl-pr-reviewerでのチェック・spec-coverage確認・本文テンプレート
- **仕様承認PR**(早期仕様PR・仕様承認ゲート。新機能・仕様変更を伴う[/requirement](../requirement/SKILL.md)・[/fix](../fix/SKILL.md)の作業): [references/spec-pr.md](references/spec-pr.md) — 早期仕様PRの作成手順・仕様承認ゲートの運用・本文テンプレート

# 完了時の次ステップ案内

- 仕様承認PR → PRのURLを報告し、ユーザーの承認・マージ後に[/implementation](../implementation/SKILL.md)へ進むことを案内する。マージ待ちの間はユーザー側の操作待ちのため、ここでcompactや新しいセッションへの切り替えを行っても支障はない。新しいセッションの名称(前のセッションと同じ<機能名>に次工程名を()で添えた形。例: `<機能名>(実装)`)と、次のセッションにそのまま貼り付けられるプロンプトをコードブロックで毎回提示してから終える(「セッションを閉じても大丈夫」とだけ述べて済ませない。例: `/implementation を実行してください。対象は specs/<アプリ名>/<機能名>/です。仕様承認PR(PR #<番号>)はマージ済みの前提で進めてください(未マージなら知らせてください)。`)
- 実装PR → PRのURLを報告し、ユーザーのマージ後に[/release-check](../release-check/SKILL.md)(デプロイ・本番確認・ブランチ掃除)を行うことを案内する。マージ待ちの間はユーザー側の操作待ちのため、ここでcompactや新しいセッションへの切り替えを行っても支障はない。新しいセッションの名称(前のセッションと同じ<機能名>に次工程名を()で添えた形。例: `<機能名>(リリース確認)`)と、次のセッションにそのまま貼り付けられるプロンプトをコードブロックで毎回提示してから終える(「セッションを閉じても大丈夫」とだけ述べて済ませない。例: `/release-check を実行してください。実装PR(PR #<番号>)はマージ済みの前提で進めてください(未マージなら知らせてください)。`)
