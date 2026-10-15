// 見出し・固定3観点生成CLI(仕様: content-generation/design.md「見出し・固定3観点を書く処理」、
// weekly-publish/design.md「1回分の記事を生成する処理」手順4-5・「エラーハンドリング」)。TDD対象外
// (Claude Code CLIのヘッドレス起動を伴い、プロンプト組み立て自体に検証可能な決定的ロジックがないため)。
// ただし応答の分類・リトライ・除外・枯渇打ち切りの決定的ロジックはapp/trend-digest/lib/generateContent.ts
// に切り出し、__tests__/trend-digest/lib/generateContent.test.tsで検証する(content-generation/tasks.md Task6-7)。
//
// content-selection/collect-and-select.tsが出力した選定結果(SelectionResult)を受け取り、採用された候補
// 1件ずつについてClaude Code CLI(`claude -p`)をヘッドレス起動し、日本語の見出し・固定3観点(fact/reason/caveat)
// を生成する。1候補の生成が一時的に失敗した場合はリトライし、それでも失敗する候補は除外して残りで公開する。全候補失敗・
// 利用枠枯渇時は非ゼロ終了し、GitHub Actionsの実行を失敗(赤)として残す(weekly-publish/requirements.md#掲載件数の保証-2)。
// 認証はAnthropic APIの従量課金ではなく運営者個人のClaude Code Pro/Maxサブスクリプション(CLAUDE_CODE_OAUTH_TOKEN)を使う。
//
// あわせて、各観点の図解(diagram)を解決する(requirements.md#図解-7、design.md「見出し・固定3観点を書く処理」手順12)。
// エージェントの応答に含まれるtype: 'mermaid'はそのまま保存し、type: 'image'はgenerateDiagram.ts経由で
// Cloudflare Workers AIを呼び出して画像に差し替える。この差し替えはgenerateTopics(分量検証を含む)より前に行い、
// 以降はGeneratedContent.sections[key].diagramが最終形式(Diagram型。image版はpath)になっている前提で扱う。
//
// 実行方法: CLAUDE_CODE_OAUTH_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=yyy CLOUDFLARE_AI_API_TOKEN=zzz npx tsx scripts/trend-digest/generate-content.ts <selection.jsonのパス> <YYYY-MM-DD>
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { SelectionResult, SelectedTopic } from '../../app/trend-digest/lib/candidateTypes'
import { generateTopics, type ClaudeCliResponse } from '../../app/trend-digest/lib/generateContent'
import { isValidAgentDiagram } from '../../app/trend-digest/lib/diagramValidation'
import { toTopicTrend, type GeneratedTopicInput } from '../../app/trend-digest/lib/assembleArticle'
import { buildContinuityNote } from '../../app/trend-digest/lib/continuityNote'
import { generateDiagramImage } from './generateDiagram'

const execFileAsync = promisify(execFile)

const REQUIREMENTS_PATH = path.join(process.cwd(), 'specs/trend-digest/content-generation/requirements.md')
const DESIGN_PATH = path.join(process.cwd(), 'specs/trend-digest/content-generation/design.md')

// 固定3観点。この3キー・この順序で固定(content-generation/requirements.md#要約-3)
const SECTION_KEYS = ['fact', 'reason', 'caveat'] as const

// content-generation/design.md「見出し・固定3観点を書く処理」のガードレール文言をそのまま転記する
// (weekly-publishの実行指示に必ず含める運用。requirements.md#エージェントの逸脱防止-5〜7の具体化)
const GUARDRAIL = `この記事で扱ってよい話題は、content-selectionの採用基準に基づき選定された候補のみである。選定候補に含まれない話題を新たに追加してはならない。各観点の本文は独自の視点で再構成した解説とし、原文の構成・表現の順序をそのままなぞってはならない。原文の詳細な数値・結論を網羅的に転記してはならない。渡された継続度ラベル・注目度ラベル・継続日数・報告回数・地域は事実として扱い、それと異なる段階・強さ・期間・地域を本文に書いてはならない。続報の場合は、前回掲載時の「なぜ注目されたか」をそのまま言い換えただけの本文を書いてはならない。「なぜ注目されたか」で背景が特定できない場合、推測で断定せず特定できなかった旨を書くこと。`

