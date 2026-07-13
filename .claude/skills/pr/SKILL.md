---
name: pr
description: PRを作成するときに使う。仕様承認PR(3点セット)と実装PRの2種類のテンプレート、仕様承認ゲートの運用、作成前チェック(spec-pr-reviewer・spec-coverage・CI)を扱う。
---

> ワークフロー上の位置: [/spec-review](../spec-review/SKILL.md) → **仕様承認PR** → 承認後 [/implementation](../implementation/SKILL.md) … [/implementation-review](../implementation-review/SKILL.md) → **実装PR** → ユーザーがGitHub UIでマージ → [/release-check](../release-check/SKILL.md)

> **次フェーズのモデル:**
> - 仕様承認PR → [/implementation](../implementation/SKILL.md) へ: specの複雑度に基づいて選ぶ
>   - 複雑な計算ロジック・複数の状態管理が実装で必要: **Opus** (実装判断の複雑度が高い)
>   - 標準的な実装: **Sonnet**
> - 実装PR → [/release-check](../release-check/SKILL.md) へ: 変更のリスクレベルに基づいて選ぶ
>   - 高リスク(重要機能・複数ドメイン・法令対応): **Opus**
>   - 標準～低リスク: **Sonnet** (確認作業が機械的がメイン)

# 共通ルール

- 作業は必ず`feature/<機能名>`ブランチで行い、mainに直接pushしない(マージ後の後続作業も同様に新しいブランチを切る)。複数の機能を並行して進める場合は[parallel-work](../parallel-work/SKILL.md)(worktree)を使い、ブランチの切り替えはしない
- featureブランチの作成・push・PR作成はユーザーへの確認なしで進めてよい
- PR作成前にspec-pr-reviewerエージェント(`.claude/agents/spec-pr-reviewer.md`)でチェックし、❌を解消してから作成する
- 作成後は`gh pr checks <PR番号>`でCIが全てpassすることを確認する
- ユーザーへの報告にはPR番号だけでなく完全なURLを明記する。URLは装飾なしの単独行に置く(`**`や括弧・日本語をURLに連結するとリンク検出が巻き込んで開けなくなる)
- mainへのマージはユーザーがGitHub UI上でdiffを確認して行う(こちらからマージしない)

# 仕様承認PR(仕様承認ゲート)

3点セット(requirements.md/design.md/tasks.md)を作成したら一旦PRを出し、ユーザーの確認・承認を得るまでコード(テストを含む)は書き始めない。

この段階ではrequirements.mdの先頭(タイトル直下)に`> ステータス: 仕様確認中(未実装)`という行を入れる。この行がある間、そのフォルダのrequirements.md/design.mdは`check:spec-coverage`のチェック対象・CI失敗条件から除外される(🚧仕様確認中として表示される)。これは「テスト不要」という恒久的な判断ではなく、「まだ実装していないだけ」という一時的な状態を表すものなので、`scripts/spec-coverage-skip.json`には登録しない。実装(🔴Redのテスト)に着手し、仕様項目に対応するテストが書けたらこの行を削除する。

本文テンプレート:

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

- 仕様承認PR → PRのURLを報告し、ユーザーの承認・マージ後に[/implementation](../implementation/SKILL.md)へ進むことを案内する
- 実装PR → PRのURLを報告し、ユーザーのマージ後に[/release-check](../release-check/SKILL.md)(デプロイ・本番確認・ブランチ掃除)を行うことを案内する