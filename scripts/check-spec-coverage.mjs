#!/usr/bin/env node

// specs/**/{requirements,design}.md の各仕様項目(見出し・表の1行)に対して、
// __tests__ 配下の `// 仕様: specs/.../requirements.md#見出し` コメントで
// 紐づくテスト(describe / it)が存在するかを一覧表示するチェッカー。
// テストが不要と判断した項目は scripts/spec-coverage-skip.json に追記するとスキップ扱いになる。
// 実行するたびに内容が変わる生成物のため、レポートはgit管理しない(.gitignore参照)。
// 実行: npm run check:spec-coverage

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SPECS_DIR = path.join(ROOT, 'specs')
const TESTS_DIR = path.join(ROOT, '__tests__')
const REPORT_PATH = path.join(ROOT, 'spec-coverage-report.md')
const SKIP_LIST_PATH = path.join(__dirname, 'spec-coverage-skip.json')

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

// 空白・全角空白・括弧類を除去し、見出しとコメント側の表記ゆれを吸収する
function normalize(text) {
  return text.replace(/[\s　()（）[\]「」『』{}]/g, '')
}

// Markdownの表セルに埋め込むため、パイプをエスケープし改行を<br>に変換する
function toCellText(text) {
  if (!text) return ''
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
}

// 「| a | b |」形式の行を、\| エスケープを区切りとして扱わずにセル配列へ分割する
// (分割後は \| を生の | に戻す。表への出力時は toCellText() が改めてエスケープする)
function splitTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'))
}

function isTableStart(lines, i) {
  const isRow = /^\s*\|.*\|\s*$/.test(lines[i] ?? '')
  const nextIsSeparator = /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')
  return isRow && nextIsSeparator
}

