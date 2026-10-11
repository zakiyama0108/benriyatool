// 見出し・固定3観点生成CLI(仕様: content-generation/design.md「見出し・固定3観点を書く処理」)。TDD対象外
// (Claude Code CLIのヘッドレス起動とプロンプトの組み立てで、検証可能な決定的ロジックは
// app/future-digest/lib/generateContent.tsに切り出し、__tests__/future-digest/lib/generateContent.test.tsで
// 検証済みのため。tasks.md Task6・Task11参照)。
//
// content-selection/collect-and-select.tsが出力した選定結果を受け取り、採用された候補(status: 'selected')
// 1件ずつについてClaude Code CLI(`claude -p`)をヘッドレス起動し、見出し・固定3観点(when/basis/impact)を
// 生成する。あわせて、各観点の図解(diagram)を解決する(requirements.md#図解-6、design.md「見出し・固定3観点を
// 書く処理」手順12)。エージェントの応答に含まれるtype: 'mermaid'はそのまま保存し、type: 'image'は
// generateDiagram.ts経由でNano Bananaを呼び出して画像に差し替える。この差し替えは
// generatePredictions(app/future-digest/lib/generateContent.ts)の分量検証より前に行い、以降は
// sections[key].diagramが最終形式(Diagram型。image版はpath)になっている前提で扱う。
// 1候補の生成が一時的に失敗した場合はリトライし、それでも失敗する候補は「生成に失敗した枠」として
// 除き残りで公開する(採用0件・全件失敗でも公開をスキップしない。weekly-publish/requirements.md#掲載件数の保証-4)。
// 利用上限への到達を検知した場合はここで非ゼロ終了し、後続のwrite-article.ts(公開)には進まない
// (weekly-publish/design.md「1回分の記事を生成する処理」手順4)。
// 認証は運営者個人のClaude Code Pro/Maxサブスクリプション(CLAUDE_CODE_OAUTH_TOKEN)を使う。
//
// 実行方法: CLAUDE_CODE_OAUTH_TOKEN=xxx GEMINI_API_KEY=yyy npx tsx scripts/future-digest/generate-content.ts <selection.jsonのパス>
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import type { Candidate, SlotResult } from '../../app/future-digest/lib/candidateTypes'
import { generatePredictions, type ClaudeCliResponse } from '../../app/future-digest/lib/generateContent'
import { isValidAgentDiagram } from '../../app/future-digest/lib/diagramValidation'
import { generateDiagramImage } from './generateDiagram'

const execFileAsync = promisify(execFile)

// 固定3観点。この3キー・この順序で固定(content-generation/requirements.md#要約-3)
const SECTION_KEYS = ['when', 'basis', 'impact'] as const
type SectionKey = (typeof SECTION_KEYS)[number]

const REQUIREMENTS_PATH = path.join(process.cwd(), 'specs/future-digest/content-generation/requirements.md')
const DESIGN_PATH = path.join(process.cwd(), 'specs/future-digest/content-generation/design.md')

// content-generation/design.md「見出し・固定3観点を書く処理」の全ジャンル共通ガードレール文言をそのまま転記する
const COMMON_GUARDRAIL = `この記事で扱ってよいのは、渡された元記事に書かれている予測だけである。元記事の構成・表現の順序をなぞらず独自に書き直し、数値・全文を網羅的に転記しない。予測を確定した未来として断定せず、元記事にない内容や自分の予測を加えない。渡された影響度・その根拠・対象時期は事実として扱い、それと異なることを書かない。`

// 性・恋愛ジャンルの専用ガードレール文言(requirements.md#性・恋愛ジャンルの書き方-4〜7の具体化)
const SEXUALITY_GUARDRAIL = `このジャンルのテーマ(自慰の新しいやり方・セルフプレジャーのテクノロジー、恋愛・結婚・性交・性生活の動向、出会い系・立ちんぼ・風俗など性産業の動向)は、避けたりぼかしたりせず、行為・製品・サービスの内容も報道・解説の文体で率直かつ具体的に書く。ただし、読者の性的興奮を目的とする官能的・扇情的な描写はしない。性産業については動向と社会・法制度の変化を書き、特定の店舗・場所・相手の探し方など利用や違法行為を手助けする情報は書かない。未成年が関わる性的な内容は一切扱わない。`