function buildPrompt(candidate: SelectedTopic, requirements: string, design: string): string {
  return `あなたは「週刊トレンド」の記事執筆を担当するエージェントです。以下の要件定義・設計に厳密に従って、指定された候補の紹介記事を日本語で執筆してください。

# 要件定義(content-generation/requirements.md)
${requirements}

# 設計(content-generation/design.md)
${design}

# 厳守事項
${GUARDRAIL}

# 対象候補
- ジャンル: ${candidate.genre}
- 対象作品・話題名: ${candidate.title}
- 情報源名: ${candidate.sourceName}
- 元URL: ${candidate.sourceUrl}
${buildContinuityNote(candidate)}

生成画像(Cloudflare Workers AI)は、観点ごとまたは記事全体のいずれかの単位で、このトピックにつき原則として少なくとも1つは必ず作ってください(requirements.md#図解-7)。概念・雰囲気を絵で見せることで理解を助ける構図を必ず考え、該当する観点の\`diagram\`に生成画像(\`{"type": "image", "prompt": "画像生成に使うプロンプト文"}\`)を設定してください。視覚化できる要素が本当に存在しない例外的な場合に限り省略してかまいません。さらに、流れ・分岐・時系列のような構造を示すのに適した観点があれば、それとは別にMermaid記法の図(\`{"type": "mermaid", "code": "Mermaid記法の文字列"}\`)も追加してください。単純な事実関係のみでMermaid図が不要な観点は、その観点の\`diagram\`を\`null\`にしてください。

WebFetchツールで元URLの内容を把握したうえで、次のJSON形式のみを出力してください。前後に説明文・コードブロックの装飾(\`\`\`等)を付けず、JSONオブジェクト単体で応答してください。**この処理はヘッドレス実行のため、運営者に判断を仰ぐ質問文や選択肢を返してはいけません(返答する相手がいません)。** 元URLの内容を十分に取得できなかった場合でも、確認できた情報(作品名・ジャンル・情報源名)の範囲で書けるところまで書いてJSONを返してください。それも困難な場合は無理に内容を創作せず、\`heading\`を\`null\`にしたJSON(\`{"heading": null, "sections": null}\`)を返してください(いずれの場合も聞き返さない):

{"heading": "何が話題かが伝わる見出し", "sections": {"fact": {"heading": "急上昇の事実の結論文", "text": "本文", "diagram": null}, "reason": {"heading": "なぜ注目されたかの結論文", "text": "本文", "diagram": null}, "caveat": {"heading": "確からしさ・注意点の結論文", "text": "本文", "diagram": null}}}`
}

