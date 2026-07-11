---
name: implementation
description: 承認済みの仕様をTDDで実装するときに使う。Red→Green→Refactorサイクル、テストのdescribe/it命名・仕様コメントのルール、spec-coverageとの対応付けを扱う。
---

> ワークフロー上の位置: [/pr](../pr/SKILL.md)(仕様承認PRのマージ後) → **/implementation(本Skill)** → [/implementation-review](../implementation-review/SKILL.md)

# 着手前の確認

- 仕様の承認を得てから着手する(3点セットの仕様承認PRがマージ済みであること。承認前はコード・テストを書かない。運用は[/pr](../pr/SKILL.md)の仕様承認ゲートを参照)
- `feature/<機能名>` ブランチを切る(mainでは作業しない)。別の機能の作業と並行する場合は[parallel-work](../parallel-work/SKILL.md)(worktree)で作業ディレクトリを分ける

# TDDサイクル

🔴Red(失敗するテスト)→🟢Green(最小実装)→🔵Refactorのサイクルを、tasks.mdのタスクごとに完結させてから次に進む。

最初の🔴Redに着手し、仕様項目に対応するテストが書けたら、requirements.md先頭の `> ステータス: 仕様確認中(未実装)` 行を削除する(削除を忘れても、対応するテストが増えた項目から順に✅表示に切り替わるだけで実害はない)。

# テストのコメント・命名ルール

コードを一切読まなくても、画面のどの機能を・なぜ・どんな条件でテストしているかが`describe`/`it`とコメントだけで分かる状態を目指す。

## describe
- 画面上のどの機能・どの処理を検証しているかを、ユーザーに見える言葉で書く
- なぜそのテストが必要か(仕様の背景)が伝わるようにする
- 変数名・型名・関数名などコードの識別子をそのまま書かない

## it
- どんな条件(状況)で何が起こるべきかを日本語の文章で書く
- `monthlySalary=380000`のようなコード構文ではなく、「月給38万円」のように意味のある言葉に置き換える
- 境界値・特殊ケースは、なぜそのケースを検証するのかが伝わるようにする

## 仕様書との対応
`describe`ブロックの直前に1行、対応するspecsの項目を参照するコメントを入れる。requirements.mdの見出し内で箇条書きに`[n]`が振られている場合は`見出し-n`の形式で、振られていない見出し(概要・スコープ外など)は見出し名だけを参照先にする。1つのテストが複数の箇条書きに対応する場合は`、`区切りでフルパスを繰り返す(`[n]`の付け方は[/requirement](../requirement/SKILL.md)参照)。

```ts
// 仕様: specs/ikukyu/simulator/requirements.md#産後パパ育休の取得可能日数の決定-2
describe('...', () => {
```

見出し名や`[n]`は`npm run check:spec-coverage`で完全一致で照合されるため、requirements.md側の表記と一字一句揃える(表記ゆれがあると❌未対応として検出される)。

## Before / After

Before:
```ts
describe('出生時育児休業給付金（産後パパ育休）', () => {
  it('28日取得: monthlySalary=380000 → 28日分（67% + bonusAmount 13%）が返る', () => {
```

After:
```ts
// 仕様: specs/ikukyu/simulator/requirements.md#出生時育児休業給付金-2、specs/ikukyu/simulator/requirements.md#出生時育児休業給付金-3
describe('【パパ】出生時育児休業給付金（産後パパ育休）の金額計算 - 月給と取得日数から給付額を算出する', () => {
  it('産後パパ育休を上限の28日間取得した場合、67%の給付金に加えて13%の上乗せ額(bonusAmount)が計算されること', () => {
```

# テストと仕様書の対応付け(spec-coverage)

- テストの`// 仕様: specs/.../requirements.md#見出し-n`コメントは、基本的にrequirements.mdの`[n]`を振った箇条書きを参照する(`[n]`がない見出しは見出し名だけを書く)。design.mdの処理フローは、requirements.mdで既にテストされているロジックを実装向けに書き下したものなので、原則テストからは参照しない
- `npm run check:spec-coverage`で、requirements.md/design.mdの各項目に対応するテストが書けているかをチェックできる(CIでも実行され、❌が残っていると失敗する)
- design.mdの処理フロー項目や、そもそもテスト不要な見出し(概要・ユーザーストーリー・スコープ外など)は、`scripts/spec-coverage-skip.json`に理由を添えて登録する。「❌が出ても気にしなくてよい」という暗黙の例外は設けず、テスト不要と判断した理由を必ずスキップリストに残す

# 実装中に仕様との食い違いに気づいたら

実装を仕様に合わせるのが原則。仕様側が誤っている・不足していると分かった場合は、勝手に実装だけ変えず、3点セットを同じ変更で更新する(更新時の確認範囲は[/fix](../fix/SKILL.md)のStep2を参照)。ビジネスルールの変更に当たる場合はユーザーに確認する。

# 動作確認

全タスクのテストが通ったら、`npm run dev`で実際の画面を触り、変更した機能が期待どおり動くことを確認する。`npm run lint`・`npm run build`も通しておく。

# 完了時の次ステップ案内

全タスク完了・テスト・動作確認が済んだら、[/implementation-review](../implementation-review/SKILL.md)(コードレビュー)へ進むことを案内する。