// 要約生成CLI(仕様: content-generation/design.md「要約を書く処理」、daily-publish/design.md
// 「1日分の記事を生成する処理」手順4)。TDD対象外(Claude Code CLIのヘッドレス起動を伴い、プロンプト
// 組み立て自体に検証可能な決定的ロジックがないため。生成結果の分量検証はsummaryValidation.ts/
// articleSchema.tsのテストで担保する。content-generation/tasks.md Task7参照)
//
// content-selection/collect-and-select.tsが出力した選定結果(SelectionResult)を受け取り、
// 採用された候補1件ずつについてClaude Code CLI(`claude -p`)をヘッドレス起動し、日本語の
// 見出し・章立て要約を生成する。プロンプトにはrequirements.md/design.mdの内容をそのまま含める
// (別ファイルに複製しない。content-generation/design.md「設計の前提」参照)。元記事・元動画の
// 内容把握にはClaude Code CLI標準搭載のWebFetch/WebSearchツールを使い、このスクリプト側では
// 原文を事前取得しない。認証はAnthropic APIの従量課金(ANTHROPIC_API_KEY)ではなく、運営者個人の
// Claude Code Pro/Maxサブスクリプション(CLAUDE_CODE_OAUTH_TOKEN)を使う(2026-08第2次改定)
//
// 実行方法: CLAUDE_CODE_OAUTH_TOKEN=xxx npx tsx scripts/ai-dev-digest/generate-content.ts <selection.jsonのパス>
// (selection.jsonはcollect-and-select.tsの標準出力。結果はGeneratedTopicInput[]として標準出力する)
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { extractYoutubeVideoId } from '../../app/ai-dev-digest/lib/youtubeUrl'
import type { GeneratedTopicInput } from '../../app/ai-dev-digest/lib/assembleArticle'
import type { SelectedTopic, SelectionResult } from '../../app/ai-dev-digest/lib/candidateTypes'
import type { SummarySection } from '../../app/ai-dev-digest/lib/types'

const execFileAsync = promisify(execFile)

const REQUIREMENTS_PATH = path.join(process.cwd(), 'specs/ai-dev-digest/content-generation/requirements.md')
const DESIGN_PATH = path.join(process.cwd(), 'specs/ai-dev-digest/content-generation/design.md')

// content-generation/design.md「要約を書く処理」のガードレール文言をそのまま転記する
// (daily-publishの実行指示に必ず含める運用。requirements.md#エージェントの逸脱防止-8の具体化)
const GUARDRAIL = `この記事で扱ってよい話題は、content-selectionの採用基準に基づき選定された候補のみである。選定候補に含まれない話題(政治・時事ネタ等)を、AI駆動開発に関連付けて新たに追加してはならない。要約(導入文・詳細文とも)は独自の章立てで再構成した解説とし、原文の段落構成・表現の順序をそのままなぞってはならない。原文の詳細な数値・結論を網羅的に転記してはならない。`

type GeneratedContent = {
  heading: string
  sections: SummarySection[]
}

function buildPrompt(candidate: SelectedTopic, requirements: string, design: string): string {
  return `あなたは「AI駆動開発ダイジェスト」の記事執筆を担当するエージェントです。以下の要件定義・設計に厳密に従って、指定された候補の紹介記事を日本語で執筆してください。

# 要件定義(content-generation/requirements.md)
${requirements}

# 設計(content-generation/design.md)
${design}

# 厳守事項
${GUARDRAIL}

# 対象候補
- 発信者名: ${candidate.sourceName}
- 原文タイトル: ${candidate.heading}
- 元URL: ${candidate.url}
- 情報源種別: ${candidate.sourceType}

WebFetchツールで元URLの内容を把握したうえで、次のJSON形式のみを出力してください。前後に説明文・コードブロックの装飾(\`\`\`等)を付けず、JSONオブジェクト単体で応答してください:

{"heading": "原文タイトルを日本語で簡潔に言い換えた見出し", "sections": [{"heading": "セクション見出し", "teaser": "常時表示する導入文(60〜120字程度)", "detail": "展開表示する詳細文"}]}`
}

function extractJson(text: string): GeneratedContent {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error(`Claude Code CLIの応答からJSONを抽出できませんでした: ${text}`)
  }
  return JSON.parse(match[0]) as GeneratedContent
}

// Claude Code CLIを非対話モード(-p)で1回呼び出す。--output-format jsonで返る
// {result: "...", ...}のresultフィールドに、実際の応答テキストが入る
async function callClaudeCode(prompt: string): Promise<string> {
  const { stdout } = await execFileAsync(
    'claude',
    ['-p', prompt, '--output-format', 'json', '--dangerously-skip-permissions'],
    { maxBuffer: 1024 * 1024 * 32 },
  )
  const parsed = JSON.parse(stdout) as { result: string }
  return parsed.result
}

async function generateOne(candidate: SelectedTopic, requirements: string, design: string): Promise<GeneratedContent> {
  const resultText = await callClaudeCode(buildPrompt(candidate, requirements, design))
  return extractJson(resultText)
}

async function main() {
  const selectionPath = process.argv[2]
  if (!selectionPath) {
    console.error('使い方: generate-content.ts <selection.jsonのパス>')
    process.exit(1)
  }

  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    console.error('CLAUDE_CODE_OAUTH_TOKEN が環境変数に設定されていません(GitHub Actions Secretsの設定。daily-publish/design.md「実行環境の前提」参照)')
    process.exit(1)
  }

  const selection = JSON.parse(fs.readFileSync(selectionPath, 'utf8')) as { date: string } & SelectionResult
  if (selection.status !== 'ok') {
    console.error('選定結果がスキップのため、要約生成の対象がありません')
    process.exit(1)
  }

  const requirements = fs.readFileSync(REQUIREMENTS_PATH, 'utf8')
  const design = fs.readFileSync(DESIGN_PATH, 'utf8')

  const topics: GeneratedTopicInput[] = []
  for (const candidate of selection.topics) {
    console.error(`要約を生成しています: ${candidate.sourceName} - ${candidate.heading}`)
    const generated = await generateOne(candidate, requirements, design)
    topics.push({
      heading: generated.heading,
      sections: generated.sections,
      sourceType: candidate.sourceType,
      sourceName: candidate.sourceName,
      sourceUrl: candidate.url,
      belowCriteria: candidate.belowCriteria,
      ...(extractYoutubeVideoId(candidate.url) ? { youtubeVideoId: extractYoutubeVideoId(candidate.url) } : {}),
      ...(candidate.shortfallReason ? { belowCriteriaReason: candidate.shortfallReason } : {}),
    })
  }

  process.stdout.write(JSON.stringify(topics, null, 2) + '\n')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
