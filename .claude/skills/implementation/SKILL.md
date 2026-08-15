---
name: implementation
description: 承認済みの仕様をTDDで実装するときに使う。Red→Green→Refactorサイクル、テストのdescribe/it命名・仕様コメントのルール、spec-coverageとの対応付けを扱う。
---

> ワークフロー上の位置: [/pr](../pr/SKILL.md)(仕様承認PRのマージ後) → **/implementation(本Skill)** → [/implementation-review](../implementation-review/SKILL.md)

> **次フェーズのモデル(/implementation-review):** 原則 **Opus**(実装者の自己レビューバイアスを排除する最後の砦のため、他の下流工程よりトークンをかける価値がある)。文言修正のみなど明らかに軽微な変更に限り **Sonnet** でよい

# 前提条件

- **着手前チェック(重複作業の防止):** `git fetch origin main` でローカルmainの遅れを確認し、遅れていれば先に最新化する。続けて `gh pr list --state all --limit 20 --search "<対象のアプリ名や機能名>"` と `git ls-remote --heads origin` で、同じspec・同じ機能を扱う既存PR・進行中ブランチがないか確認する。該当しそうなブランチ/PRが複数見つかった場合は、PR本文・ブランチ名を`specs/<アプリ名>/<機能名>/`のパスで絞り込む。それでも複数残る、またはどれが自分の続きか判断できない場合は、推測でどれかを選ばず候補一覧をユーザーに提示して確認する。1件に絞れた場合、それが「自分がこれから進める工程の一つ前の工程が作ったもの」(例: /requirementが作った`feature/<機能名>`ブランチに/designで続きを積む場合)であればそれは重複ではないので、そのブランチをcheckoutして続行する。それ以外(既に先の工程まで進んでいる、または別セッション・別人の作業)は作業を始めずユーザーに報告する(この項は requirement/design/fix/implementation の4Skillに同文で記載。変更時は揃って更新する)
- 仕様の承認を得てから着手する(3点セットの仕様承認PRがマージ済みであること。承認前はコード・テストを書かない。運用は[/pr](../pr/SKILL.md)の仕様承認ゲートを参照)。3点セットが未作成なら[/requirement](../requirement/SKILL.md)から、作成済みで未承認なら[/spec-review](../spec-review/SKILL.md)→[/pr](../pr/SKILL.md)から始める
- `feature/<機能名>` ブランチを切る(mainでは作業しない)。別の機能の作業と並行する場合は[parallel-work](../parallel-work/SKILL.md)(worktree)で作業ディレクトリを分ける
- 対象アプリが`specs/<アプリ名>/architecture.md`を持つ場合、ブランチを切った直後に機能マップの該当spec行の状態を「実装中」に更新してコミットする(未着手→着手の切り替わりを記録する。詳細は[architecture-workflow](../architecture-workflow/SKILL.md)の「更新タイミング」参照)。更新後の機能マップをこの前提確認の報告に貼って提示する

# 実施方法(メインスレッド or implementerエージェント)

通常はメインスレッドが本Skillの手順で直接実装する(実装中の判断をユーザーと対話しながら進められるため)。次の場合はimplementerエージェント(`.claude/agents/implementer.md`)に実装を委譲できる(役割分担の背景は[docs/adr/0002](../../../docs/adr/0002-skill-agent-separation.md)を参照):

- [parallel-work](../parallel-work/SKILL.md)で複数機能を並行開発していて、一方の実装を任せたいとき
- tasks.mdが十分に詳細で、対話なしで完走できる見込みが高いとき

委譲する場合は対象specと作業するfeatureブランチ(またはworktree)を伝えて起動する。エージェントは仕様との食い違いに気づくと実装を中断して報告を返すので、ユーザーに確認してから再開する。コミット・PR作成・動作確認の案内はメインスレッドが行う。

# Next.js固有の挙動差分

AGENTS.mdの指示でコードから読み取れないNext.js固有の挙動差分を調べる場面があれば、実装に入る前に[references/nextjs-notes.md](references/nextjs-notes.md)を確認する(既知の差分ならドキュメントを読み直さずに済む)。そこに載っていない新たな差分に気づいたら、実装の完了までに同ファイルへ追記する。

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

画面(UI)に変更がある場合は、動作確認後もdevサーバーをバックグラウンドで起動したままにする(起動コマンドは[run-benriyatool](../run-benriyatool/SKILL.md)の「起動」を流用してよい)。バックエンドのみの変更(API・ロジックのみでUIに変更がない)場合は不要。

## 共通部品(chrome)を変更したときのstyleguide.png撮り直し

ヘッダー・フッター・ナビなどアプリ共通の部品(chrome)や、`app/<アプリ名>/styleguide/page.tsx`に並べた共通部品を追加・変更したら、**同じコミットで`styleguide.png`を撮り直す**(古い画像が実装と食い違ったまま残らないように。図・キャプチャだけが古くなるのを禁じる方針は[architecture-workflow](../architecture-workflow/SKILL.md)と同じ)。撮り方は[run-benriyatool](../run-benriyatool/SKILL.md)の「スタイルガイドのキャプチャ」を参照。個別のコンテンツ画面だけの変更(共通部品に触れていない)では不要。

# 完了時の次ステップ案内

全タスク完了・テスト・動作確認が済んだら、[/implementation-review](../implementation-review/SKILL.md)(コードレビュー)へ進むことを案内する。

画面(UI)に変更がある場合は、この案内にアクセスURL(例: `http://localhost:3000/ikukyu`。差分箇所が複数ページにまたがる場合はすべて列挙する)を明記し、ユーザー自身がブラウザで見た目を確認できるようにする(コードレビューだけでは見た目の変化は分からないため)。

この時点の成果物(実装・テスト)はコミット済みのため、ここでcompactや新しいセッションへの切り替えを行っても支障はない。新しいセッションの名称と次のセッションにそのまま貼り付けられるプロンプトを、1行目=名称・2行目=プロンプトの単一のコードブロックとして毎回提示してから終える(名称とプロンプトを分けて提示しない。「セッションを閉じても大丈夫」とだけ述べて済ませない。名称は前のセッションと同じ<機能名>に次工程名を()で添えた形。1行目の例: `<機能名>(コードレビュー)` / 2行目の例: `/implementation-review を実行してください。対象ブランチは feature/<機能名>です。`)。