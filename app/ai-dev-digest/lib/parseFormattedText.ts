// 観点の詳細文(detail)に含まれる簡易Markdown記法を解析する(仕様: article-detail/requirements.md
// #記事本文表示-15、content-generation/requirements.md#要約-12)。対応するのは番号付きリスト
// (「1. 」「2. 」...)・箇条書き(「- 」)・コードブロック(```...```)・段落(空行区切り)の4ブロックと、
// インライン記法としてコード(`...`)・リンク([表示文字](URL))のみ(それ以外のMarkdown記法は
// 意図的に非対応。活用法の手順・コピペ用コマンド・参照URLを見やすく示すための最小限の実装)

export type InlineNode = { type: 'text'; text: string } | { type: 'code'; text: string } | { type: 'link'; text: string; href: string }

export type Block =
  // startはコードブロック等で中断された番号付きリストが再開するときの開始番号(例: 1. 2. (コード) 3. の
  // 「3」)。先頭から始まる通常のリスト(1.から始まる)ではHTMLの既定値と同じため省略する
  | { type: 'paragraph'; inline: InlineNode[] }
  | { type: 'orderedList'; items: InlineNode[][]; start?: number }
  | { type: 'unorderedList'; items: InlineNode[][] }
  | { type: 'code'; code: string }

const ORDERED_ITEM = /^\s*(\d+)\.\s+(.*)$/
const UNORDERED_ITEM = /^\s*[-・]\s+(.*)$/
const CODE_FENCE = /^```/

// インライン記法(`コード`・[表示文字](URL))を解析する。前後関係のないテキストは単一のtextノードにする
export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = []
  // `code` または [text](url) にマッチする。どちらにもマッチしない区間はそのままtextとして拾う
  const pattern = /`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    if (match[1] !== undefined) {
      nodes.push({ type: 'code', text: match[1] })
    } else {
      nodes.push({ type: 'link', text: match[2], href: match[3] })
    }
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < text.length) nodes.push({ type: 'text', text: text.slice(lastIndex) })
  return nodes
}

// detail文字列全体をブロック単位に分解する
export function parseFormattedText(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    if (CODE_FENCE.test(line)) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !CODE_FENCE.test(lines[i])) {
        codeLines.push(lines[i])
        i++
      }
      i++ // 閉じの```をスキップ(対応する閉じがない場合はそのまま末尾まで読んだ扱いにする)
      blocks.push({ type: 'code', code: codeLines.join('\n') })
      continue
    }

    if (ORDERED_ITEM.test(line)) {
      const items: InlineNode[][] = []
      let start: number | undefined
      let isFirstItem = true
      while (i < lines.length && ORDERED_ITEM.test(lines[i])) {
        const m = ORDERED_ITEM.exec(lines[i])!
        // 先頭項目の番号が1でない場合のみstartを持たせる(コードブロック等で中断された
        // リストの再開箇所。1から始まる通常のリストはHTMLの既定値と同じため省略する)
        if (isFirstItem && Number(m[1]) !== 1) start = Number(m[1])
        isFirstItem = false
        items.push(parseInline(m[2]))
        i++
      }
      blocks.push(start !== undefined ? { type: 'orderedList', items, start } : { type: 'orderedList', items })
      continue
    }

    if (UNORDERED_ITEM.test(line)) {
      const items: InlineNode[][] = []
      while (i < lines.length && UNORDERED_ITEM.test(lines[i])) {
        const m = UNORDERED_ITEM.exec(lines[i])!
        items.push(parseInline(m[1]))
        i++
      }
      blocks.push({ type: 'unorderedList', items })
      continue
    }

    // 通常の段落: 空行・リスト・コードフェンスが出てくるまで同じ段落として連結する
    const paragraphLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !ORDERED_ITEM.test(lines[i]) &&
      !UNORDERED_ITEM.test(lines[i]) &&
      !CODE_FENCE.test(lines[i])
    ) {
      paragraphLines.push(lines[i])
      i++
    }
    blocks.push({ type: 'paragraph', inline: parseInline(paragraphLines.join(' ')) })
  }

  return blocks
}
