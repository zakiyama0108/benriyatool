# 仕様承認PRの手順・テンプレート

「仕様承認PR」を作成する(新機能・仕様変更を伴う[/requirement](../../requirement/SKILL.md)・[/fix](../../fix/SKILL.md)の作業)ときに読むファイル。実装PRの作成では読まない(実装PRの手順は[references/impl-pr.md](impl-pr.md)側。トークン節約のため[SKILL.md](../SKILL.md)本体から分離している)。

# 早期仕様PR([/requirement](../../requirement/SKILL.md)・[/fix](../../fix/SKILL.md)の仕様変更判定から呼ばれる)

3点セットが揃うのを待たず、requirements.mdが書けた時点でPRを作り、要件定義の段階からレビューしてもらえるようにする。Draftにはせず、最初から通常のPRとして作成する(承認・マージのタイミングはこれまで通り、3点セットが揃い/spec-reviewを通過した後のまま変わらない)。

- `feature/<機能名>`ブランチを作成し、requirements.mdをコミット・push
- 通常のPRを作成する(本文テンプレート後述)。この段階のrequirements.mdの先頭には`> ステータス: 仕様確認中(未実装)`が入っている
- [/design](../../design/SKILL.md)でdesign.md/tasks.mdができたら、新しいPRは作らず同じブランチに追加コミット・pushする。このPRがそのまま次の「仕様承認PR」になる

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
