---
name: session-report
description: セッションでの作業内容・議論を要約し、公開価値判定に基づいてObsidian(必須)とNotion(条件付き)にレポートを保存するときに使う。「レポートにして」「今回の内容をまとめて」といった依頼に対応する。
---

> ワークフロー上の位置: 開発フローとは独立したユーティリティSkill。作業の区切りやユーザーの依頼時に単発で使う(遷移先なし)

# いつ使うか

セッションで行った作業・議論・意思決定を、後から読み返せる形で残したいとき。典型的なきっかけ:

- 機能開発やPRが一段落し、経緯と学びを記録したい
- 壁打ち(/consult)や調査で得た結論を忘れないうちに残したい
- ユーザーから「レポートにして」「まとめてObsidianに置いて」と依頼された

# 保存先

## Obsidian(常に保存する)

```
/Users/ryosukeyamazaki/Library/Mobile Documents/iCloud~md~obsidian/Documents/Claude-Report/
```

- パスにスペースを含むため、Bashで扱う場合は必ずクォートする(Writeツールで直接書くのが確実)
- ファイル名: `YYYY-MM-DD_<タイトルの短い要約>.md`(例: `2026-07-13_worktree強制hookの導入.md`)
- 同日に同テーマのレポートが既にある場合は上書きせず `_2` を付けて別ファイルにする

## Notion(公開価値判定が★★★☆☆以下の場合のみ)

Notion MCP Connector(claude.ai の Settings → Connectors)経由で接続する。データベース名は「Claude Report」。書き込み手順は本ファイル末尾の「Notion書き込み手順」を参照。

# 進め方

1. **Notion接続を確認する**: ToolSearchで `notion` を含むツール(search / fetch / create-pages / update-page / create-database など)が使えるか確認する。使えない場合はNotion保存をスキップし、Obsidianのみで完結させる(その旨をユーザーに報告する)
2. **セッションを振り返る**: 何がきっかけで始まり、何を作り・決め、何が未解決かを整理する。ツールの実行ログではなく「読者(未来の自分)が知りたいこと」を選ぶ
3. **タイトルを付ける**: 内容が一言でわかる具体的なタイトル(「作業メモ」のような汎用語は避ける)
4. **下のレポートテンプレートで本文を作成する**: 該当しないセクション(記事化する場合など)は条件を満たさなければ削ってよい
5. **Obsidianに保存する**: Writeツールで保存先パスに書き込む
6. **最終判定がOBSIDIAN + NOTIONの場合、Notionにも保存する**: 「Notion書き込み手順」に従う。Notion側の書き込みに失敗してもObsidian保存は独立して成功させ、失敗した旨をユーザーに報告する(Notionは必須ではない)
7. **保存結果をユーザーに報告する**: Obsidianのフルパス、該当すればNotionページのURLを伝える

# レポートテンプレート

```markdown
# <タイトル>

## 概要

(3〜5行程度で要約する)

## 本文

(見出しを適切に分割する。コードはコードブロック、表はMarkdown形式で記載する。判断の分かれ道と選んだ理由を含める)

## まとめ

(重要ポイントを箇条書きで整理する)

## タグ

(例: AI / Claude Code / AWS / Terraform)

## 公開価値判定

★★★★★ 〜 ★☆☆☆☆ の5段階評価(★★★★★:そのまま記事化推奨 〜 ★☆☆☆☆:備忘録・ログ向け)

## 判定理由

(誰に価値があるか / 検索需要 / 独自性 / 実体験・検証内容 / 長期的に読まれるか、の観点で説明する)

## 記事化する場合(★★★★☆以上のときのみ記載)

- 想定タイトル(SEO意識、5件)
- 想定読者
- 検索キーワード候補(10〜20件)
- 記事構成(H2・H3レベル)
- 記事化時の改善点

(公開用の本文プローズはここでは生成しない。プラットフォームごとに体裁が異なるため、実際に記事化するときに別途書き起こす)

### 既定のビジュアルデザイン

実際に記事化する際は「リファレンス・ドキュメント調」を既定のデザインとする(2026-07-19決定): 左サイドバーにTOC、右カラムに本文、info/warningのコールアウトボックスで注意点を明示、コードブロックにファイル名バー付き、アクセントカラーは薄紫系(#5b5bd6)。

ただし題材の性質によっては以下も検討する:

- エッセイ・思考の記録寄りの題材: 中央寄せの狭いカラム + ドロップキャップ + プルクオートの文芸調
- 実装ログ寄りの題材: 等幅見出し + ログ調セクションラベル + NOTE注意書き中心の実装ノート調

## 保存先判定

- パターンA(★★★★☆以上): Obsidian(必須)+ 記事化対象。Notion保存は不要
- パターンB(★★★☆☆以下): Obsidian(必須)+ Notion(閲覧・検索用)。記事化は不要

## 最終判定

- ARTICLE: YES または NO
- DESTINATION: OBSIDIAN / OBSIDIAN + NOTION / OBSIDIAN + ARTICLE
```

