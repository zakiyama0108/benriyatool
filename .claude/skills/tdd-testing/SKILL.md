---
name: tdd-testing
description: TDDでテスト・実装を書くとき、テストのdescribe/it名や仕様コメントを書くとき、またはPRを出す前にspec-coverageやCIを確認するときに使う。
---

# TDDで実装する

仕様の承認を得てから着手する(承認ゲートの運用は [spec-workflow](../spec-workflow/SKILL.md) を参照)。`feature/<機能名>` ブランチを切り、🔴Red(失敗するテスト)→🟢Green(最小実装)→🔵Refactorのサイクルを機能ごとに完結させてから次に進む。

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
`describe`ブロックの直前に1行、対応するspecsの項目を参照するコメントを入れる。requirements.mdの見出し内で箇条書きに`[n]`が振られている場合は`見出し-n`の形式で、振られていない見出し(概要・スコープ外など)は見出し名だけを参照先にする。1つのテストが複数の箇条書きに対応する場合は`、`区切りでフルパスを繰り返す(`[n]`の付け方は[spec-workflow](../spec-workflow/SKILL.md)参照)。

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

# PRを出す

`npm run check:spec-coverage` でrequirements.md/design.mdの各仕様項目にテストが紐づいているかを確認する(CIでも同じチェックが走り、❌が残っていると失敗する)。テストが不要な項目は`scripts/spec-coverage-skip.json`に理由を添えて登録する([spec-workflow](../spec-workflow/SKILL.md)参照)。`gh pr checks <PR番号>` でCIが通っていることを確認してから作成し、GitHub UI上でdiffを確認・承認してmainにマージする。
