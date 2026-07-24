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

# 早期仕様PR([/requirement](../requirement/SKILL.md)・[/fix](../fix/SKILL.md)の仕様変更判定から呼ばれる)

3点セットが揃うのを待たず、requirements.mdが書けた時点でPRを作り、要件定義の段階からレビューしてもらえるようにする。Draftにはせず、最初から通常のPRとして作成する(承認・マージのタイミングはこれまで通り、3点セットが揃い/spec-reviewを通過した後のまま変わらない)。

- `feature/<機能名>`ブランチを作成し、requirements.mdをコミット・push
- 通常のPRを作成する(本文テンプレート後述)。この段階のrequirements.mdの先頭には`> ステータス: 仕様確認中(未実装)`が入っている
- [/design](../design/SKILL.md)でdesign.md/tasks.mdができたら、新しいPRは作らず同じブランチに追加コミット・pushする。このPRがそのまま次の「仕様承認PR」になる

本文テンプレート:

```markdown
## 概要
(何のための機能か1〜2行)

## 現在のステータス
要件定義が完了。設計(design.md/tasks.md)はこれから追加コミットします。3点セットが揃い、/spec-reviewを通過してから承認・マージをお願いします。

## 作成・更新したspec
- specs/<アプリ名>/<機能名>/requirements.md

## 次のステップ
/design で設計・タスク分解を行い、このPRに追加コミットします。
```

# 仕様承認PR(仕様承認ゲート)

3点セット(requirements.md/design.md/tasks.md)が揃った時点のPRが仕様承認PRになる。「早期仕様PR」で作成済みのPRに/designが追加コミットしていれば新しいPRは作らず、そのPRをそのまま仕様承認PRとして扱う(早期仕様PRを経ていない場合のみ、ここで初めてブランチ・PRを作成する)。ユーザーの確認・承認を得るまでコード(テストを含む)は書き始めない。

この段階ではrequirements.mdの先頭(タイトル直下)に`> ステータス: 仕様確認中(未実装)`という行を入れる。この行がある間、そのフォルダのrequirements.md/design.mdは`check:spec-coverage`のチェック対象・CI失敗条件から除外される(🚧仕様確認中として表示される)。これは「テスト不要」という恒久的な判断ではなく、「まだ実装していないだけ」という一時的な状態を表すものなので、`scripts/spec-coverage-skip.json`には登録しない。実装(🔴Redのテスト)に着手し、仕様項目に対応するテストが書けたらこの行を削除する。

早期仕様PRからの本文更新(`gh pr edit <PR番号> --body-file`等でテンプレートを差し替える):

```markdown
## 概要
(何のための機能か1〜2行)

## 作成・更新したspec
- specs/<アプリ名>/<機能名>/(requirements.md / design.md / tasks.md)

## 判断に迷った点・レビューしてほしい点
- (仕様の分かれ道になった判断と、その根拠)

## 次のステップ
承認・マージ後、/implementation でTDD実装に着手します(承認までコードは書きません)。
```

# 実装PR

PR作成前にimpl-pr-reviewerエージェント(`.claude/agents/impl-pr-reviewer.md`)でチェックし、❌を解消してから作成する(承認ステータスマーカーの削除漏れ・spec-coverage・CIの横断チェック)。

`npm run check:spec-coverage`でrequirements.md/design.mdの各仕様項目にテストが紐づいているかを確認する(CIでも同じチェックが走り、❌が残っていると失敗する)。テストが不要な項目は`scripts/spec-coverage-skip.json`に理由を添えて登録する([/implementation](../implementation/SKILL.md)参照)。

本文テンプレート:

```markdown
## 概要
(何を実装・修正したか1〜2行)

## 関連spec
- specs/<アプリ名>/<機能名>/requirements.md

## 変更内容
- (主な変更点の箇条書き)

## テスト
- npm test: ✅ n件パス
- npm run check:spec-coverage: ✅ ❌なし

## 動作確認
- (npm run dev で確認した内容)
```

# 完了時の次ステップ案内

- 仕様承認PR → PRのURLを報告し、ユーザーの承認・マージ後に[/implementation](../implementation/SKILL.md)へ進むことを案内する。マージ待ちの間はユーザー側の操作待ちのため、ここでcompactや新しいセッションへの切り替えを行っても支障はない。切り替える場合は、次のセッションにそのまま貼り付けられるプロンプトをコードブロックで提示してから終える(例: `/implementation を実行してください。対象は specs/<アプリ名>/<機能名>/です。仕様承認PR(PR #<番号>)はマージ済みの前提で進めてください(未マージなら知らせてください)。`)
- 実装PR → PRのURLを報告し、ユーザーのマージ後に[/release-check](../release-check/SKILL.md)(デプロイ・本番確認・ブランチ掃除)を行うことを案内する。マージ待ちの間はユーザー側の操作待ちのため、ここでcompactや新しいセッションへの切り替えを行っても支障はない。切り替える場合は、次のセッションにそのまま貼り付けられるプロンプトをコードブロックで提示してから終える(例: `/release-check を実行してください。実装PR(PR #<番号>)はマージ済みの前提で進めてください(未マージなら知らせてください)。`)