# Notion書き込み手順(パターンBの場合)

## 1. データベースの有無を確認する

```
mcp__claude_ai_Notion__notion-search
  query: "Claude Report"
  query_type: "internal"
```

- 結果が見つかった場合: `mcp__claude_ai_Notion__notion-fetch` でそのデータベースを取得し、`<data-source url="collection://...">` のIDとプロパティ名を確認する(プロパティ名は日本語の表記ゆれがありうるため、必ず実際のスキーマに合わせる)
- 見つからない場合: 下記2で新規作成する

## 2. データベースが無い場合は新規作成する

```
mcp__claude_ai_Notion__notion-create-database
  title: "Claude Report"
  schema: |
    CREATE TABLE (
      "タイトル" TITLE,
      "日付" DATE,
      "タグ" MULTI_SELECT('AI':blue, 'Claude Code':purple, 'AWS':orange, 'Terraform':green),
      "公開価値判定" SELECT('★★★★★':red, '★★★★☆':orange, '★★★☆☆':yellow, '★★☆☆☆':gray, '★☆☆☆☆':default),
      "Obsidianパス" RICH_TEXT
    )
```

- `parent` は省略してワークスペース直下に作成する
- 戻り値の `<data-source url="collection://<ID>">` からdata source IDを控える(次のページ作成で使う)
- タグ・公開価値判定の選択肢は例であり、既存にない値を使う場合はNotion側が自動追加する。うまく追加されない場合は先に `mcp__claude_ai_Notion__notion-update-data-source` でオプションを追加してからページを作成する

## 3. ページを作成する

```
mcp__claude_ai_Notion__notion-create-pages
  parent: { type: "data_source_id", data_source_id: "<1または2で確認したID>" }
  pages: [{
    properties: {
      "タイトル": "<レポートタイトル>",
      "日付": "<YYYY-MM-DD>",
      "タグ": ["<タグ1>", "<タグ2>", ...],
      "公開価値判定": "<★の数>",
      "Obsidianパス": "<Obsidianに保存したファイルのフルパス>"
    },
    content: "<Obsidianに書いたレポート本文全文(概要・本文・まとめ・タグ・公開価値判定・判定理由)をそのまま転記する。要約に短縮しない>"
  }]
```

- 日付プロパティの値の渡し方でエラーが出た場合、`notion-update-page` と同様に `date:日付:start` 形式のキー分割が必要な可能性がある。まず素直な形式で試し、失敗したら1で取得したスキーマ表示を確認して合わせる
- 作成後に返るページURLをユーザーへの報告に含める

# 注意事項

- レポートは**リポジトリ外**(iCloudのObsidian vault、およびNotion)に置くため、featureブランチ・PRは不要。依頼されたらその場で書いてよい
- 秘密情報(APIキー・.env・Supabase接続情報など)をObsidian・Notionいずれにも書かない
- 会話に登場した数値・URL・ファイルパスは正確に転記する(記憶で書かず、会話ログ・実ファイルを確認する)
- Notionには要約ではなく本文全文を転記する(閲覧・検索用の補助であっても内容を省略しない)。ただし正本はObsidian側であり、編集・修正は常にObsidian側に対して行い、内容に食い違いが出た場合はObsidian側を正とする