function buildPrompt(candidate: Candidate, requirements: string, design: string): string {
  const guardrail = candidate.genre === 'sexuality-romance' ? `${COMMON_GUARDRAIL}\n${SEXUALITY_GUARDRAIL}` : COMMON_GUARDRAIL

  return `あなたは「週刊未来予測」の記事執筆を担当するエージェントです。以下の要件定義・設計に厳密に従って、指定された予測の見出し・固定3観点(いつ・何が起こると予測されているか/誰が・どんな根拠で示しているか/暮らし・社会への影響)を日本語で執筆してください。

# 要件定義(content-generation/requirements.md)
${requirements}

# 設計(content-generation/design.md)
${design}

# 厳守事項
${guardrail}

# 対象予測
- ジャンル: ${candidate.genre}
- 時間軸: ${candidate.horizon}
- 対象時期: ${candidate.targetPeriod}
- 影響度: ${candidate.impact}
- 影響度の根拠: ${candidate.impactReason}
- 元記事タイトル: ${candidate.sourceTitle}
- 情報源名: ${candidate.sourceName}
- 元URL: ${candidate.sourceUrl}

観点ごと、または記事全体について、図解が理解の助けになるかを判断してください(requirements.md#図解-6)。単純な内容の観点では、無理に図解を作らず\`diagram\`を\`null\`にしてください。流れ・分岐・時系列のような構造を示すのに適した内容はMermaid記法の図(\`{"type": "mermaid", "code": "Mermaid記法の文字列"}\`)、概念・具体例を絵で見せた方が伝わる内容は生成画像(\`{"type": "image", "prompt": "画像生成に使うプロンプト文"}\`)にしてください。

WebFetchツールで元URLの内容を把握したうえで、次のJSON形式のみを出力してください。前後に説明文・コードブロックの装飾(\`\`\`等)を付けず、JSONオブジェクト単体で応答してください。**この処理はヘッドレス実行のため、運営者に判断を仰ぐ質問文や選択肢を返してはいけません(返答する相手がいません)。** 元URLの内容を十分に取得できなかった場合でも、渡された情報(元記事タイトル・対象時期・影響度の根拠)の範囲で書けるところまで書いてJSONを返してください。それも困難な場合は無理に内容を創作せず、\`heading\`を\`null\`にしたJSON(\`{"heading": null, "sections": null}\`)を返してください(いずれの場合も聞き返さない):

{"heading": "何が起こると考えられているかが一目で分かる見出し", "sections": {"when": {"heading": "短い結論文", "text": "いつ・何が起こると予測されているかの本文", "diagram": null}, "basis": {"heading": "短い結論文", "text": "誰が・どんな根拠で示しているかの本文", "diagram": null}, "impact": {"heading": "短い結論文", "text": "暮らし・社会への影響の本文(3観点合計で200〜400字程度)", "diagram": null}}}`
}

// エージェントが返した観点ごとのdiagram(生の形式。isValidAgentDiagramで妥当性確認したもの)を、
// 記事データの最終形式(Diagram型)に解決する(design.md「見出し・固定3観点を書く処理」手順12)。
// type: 'mermaid'はcodeをそのまま保存するだけでよい(構文検証はしない。壊れていても表示が崩れるのみ)。
// type: 'image'のみNano Banana呼び出しが必要なためgenerateDiagramImageに委ねる
async function resolveDiagram(
  candidate: Candidate,
  sectionKey: SectionKey,
  date: string,
  diagram: { type: 'mermaid'; code: string } | { type: 'image'; prompt: string } | null
): Promise<{ type: 'mermaid'; code: string } | { type: 'image'; path: string } | null> {
  if (diagram === null) return null
  if (diagram.type === 'mermaid') return diagram
  return generateDiagramImage({ date, genre: candidate.genre, horizon: candidate.horizon, sectionKey, prompt: diagram.prompt })
}

// Claude Code CLIの応答テキスト(ClaudeCliResponse.result)からJSONオブジェクトを抽出し、
// 観点ごとのdiagramをNano Banana呼び出しも含めて最終形式に解決してから再度文字列化する。
// 抽出・パースに失敗した場合は元のテキストをそのまま返す(後続のclassifyGenerationResultが
// 同じ抽出処理を行い、一時的失敗として分類する。design.md「エラーハンドリング」)
async function resolveDiagramsInResultText(resultText: string, date: string, candidate: Candidate): Promise<string> {
  const match = resultText.match(/\{[\s\S]*\}/)
  if (!match) return resultText
  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return resultText
  }
  if (typeof parsed !== 'object' || parsed === null) return resultText

  const sections = (parsed as { sections?: unknown }).sections
  if (typeof sections !== 'object' || sections === null) return resultText

  const sectionsRecord = sections as Record<string, { diagram?: unknown } | undefined>
  for (const key of SECTION_KEYS) {
    const section = sectionsRecord[key]
    if (!section || typeof section !== 'object') continue
    const rawDiagram = section.diagram
    if (rawDiagram === undefined) continue // 観点自体がdiagramキーを返していない(省略)
    if (!isValidAgentDiagram(rawDiagram)) {
      console.error(
        `図解データの形式が不正なため無視します(${candidate.genre}/${candidate.horizon}/${key}): ${JSON.stringify(rawDiagram)}`
      )
      section.diagram = null
      continue
    }
    section.diagram = await resolveDiagram(candidate, key, date, rawDiagram)
  }

  return JSON.stringify(parsed)
}