// Claude Code CLIを非対話モード(-p)で1回呼び出し、--output-format jsonで返る応答オブジェクトを返す。
// 利用上限到達(429)などではCLIが非ゼロ終了しexecFileがrejectするが、その場合もstdoutに
// {is_error:true, api_error_status:429, result:"..."}が入るため、rejectのstdoutからパースして分類に回す
// (分類・リトライ判断はgenerateContent.classifyGenerationResultが行う)
async function callClaudeCode(prompt: string): Promise<ClaudeCliResponse> {
  try {
    const { stdout } = await execFileAsync(
      'claude',
      ['-p', prompt, '--output-format', 'json', '--dangerously-skip-permissions'],
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
    // stdoutを取得できない起動失敗等は一時的失敗として扱う(is_errorかつ非429 → transient)
    return { is_error: true, result: (error as Error).message }
  }
}

// エージェントが返した観点ごとのdiagram(生の形式。isValidAgentDiagramで妥当性確認したもの)を、
// 記事データの最終形式(Diagram型)に解決する(design.md「見出し・固定3観点を書く処理」手順12)。
// type: 'mermaid'はcodeをそのまま保存するだけでよい(構文検証はしない。壊れていても表示が崩れるのみ)。
// type: 'image'のみCloudflare Workers AI呼び出しが必要なためgenerateDiagramImageに委ねる(呼び出し自体の
// 成否判定・フォールバックはgenerateDiagram.ts側の責務。ここでは呼び出すかどうかの振り分けのみ行う)
async function resolveDiagram(
  topicId: string,
  sectionKey: string,
  date: string,
  diagram: { type: 'mermaid'; code: string } | { type: 'image'; prompt: string } | null
): Promise<{ type: 'mermaid'; code: string } | { type: 'image'; path: string } | null> {
  if (diagram === null) return null
  if (diagram.type === 'mermaid') return diagram
  return generateDiagramImage({ date, topicId, sectionKey, prompt: diagram.prompt })
}

// Claude Code CLIの応答テキスト(ClaudeCliResponse.result)からJSONオブジェクトを抽出し、
// 観点ごとのdiagramをCloudflare Workers AI呼び出しも含めて最終形式に解決したうえで、再度文字列化して返す。
// JSON抽出・パースに失敗した場合は元のテキストのまま返す(後続のclassifyGenerationResultが
// 通常の失敗分類に回す。design.md「見出し・固定3観点を書く処理」手順12)
async function resolveResponseDiagrams(responseText: string, date: string, topicId: string): Promise<string> {
  const match = responseText.match(/\{[\s\S]*\}/)
  if (!match) return responseText
  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return responseText
  }

  if (typeof parsed !== 'object' || parsed === null) return responseText
  const sections = (parsed as { sections?: unknown }).sections
  if (typeof sections !== 'object' || sections === null) return responseText

  const sectionsRecord = sections as Record<string, { diagram?: unknown } | undefined>
  for (const key of SECTION_KEYS) {
    const section = sectionsRecord[key]
    if (!section || typeof section !== 'object') continue
    const rawDiagram = section.diagram
    if (rawDiagram === undefined) continue // 観点自体がdiagramキーを返していない(省略)
    if (!isValidAgentDiagram(rawDiagram)) {
      console.error(`図解データの形式が不正なため無視します(${topicId}/${key}): ${JSON.stringify(rawDiagram)}`)
      section.diagram = null
      continue
    }
    section.diagram = await resolveDiagram(topicId, key, date, rawDiagram)
  }

  return JSON.stringify(parsed)
}

async function main() {
  const selectionPath = process.argv[2]
  const date = process.argv[3]
  if (!selectionPath || !date) {
    console.error('使い方: generate-content.ts <selection.jsonのパス> <YYYY-MM-DD>')
    process.exit(1)
  }

  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    console.error('CLAUDE_CODE_OAUTH_TOKEN が環境変数に設定されていません(GitHub Actions Secretsの設定。weekly-publish/design.md「実行環境の前提」参照)')
    process.exit(1)
  }

  const selection = JSON.parse(fs.readFileSync(selectionPath, 'utf8')) as SelectionResult
  if (selection.status !== 'ok') {
    console.error('選定結果がスキップのため、見出し・固定3観点生成の対象がありません')
    process.exit(1)
  }

  const requirements = fs.readFileSync(REQUIREMENTS_PATH, 'utf8')
  const design = fs.readFileSync(DESIGN_PATH, 'utf8')

  // 1候補ずつ生成する。一時的失敗はリトライ→ダメなら除外、利用枠枯渇・全候補失敗は例外を投げ、
  // 下のmain().catchが非ゼロ終了させる(→後続のpush/PR作成が走らず、Actionsの実行が赤で残る)
  const generated = await generateTopics(
    selection.topics,
    async (candidate) => {
      // 図解の保存ファイル名に使う識別子(design.md「見出し・固定3観点を書く処理」手順12)。
      // 最終的なTopic.idはassembleArticle.ts側が生成失敗した候補を除外した後に採番するため、
      // ここではgenre(選定結果内で一意)から導出した仮の識別子を使う
      const topicId = candidate.genre
      const res = await callClaudeCode(buildPrompt(candidate, requirements, design))
      if (res.result) {
        res.result = await resolveResponseDiagrams(res.result, date, topicId)
      }
      return res
    },
    {
      onExcluded: ({ candidate, attempts, detail }) => {
        console.error(
          `候補の生成に失敗したため除外します(${attempts}回試行): ${candidate.genre} / ${candidate.title} / 理由: ${detail}`,
        )
      },
    },
  )

  const topics: GeneratedTopicInput[] = generated.map(({ candidate, content }) => ({
    genre: candidate.genre,
    title: candidate.title,
    sourceName: candidate.sourceName,
    sourceUrl: candidate.sourceUrl,
    heading: content.heading,
    sections: content.sections,
    trend: toTopicTrend(candidate),
  }))

  process.stdout.write(JSON.stringify(topics, null, 2) + '\n')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
