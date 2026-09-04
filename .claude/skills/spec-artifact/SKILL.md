---
name: spec-artifact
description: 要件定義・設計・アーキテクチャ・ADRなどの仕様ドキュメントを作成・更新し終えたときに、内容をHTMLのArtifactとして発行し外部ブラウザで開くまでの共通手順。/requirement・/design・/fix・architecture-workflowの完了時に必ず実施する。
---

> 位置づけ: 知識Skill(工程Skillから参照される)。参照元は [/requirement](../requirement/SKILL.md)、[/design](../design/SKILL.md)、[/fix](../fix/SKILL.md)、[architecture-workflow](../architecture-workflow/SKILL.md)。

# 何のための手順か

仕様ドキュメントはMarkdownで書かれ、リポジトリ上のMarkdownが**常に正本**。ただしMarkdownのままではMermaid図が描画されず、3点セットが複数ファイルに分かれているためレビュー時に読みにくい。そこで**書き終えた直後に、読む用のHTMLページ(Artifact)を発行して外部ブラウザで開く**ところまでを、仕様ドキュメント作成の完了条件に含める。

Artifactは閲覧用のコピーであり正本ではない。内容の誤りを見つけたら**Markdown側を直してから再発行する**(Artifactだけを直さない)。

# 必ず実施するタイミング

以下の工程で仕様ドキュメントを作成・更新したら、コミット・push を済ませたうえで発行する(ユーザーに実施の可否を聞かない。これは既定動作)。

| 工程 | 発行するページ |
|---|---|
| [/requirement](../requirement/SKILL.md) 完了時(requirements.md作成後) | 機能specページ(この時点ではrequirements.mdの章だけ) |
| [/design](../design/SKILL.md) 完了時(design.md・tasks.md作成後) | 同じ機能specページを**同じURLへ更新**(design/tasksの章が加わる) |
| [/fix](../fix/SKILL.md) Step2 で3点セットを更新した場合 | 同じ機能specページを同じURLへ更新 |
| [architecture-workflow](../architecture-workflow/SKILL.md) でarchitecture.mdを新規作成・更新したとき | アプリのアーキテクチャページ |
| ADR(`docs/adr/`・`specs/<アプリ名>/adr/`)を追加したとき | ADRページ(1件=1ページ) |

[/spec-review](../spec-review/SKILL.md)・[/resolve](../resolve/SKILL.md)で仕様書に修正が入った場合も、レビュー対応の完了報告の前に同じURLへ再発行して最新化する。

# ページの単位とタイトル

1ページ=1つの成果物のまとまり。タイトルはそのページの識別子なので、**一度決めたら変えない**(再発行時に同じページを見つける手がかりになる)。

| 対象 | ページ単位 | `<title>` | favicon(初回のみ) |
|---|---|---|---|
| 機能spec | `specs/<アプリ名>/<機能名>/` の3点セットをまとめて1ページ | `<アプリ名>/<機能名> 仕様` | 📋 |
| アーキテクチャ | `specs/<アプリ名>/architecture.md` | `<アプリ名> アーキテクチャ` | 🏗️ |
| ADR | ADR 1件 | `ADR <番号> <ADRのタイトル>` | 🧭 |

HTMLファイルはスクラップパッド配下に置き、ファイル名も固定する(同一セッション内で同じパスに書けば同じURLへ再発行される)。

- 機能spec: `<scratchpad>/spec-<アプリ名>-<機能名>.html`
- アーキテクチャ: `<scratchpad>/arch-<アプリ名>.html`
- ADR: `<scratchpad>/adr-<番号>.html`

# 手順

1. **`artifact-design` Skillを読む**(HTMLを書き始める前に必須)
2. **既存ページの有無を確認する。** 別セッションで既に発行済みのことがあるため、`Artifact` の `action: "list"` で上表のタイトルに一致するページを探す。見つかったら `action: "read"` で現在の内容を読んでから、`url` を指定して発行する(URLを増やさない)。見つからなければ新規発行する(`favicon` は新規発行のときだけ渡す)
3. **HTMLを書く**(次節「中身の作り方」)
4. **発行する**(`Artifact` publish)。`description` にはそのページの1文要約を渡す
5. **外部ブラウザで開く**: `open "<発行されたURL>"` を実行する
6. **チャットにURLを提示する。** URLは行末に置き、直後に文字を続けない(`補足: <URL>` の形か `[表示文字](<URL>)` 記法。CLAUDE.md「応答の書き方」参照)

# 中身の作り方

- **Markdownの内容をそのまま載せる。要約・言い換えをしない。**正本はMarkdownであり、Artifactは同じ内容を読みやすく組んだもの。`[n]` 採番・見出し名・出典の記載はそのまま保持する(採番が変わるとテストの仕様コメントとの対応が読み取れなくなる)
- **Mermaid図は `<pre class="mermaid">` にコードをそのまま入れる。** Artifactはmermaidをネイティブに描画するので、ライブラリの読み込みは不要
- 機能specページは requirements / design / tasks を章立て(またはタブ)で切り替えられるようにし、冒頭にそのspecのサマリと目次を置く。まだ作成していないドキュメントの章は「未作成」と明示する(空欄で放置しない)
- ステータス行(`> ステータス: 仕様確認中(未実装)`)は目立つ位置に残す。承認前の仕様であることが一目で分かるようにするため
- tasks.md のチェックボックスは進捗が分かる形(チェック済み/未着手)で表示する
- 表・Mermaid・コードブロックは横スクロールできるコンテナに入れる(ページ全体を横スクロールさせない)

# やらないこと

- **Artifactを正本にしない。** 仕様の変更はMarkdownを直し、再発行で追随させる
- **新しいURLを増やさない。** 同じspecの更新は必ず既存URLへ再発行する(`list` → `read` → `url` 指定)
- **faviconを付け替えない。** 再発行時は `favicon` を渡さない
- Artifactの発行に失敗した場合も工程は止めない。失敗した旨と原因を報告し、Markdownのパスを案内する