// Claude Code CLIへ渡す起動引数(純粋関数として切り出し、テストで検証できるようにする)。
// --dangerously-skip-permissionsは全ツールを確認なしで許可してしまうため使わない。
// --toolsで利用可能なツール自体をWebFetchに絞り(Bash・Read・Edit等を呼び出し不能にする)、
// --allowedToolsで確認なしに使えるツールも同じくWebFetchに限定する(content-generation/design.md「セキュリティ」)
export function buildClaudeArgs(prompt: string): string[] {
  return ['-p', prompt, '--output-format', 'json', '--tools', 'WebFetch', '--allowedTools', 'WebFetch']
}

async function callClaudeCode(prompt: string): Promise<ClaudeCliResponse> {
  try {
    const { stdout } = await execFileAsync(
      'claude',
      buildClaudeArgs(prompt),
      { maxBuffer: 1024 * 1024 * 32 },
    )
    return JSON.parse(stdout) as ClaudeCliResponse
  } catch (error) {
    const withStdout = error as { stdout?: string }
    if (withStdout.stdout) {
      try {
        return JSON.parse(withStdout.stdout) as ClaudeCliResponse
      } catch {
        // stdoutがJSONでない場合は下のフォールバックに回す
      }
    }
    return { is_error: true, result: (error as Error).message }
  }
}

// callClaudeCodeの応答に含まれる各観点のdiagramを、Nano Banana呼び出しも含めて最終形式に解決してから
// generatePredictions(app/future-digest/lib/generateContent.ts)に渡す(tasks.md Task11「generate-content.ts
// から、各観点のdiagram.type === 'image'の場合のみこの処理を呼び出すよう配線する」)
async function callClaudeCodeWithDiagrams(
  candidate: Candidate,
  requirements: string,
  design: string,
  date: string
): Promise<ClaudeCliResponse> {
  const response = await callClaudeCode(buildPrompt(candidate, requirements, design))
  if (response.is_error || !response.result) return response
  const resolvedResult = await resolveDiagramsInResultText(response.result, date, candidate)
  return { ...response, result: resolvedResult }
}

async function main() {
  const selectionPath = process.argv[2]
  if (!selectionPath) {
    console.error('使い方: generate-content.ts <selection.jsonのパス>')
    process.exit(1)
  }

  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    console.error('CLAUDE_CODE_OAUTH_TOKEN が環境変数に設定されていません(GitHub Actions Secretsの設定。weekly-publish/design.md「実行環境の前提」参照)')
    process.exit(1)
  }

  const selection = JSON.parse(fs.readFileSync(selectionPath, 'utf8')) as {
    slots: SlotResult[]
    scheduledPublishDate: string
  }
  const selectedCandidates = selection.slots
    .filter((s): s is Extract<SlotResult, { status: 'selected' }> => s.status === 'selected')
    .map((s) => s.candidate)

  if (selectedCandidates.length === 0) {
    console.error('採用された候補が0件のため、生成をスキップします')
    process.stdout.write(JSON.stringify({ predictions: [], failedCandidates: [] }, null, 2) + '\n')
    return
  }

  const requirements = fs.readFileSync(REQUIREMENTS_PATH, 'utf8')
  const design = fs.readFileSync(DESIGN_PATH, 'utf8')

  // 1候補ずつ生成する。一時的失敗はリトライ→ダメなら「生成に失敗した枠」として除く。
  // 利用枠枯渇はQuotaExhaustedErrorとしてここから外へ伝播し、下のmain().catchが非ゼロ終了させる
  // (→後続のwrite-article.tsが走らず、Actionsの実行が赤で残る)
  const result = await generatePredictions(
    selectedCandidates,
    (candidate) => callClaudeCodeWithDiagrams(candidate, requirements, design, selection.scheduledPublishDate),
    {
      onExcluded: ({ candidate, attempts, detail }) => {
        console.error(
          `予測の生成に失敗したため除外します(${attempts}回試行): ${candidate.genre} / ${candidate.horizon} / 理由: ${detail}`,
        )
      },
    },
  )

  // 1本ごとに、生成の成否・固定3観点の合計文字数を実行ログに出す(本文そのものはログに出さない。
  // 失敗時の理由は上のonExcludedで既に出している。design.md「ログ」)
  for (const { candidate, prediction } of result.succeeded) {
    const bodyLength = SECTION_KEYS.reduce((sum, key) => sum + prediction.sections[key].text.length, 0)
    console.error(`${candidate.genre}/${candidate.horizon}: 生成成功(本文${bodyLength}字)`)
  }
  console.error(`生成成功: ${result.succeeded.length}件 / 生成失敗: ${result.failed.length}件`)

  process.stdout.write(
    JSON.stringify(
      {
        predictions: result.succeeded.map((r) => r.prediction),
        failedCandidates: result.failed.map((f) => ({ genre: f.candidate.genre, horizon: f.candidate.horizon })),
      },
      null,
      2,
    ) + '\n',
  )
}

const isMainModule = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMainModule) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}

export { main }
