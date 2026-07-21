---
name: notion-md-sync
description: リポジトリ内のMarkdownファイル(specs/・docs/・README/CLAUDE.md/AGENTS.md・.claude/skills・.claude/agentsなど)をNotionにフォルダ構造ごと同期するときに使う。「MDをNotionに同期して」「ドキュメントの変更をNotionに反映して」といった依頼に対応する。
---

> ワークフロー上の位置: 開発フローとは独立したユーティリティSkill。作業の区切りやユーザーの依頼時に単発で使う(遷移先なし)

# いつ使うか

リポジトリ内のMarkdownドキュメント(仕様書・設計ドキュメント・Skill/Agent定義など)をNotion上でも横断的に閲覧・検索できるようにしたいとき。典型的なきっかけ:

- ユーザーから「MDをNotionに同期して」「ドキュメントの変更をNotionに反映して」と依頼された
- specs/・docs/配下やSkill定義に大きな変更を加えた後、Notion側にも反映しておきたい

自動では実行されない(手動実行のみ)。ファイル変更のたびに自動反映されるわけではないので、反映したいタイミングでユーザーが都度依頼する。

# 対象範囲

`git ls-files '*.md'` で取得できるリポジトリ管理下の全Markdownファイル(約61件、2026-07-20時点)。`.agents/`(`.gitignore`対象のローカル専用コピー)や`node_modules/`配下は対象外(そもそも`git ls-files`に出てこない)。

# Notion側の構造

ルートページ「べんりやつーる Docs」の配下に、リポジトリのディレクトリ構造をそのままNotionのページ階層として再現する。ファイル1つ = 1ページ、ディレクトリ1つ = コンテナページ。

```
べんりやつーる Docs (ルートページ)
├ .claude
│  ├ agents
│  │  └ code-reviewer.md 等 (ページ)
│  └ skills
│     ├ README.md (ページ)
│     └ fix / requirement / ... (Skillごとのディレクトリページ)
│        └ SKILL.md (ページ)
├ docs
│  ├ adr
│  └ architecture
├ specs
│  ├ hub-site
│  ├ ikukyu (architecture.md 直下 + admin/guide/save-result/simulator)
│  ├ legal
│  └ life-money-sim (architecture.md 直下 + admin/asset-projection/monthly-balance/save-result)
├ supabase
│  └ migrations
├ AGENTS.md / CLAUDE.md / README.md (ページ、ルート直下ファイル)
```

- ページ本文はMarkdownファイルの内容をそのまま転記する(要約しない。session-reportのNotion運用と同じ方針)
- ページ外に置けるプロパティはタイトルのみ(データベースではないため)。パス情報はページ階層そのものが表現する

# 状態管理: sync-state.json

このSkillディレクトリ内の `sync-state.json` に、前回同期時の状態を保持する。**このファイルはリポジトリにコミットする**(Notionのページ ID はリンク情報であり秘匿情報ではない。コミットしておくことで別セッション・別マシンからの再実行でも重複ページを作らずに済む)。

```json
{
  "rootPageUrl": "https://app.notion.com/p/xxxx",
  "lastSyncedAt": "2026-07-20T00:30:00+09:00",
  "pages": {
    ".": { "id": "<ルートページID>", "type": "dir" },
    "specs": { "id": "<page-id>", "type": "dir" },
    "specs/life-money-sim/asset-projection": { "id": "<page-id>", "type": "dir" },
    "specs/life-money-sim/asset-projection/requirements.md": { "id": "<page-id>", "type": "file", "hash": "<sha256>" }
  }
}
```

- `type: "dir"` のエントリに `hash` は持たない
- `type: "file"` のエントリの `hash` は `shasum -a 256 <path>` で計算したファイル内容のハッシュ。次回同期時にこのハッシュと比較して変更有無を判定する
- 削除されたファイルは `"type": "deleted"` に書き換えて残す(同じキーで再度ファイルが復活した場合に同じNotionページを使い回すため)

# 進め方

## 1. Notion接続を確認する

ToolSearchで `notion` を含むツール(search / fetch / create-pages / update-page など)が使えるか確認する。使えない場合は同期を中止し、その旨をユーザーに報告する。

## 2. 対象ファイルと変更点を洗い出す

1. `git ls-files '*.md'` で現在のファイル一覧を取得する
2. `sync-state.json` を読む(存在しなければ「初回同期」として全ファイルを新規扱いにする)
3. 各ファイルについて `shasum -a 256 <path>` でハッシュを計算し、`sync-state.json` の記録と比較する
   - `sync-state.json` に無い → 新規
   - ハッシュが違う → 更新
   - ハッシュが同じ → スキップ(対象外)
4. `sync-state.json` に `type: "file"` で存在するが `git ls-files` に無くなったパス → 削除

変更が1件もなければ、その旨をユーザーに報告して終了する。

## 3. ディレクトリページを解決する(新規・更新分のみ)

新規・更新対象ファイルそれぞれについて、ルートから順にディレクトリの祖先を辿り、`sync-state.json` に無いディレクトリページを作成する(親から順に。兄弟ディレクトリ・兄弟ファイルはまとめて1回の `notion-create-pages` 呼び出しで作成してよい)。ディレクトリページの本文は簡潔な索引(配下の項目を箇条書きで列挙)でよい。

作成したディレクトリページのIDは即座に `sync-state.json` に記録する(このあとのファイルページ作成で親IDとして使うため)。

## 4. ファイルページを作成・更新する

- **新規**: 対象ファイルの内容をReadで読み、解決済みの親ディレクトリページを parent にして `notion-create-pages` でページを作成する(content はファイル内容全文。ページタイトルはファイル名をそのまま使う。同名ファイルが別ディレクトリに複数ある場合は階層で区別されるのでタイトルは単純なファイル名でよい)
- **更新**: `sync-state.json` のIDに対して `notion-update-page` の `replace_content` でファイル内容全文を反映する
- **削除**: このツールセットにページのアーカイブ/削除コマンドが無いため、`notion-update-page` の `update_properties` でタイトル先頭に `[削除済み] ` を付け、`replace_content` で本文を「このファイルはリポジトリから削除されました(同期日時: <ISO日時>)」に置き換える

各ページ作成・更新のたびに `sync-state.json` を更新する(途中で失敗しても再実行時に重複作成しないため、逐次書き込みが望ましい)。

## 5. sync-state.jsonを確定し、コミットを促す

`lastSyncedAt` を現在時刻に更新して保存する。作業完了後、`sync-state.json` の変更を確認できるよう `git status` を示し、コミットするかどうかをユーザーに確認する(このSkillは自動コミットしない)。

## 6. 結果を報告する

- 新規作成・更新・削除マークしたファイル数
- ルートページのURL(`べんりやつーる Docs`)
- スキップ理由(Notion未接続など)があればそれも報告する

# 注意事項

- 秘密情報(APIキー・.env・Supabase接続情報など)を含むMDファイルは無いことを前提にしているが、念のため内容に秘密情報らしき文字列がないか目視確認してから転記する
- 61ファイル規模の初回同期はNotion API呼び出しが多く時間がかかるため、バックグラウンドで実行してよい
- 大規模リネーム(ディレクトリ移動を伴うもの)は現状「削除マーク+新規作成」で扱う(Notion側にページ移動コマンドが無いため)。同一ディレクトリ内のファイル名変更のみなら `update_properties` でタイトルを変更し、`sync-state.json` のキーを付け替えて同じページを使い回してよい
- ファイル数が将来大きく増えた場合は、フォルダ階層方式ではなくデータベース方式(session-reportのClaude Reportと同じ、パスプロパティで管理)への切り替えも検討する
