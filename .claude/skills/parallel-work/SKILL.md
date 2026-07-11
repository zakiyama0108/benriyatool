---
name: parallel-work
description: 2つ以上の機能開発・修正を並行して進めるときに使う。git worktreeで作業ディレクトリを分ける手順、並行してよい作業の条件、worktree運用時の注意事項(node_modules・.env.local・ポート衝突・掃除)を扱う。
---

> ワークフロー上の位置: 工程Skillから参照される知識Skill。並行作業を始めるとき・終えるときに参照する(単独のワークフロー工程ではない)

# いつ使うか

**1つの作業ディレクトリで`git checkout`によるブランチ切り替えを往復しない。** 2つ以上の機能を並行して進めたくなったら、機能ごとにgit worktreeで作業ディレクトリ自体を分ける。

典型的なきっかけ:
- 仕様承認PR・実装PRの承認待ちの間に、別の機能の作業を始めたい
- 機能開発の途中で、緊急のバグ修正([/fix](../fix/SKILL.md))が割り込んだ

1つの機能を最初から最後まで順番に進めるだけなら、worktreeは不要(通常どおりメインの作業ディレクトリでfeatureブランチを切る)。

# 並行してよい作業の条件

worktreeで解決できるのはブランチ切り替えの混乱だけで、**同じファイルを両方で変更すればマージ時にコンフリクトする**。並行を始める前に以下を確認する:

- 触るファイルが重ならないこと。別アプリ同士(`specs/`・`app/`・`__tests__/`のアプリ名フォルダが異なる)なら安全。同じアプリの別機能は、共有する`lib/`・`components/`を両方が変更しないか先に確認する
- サイト共通部分(`app/components/`・ルーティング・共通レイアウト)を変更する作業は、他の作業と並行しない
- 実装フェーズ(コード変更)を2本同時に走らせるより、「片方は仕様フェーズ(承認待ち)・もう片方は実装フェーズ」とフェーズをずらすほうが安全

# 進め方

## 1. worktreeを作る

リポジトリの隣に`benriyatool-<機能名>`という名前でディレクトリを作る(ブランチ名の`feature/<機能名>`と揃える):

```bash
git worktree add ../benriyatool-<機能名> -b feature/<機能名>
```

## 2. 作業環境を整える

Git管理外のファイルはworktreeに引き継がれないため、新しいworktreeごとに用意する:

```bash
cd ../benriyatool-<機能名>
cp ../benriyatool/.env.local .   # 環境変数(Supabase接続情報など)をコピー
npm install                       # node_modulesはworktreeごとに必要
```

## 3. セッションとworktreeを1対1にする

worktreeごとにClaude Codeのセッション(VSCodeウィンドウ)を1つ開き、そのセッションでは他のworktree・他のブランチを触らない。「1 worktree = 1ブランチ = 1セッション」を守ることが、切り替え混乱を防ぐ核になる。

各worktree内の進め方は通常と同じ(該当する工程Skillに従う)。

## 4. マージ後に取り込む・掃除する

- 片方のPRがmainにマージされたら、続行中のworktreeでは`git fetch origin && git rebase origin/main`でmainの変更を取り込んでから作業を続ける
- 作業がすべて終わったworktreeは削除する([/release-check](../release-check/SKILL.md)のStep3に組み込まれている):

```bash
git worktree remove ../benriyatool-<機能名>
```

# 注意事項

- **同じブランチを複数のworktreeでチェックアウトできない**(Gitの仕様)。「fatal: '...' is already used by worktree」が出たら、そのブランチは別のworktreeが使っている
- **`npm run dev`のポート衝突**: 複数のworktreeで同時に開発サーバーを起動する場合、2つ目以降は`npm run dev -- -p 3001`のようにポートをずらす
- **削除は`git worktree remove`で行う**。ディレクトリを`rm -rf`で直接消すとGit側に登録が残る(残ってしまった場合は`git worktree prune`で整理する)
- worktreeの一覧は`git worktree list`で確認できる。迷子になったらまずこれを実行する