// 見出し直下から「次の見出し or 次の表」の手前までを本文として集める。
// コードフェンス(```)行は、1セル1行に詰め込む際にバッククォートが<br>を越えて
// 意図せずペア判定され表示が崩れる原因になるため取り除く(中身のコードはそのまま残す)。
function collectHeadingBody(lines, startIdx) {
  const bodyLines = []
  for (let k = startIdx; k < lines.length; k++) {
    if (/^#{1,6}\s/.test(lines[k])) break
    if (isTableStart(lines, k)) break
    if (/^\s*```/.test(lines[k])) continue
    bodyLines.push(lines[k])
  }
  return bodyLines.join('\n').trim()
}

// design.md から「## / ### 見出し(概要=見出し文, 詳細=本文)」と
// 「表の行(概要=1列目, 詳細=残りの列をヘッダー名付きで)」を仕様項目として抽出する
function extractSpecItems(mdPath) {
  const lines = fs.readFileSync(mdPath, 'utf8').split('\n')
  const items = []
  let currentHeading = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const headingMatch = line.match(/^(#{2,4})\s+(.+)$/)
    if (headingMatch) {
      currentHeading = headingMatch[2].trim()
      const detail = collectHeadingBody(lines, i + 1)
      items.push({ label: currentHeading, normalized: normalize(currentHeading), detail })
      continue
    }

    if (isTableStart(lines, i)) {
      const headerCells = splitTableRow(line)
      let j = i + 2
      while (lines[j] && /^\s*\|.*\|\s*$/.test(lines[j])) {
        const cells = splitTableRow(lines[j])
        const cell = cells[0]
        if (cell) {
          const label = currentHeading ? `${currentHeading} > ${cell}` : cell
          const detail = headerCells
            .slice(1)
            .map((header, idx) => `${header}: ${cells[idx + 1] ?? ''}`)
            .join(' / ')
          items.push({ label, normalized: normalize(cell), detail })
        }
        j++
      }
    }
  }
  return items
}

// テストファイルから「// 仕様: specs/xxx.md#anchor」コメントと、
// 直後のdescribe、その中のit(...)一覧を抽出する
function extractSpecRefs(testPath) {
  const lines = fs.readFileSync(testPath, 'utf8').split('\n')
  const refs = []

  for (let i = 0; i < lines.length; i++) {
    const commentMatch = lines[i].match(/^\s*\/\/\s*仕様:\s*(.+)$/)
    if (!commentMatch) continue

    // 1コメントで複数specsを「、specs/」区切りで併記しているケースに対応
    const refPattern = /specs\/([^\s#]+\.md)#(.+?)(?=、specs\/|$)/g
    const specTargets = [...commentMatch[1].matchAll(refPattern)].map((m) => ({
      specPath: m[1],
      anchor: m[2].trim(),
    }))
    if (specTargets.length === 0) continue

    // コメント直後の説明行を飛ばして describe( を探す
    let describeLine = -1
    for (let j = i + 1; j < lines.length && j < i + 20; j++) {
      if (/^\s*\/\//.test(lines[j]) || lines[j].trim() === '') continue
      if (/\bdescribe\(/.test(lines[j])) describeLine = j
      break
    }

    let describeText = null
    const itTexts = []
    if (describeLine >= 0) {
      const dMatch = lines[describeLine].match(/describe\(\s*(['"`])(.*?)\1/)
      describeText = dMatch ? dMatch[2] : null

      // 波かっこの深さでdescribeブロックの終端を判定し、内部のit(...)を集める
      let depth = 0
      let started = false
      for (let j = describeLine; j < lines.length; j++) {
        depth += (lines[j].match(/{/g) || []).length - (lines[j].match(/}/g) || []).length
        if (lines[j].includes('{')) started = true

        const itMatch = lines[j].match(/\bit\(\s*(['"`])(.*?)\1/)
        if (itMatch) itTexts.push(itMatch[2])

        if (started && depth <= 0) break
      }
    }

    refs.push({ testFile: path.relative(ROOT, testPath), specTargets, describeText, itTexts })
  }
  return refs
}

// specFile(specs/からの相対パス) + 仕様概要(見出しのラベル)の組み合わせで
// 「テスト不要」と判断済みの項目を管理する一覧を読み込む
function loadSkipList() {
  if (!fs.existsSync(SKIP_LIST_PATH)) return []
  return JSON.parse(fs.readFileSync(SKIP_LIST_PATH, 'utf8'))
}

function findSkipEntry(skipList, relSpecPath, item) {
  return skipList.find(
    (entry) => entry.specFile === relSpecPath && normalize(entry.item) === normalize(item.label)
  )
}

function main() {
  const specFiles = walk(SPECS_DIR).filter((f) => f.endsWith('requirements.md') || f.endsWith('design.md'))
  const testFiles = walk(TESTS_DIR).filter((f) => /\.test\.(ts|tsx)$/.test(f))
  const allRefs = testFiles.flatMap(extractSpecRefs)
  const skipList = loadSkipList()

  const out = []
  const summaryRows = []
  let hasMissing = false
  const danglingRefs = []

  for (const specFile of specFiles) {
    const relSpecPath = path.relative(SPECS_DIR, specFile).replace(/\\/g, '/')
    const items = extractSpecItems(specFile)

    const refsForThisFile = []
    for (const ref of allRefs) {
      for (const target of ref.specTargets) {
        if (target.specPath === relSpecPath) refsForThisFile.push({ ...ref, anchor: target.anchor })
      }
    }

    const fileOut = []
    fileOut.push('| 仕様概要 | 仕様詳細 | 対応するdescribe | 対応するit | 状態 |')
    fileOut.push('|---|---|---|---|---|')

    let okCount = 0
    let ngCount = 0
    let skipCount = 0

    for (const item of items) {
      const label = toCellText(item.label)
      const detail = toCellText(item.detail) || '(本文なし)'
      const matched = refsForThisFile.filter((r) => normalize(r.anchor).includes(item.normalized))

      if (matched.length > 0) {
        okCount++
        for (const ref of matched) {
          const describeCell = toCellText(ref.describeText ?? '(describe不明)')
          const itCell =
            ref.itTexts.length > 0 ? toCellText(ref.itTexts.map((t) => `- ${t}`).join('\n')) : '(itなし)'
          fileOut.push(`| ${label} | ${detail} | ${describeCell} | ${itCell} | ✅ |`)
        }
        continue
      }

      const skipEntry = findSkipEntry(skipList, relSpecPath, item)
      if (skipEntry) {
        skipCount++
        fileOut.push(`| ${label} | ${detail} | (スキップ対象) | (スキップ対象) | ⏭ スキップ: ${toCellText(skipEntry.reason)} |`)
        continue
      }

      hasMissing = true
      ngCount++
      fileOut.push(`| ${label} | ${detail} | (なし) | (なし) | ❌ 未対応 |`)
    }

    summaryRows.push(`| specs/${relSpecPath} | ${okCount} | ${ngCount} | ${skipCount} |`)
    out.push(`\n## specs/${relSpecPath}\n`)
    out.push(...fileOut)

    for (const ref of refsForThisFile) {
      const anyMatch = items.some((item) => normalize(ref.anchor).includes(item.normalized))
      if (!anyMatch) danglingRefs.push({ ...ref, specFile: relSpecPath })
    }
  }

  const summary = [
    '# 仕様網羅チェック サマリー\n',
    '| requirements.md / design.md | ✅ 対応済み | ❌ 未対応 | ⏭ スキップ |',
    '|---|---|---|---|',
    ...summaryRows,
  ]

  const sections = [...summary, ...out]

  if (danglingRefs.length > 0) {
    sections.push('\n## ⚠️ 見出しに一致しない仕様コメント\n')
    sections.push('見出しのリネームや表記ゆれの可能性があります。')
    for (const ref of danglingRefs) {
      sections.push(`- ${ref.testFile}: specs/${ref.specFile}#${ref.anchor}`)
    }
  }

  sections.push(
    hasMissing ? '\n❌ テストが紐づいていない仕様項目があります。' : '\n✅ すべての仕様項目にテストが紐づいています(スキップ指定分を除く)。'
  )

  const report = sections.join('\n') + '\n'
  fs.writeFileSync(REPORT_PATH, report, 'utf8')
  console.log(report)
  console.log(`レポートを書き出しました: ${path.relative(ROOT, REPORT_PATH)}`)
  if (hasMissing) process.exitCode = 1
}

main()
