#!/usr/bin/env node

// リポジトリ内の全Markdown中の ```mermaid コードブロックを走査し、
// flowchart/graph のエッジラベル(パイプ記法 `|...|`)に半角の括弧類 ()[]{}<> が
// 含まれていないかを検査する静的チェッカー。
//
// なぜ必要か: Mermaidはエッジラベル内の半角 `(` 等をノード形状の開始と誤認し、
// `Parse error ... got 'PS'` で図全体が描画できなくなる(ノードラベルは `["..."]` で
// 括られているため半角でも壊れないが、パイプのエッジラベルは括られていない)。
// 目視・レビューでは見落とされやすく実際に複数の図が壊れていたため、CIで機械的に落とす。
// 対処: エッジラベル内の括弧は全角 `（）` にするか、`|"..."|` のように二重引用符で括る
// (書き方ルールは .claude/skills/architecture-workflow/SKILL.md「Mermaidの書き方ルール」)。
//
// 対象は flowchart/graph のパイプラベルのみ(sequence/er/state等の `:` ラベルや
// ノード定義 `id[...]` は形状誤認の対象外なので検査しない)。
// 実行: npm run check:mermaid

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// 走査から除外するディレクトリ(依存・ビルド生成物・他worktree・git内部)
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'coverage', '.vercel'])

function walkMarkdown(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) return []
      // .claude/worktrees 配下は別ブランチの作業コピーなので走査しない
      if (full.includes(path.join('.claude', 'worktrees'))) return []
      return walkMarkdown(full)
    }
    return /\.mdx?$/.test(entry.name) ? [full] : []
  })
}

// パイプ記法のエッジラベル `|...|` を抜き出す正規表現(1行に複数あってもよい)
const PIPE_LABEL = /\|([^|]*)\|/g
// 描画を壊す半角括弧類
const FORBIDDEN = /[()[\]{}<>]/

const violations = []

for (const file of walkMarkdown(ROOT)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n')
  let inMermaid = false
  let isFlow = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!inMermaid) {
      if (trimmed === '```mermaid') {
        inMermaid = true
        isFlow = false
      }
      continue
    }
    if (trimmed === '```') {
      inMermaid = false
      continue
    }
    // ブロック先頭の図種別を判定(flowchart/graph のときだけパイプラベルを検査)
    if (!isFlow && trimmed) {
      const kind = trimmed.split(/\s+/)[0]
      if (kind === 'flowchart' || kind === 'graph') isFlow = true
    }
    if (!isFlow || trimmed.startsWith('%%')) continue
    for (const m of line.matchAll(PIPE_LABEL)) {
      const label = m[1]
      if (FORBIDDEN.test(label)) {
        violations.push({
          file: path.relative(ROOT, file),
          line: i + 1,
          label: label.trim(),
        })
      }
    }
  }
}

if (violations.length > 0) {
  console.error('❌ Mermaidのエッジラベルに、描画を壊す半角括弧類 ()[]{}<> が含まれています。')
  console.error('   全角 （） にするか、|"..."| のように二重引用符で括ってください。')
  console.error('   (詳細: .claude/skills/architecture-workflow/SKILL.md「Mermaidの書き方ルール」)\n')
  for (const v of violations) {
    console.error(`  - ${v.file}:${v.line}  |${v.label}|`)
  }
  console.error(`\n合計 ${violations.length} 件`)
  process.exit(1)
}

console.log('✅ Mermaidのエッジラベルに描画を壊す半角括弧はありません。')
