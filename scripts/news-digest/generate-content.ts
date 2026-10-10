// 要約生成CLI(仕様: content-generation/design.md「要約を書く処理」、weekly-publish/design.md
// 「1週分の記事を生成する処理」手順4)。プロンプト組み立て自体は検証可能な決定的ロジックがないためTDD
// 対象外だが、Claude Code CLI起動の成否(execFileAsync)と応答stdoutのJSON.parse成否を区別する
// callClaudeCodeのエラー分類は決定的ロジックのため__tests__/news-digest/scripts/generate-content.test.ts
// でexecFileをモックして検証する(implementation-reviewの指摘対応)。生成結果の利用可否判定は
// app/news-digest/lib/generateContent.tsに切り出し、__tests__/news-digest/lib/generateContent.test.ts
// で検証済み。content-generation/tasks.md Task5)。
//
// collect-and-select.tsが出力した選定結果(selection.json)から候補を1件(candidateIndex)だけ取り出し、
// content-generation/requirements.md・design.mdのルールをそのままプロンプトに含めてClaude Code CLI
// (`claude -p`)をヘッドレス起動し、日本語の見出し・固定4観点の要約・重要度を生成する。
// weekly-publish(TDD対象外、本specの管轄外)が候補ごとにこのスクリプトを繰り返し起動する。終了コードで
// 失敗理由を区別する: 1候補だけの単純な失敗(JSON不正等、リトライしても回復しうる)はexit 1で返し、
// 呼び出し元はその候補を除外して次の候補に進む。利用枠の枯渇(リトライしても回復しない)はexit 2で返し、
// 呼び出し元はその週の実行全体を打ち切る(weekly-publish/design.md「エラーハンドリング」、
// requirements.md#掲載件数の保証-2)。
// 認証はAnthropic APIの従量課金ではなく運営者個人のClaude Code Pro/Maxサブスクリプション
// (CLAUDE_CODE_OAUTH_TOKEN)を使う(weekly-publish/design.md「実行環境の前提」)。
// あわせて、各観点の図解(diagram)を解決する(requirements.md#図解-12〜14、design.md「図解を生成する処理」)。
// エージェントの応答に含まれるtype: 'mermaid'はそのまま保存し、type: 'image'はgenerateDiagram.ts経由で
// Nano Bananaを呼び出して画像に差し替える。この差し替えはisUsableContent(分量検証)より前に行い、
// 以降はGeneratedContent.summary[key].diagramが最終形式(Diagram型。image版はpath)になっている前提で扱う
//
// 実行方法: CLAUDE_CODE_OAUTH_TOKEN=xxx GEMINI_API_KEY=yyy npx tsx scripts/news-digest/generate-content.ts <selection.jsonのパス> <candidateIndex>
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { isUsableContent, isQuotaExhaustionError, type GeneratedContent } from '../../app/news-digest/lib/generateContent'
import { isValidAgentDiagram } from '../../app/news-digest/lib/diagramValidation'
import type { SelectedTopic, SelectionResult } from '../../app/news-digest/lib/candidateTypes'
import { generateDiagramImage } from './generateDiagram'

const execFileAsync = promisify(execFile)

// 利用枠の枯渇を検知したことを表す例外(1候補だけの単純な失敗(exit 1)とは区別し、
// mainがexit 2で即座に打ち切る。weekly-publish/design.md「エラーハンドリング」参照)
class QuotaExhaustedError extends Error {}

const REQUIREMENTS_PATH = path.join(process.cwd(), 'specs/news-digest/content-generation/requirements.md')
const DESIGN_PATH = path.join(process.cwd(), 'specs/news-digest/content-generation/design.md')

// 1候補あたりの最大試行回数(初回+リトライ1回。tasks.md Task5、weekly-publish/design.md
// 「1週分の記事を生成する処理」手順4と同じ既定値)
const MAX_ATTEMPTS = 2

// design.md「要約を書く処理」のガードレール文言をそのまま転記する
// (weekly-publishの実行指示に必ず含める運用。requirements.md#エージェントの逸脱防止-6の具体化)
const GUARDRAIL = `この記事で扱ってよい話題は、content-selectionの採用基準に基づき選定された候補のみである。要約(導入文・詳細文とも)は独自の章立てで再構成した解説とし、原文の段落構成・表現の順序をそのままなぞってはならない。原文の詳細な数値・結論を網羅的に転記してはならない。`

// 固定4観点。この4キー・この順序で固定(content-generation/requirements.md#要約-4)
const SUMMARY_KEYS = ['whatHappened', 'whyItMatters', 'background', 'outlook'] as const

function buildPrompt(candidate: SelectedTopic, requirements: string, design: string): string {
  return `あなたは「重要ニュース週刊ダイジェスト」の記事執筆を担当するエージェントです。以下の要件定義・設計に厳密に従って、指定された候補の紹介記事を日本語で執筆してください。

# 要件定義(content-generation/requirements.md)
${requirements}

# 設計(content-generation/design.md)
${design}

# 厳守事項
${GUARDRAIL}

# 対象候補
- カテゴリ: ${candidate.category}
- 原文タイトル: ${candidate.heading}
- 発信者名: ${candidate.sourceName}
- 元URL: ${candidate.url}
- 元記事の公開日時: ${candidate.publishedAt}

観点ごとに、図解が理解の助けになるかを判断してください(requirements.md#図解-12〜14)。理解が容易な単純な事実関係のみの観点では、無理に図解を作らず\`diagram\`を\`null\`にしてください。流れ・分岐・手順・時系列のような構造を示すのに適した内容はMermaid記法の図(\`{"type": "mermaid", "code": "Mermaid記法の文字列"}\`)、概念・具体例を絵で見せた方が伝わる内容は生成画像(\`{"type": "image", "prompt": "画像生成に使うプロンプト文"}\`)にしてください。可能な限り両方の形式を使ってください(片方しか当てはまらない内容であればその一方のみでよい)。

WebFetch/WebSearchツールで元URLの内容を把握したうえで、次のJSON形式のみを出力してください。前後に説明文・コードブロックの装飾(\`\`\`等)を付けず、JSONオブジェクト単体で応答してください。**この処理はヘッドレス実行のため、運営者に判断を仰ぐ質問文や選択肢を返してはいけません(返答する相手がいません)。** 元URLの内容を十分に取得できなかった場合でも、確認できた情報の範囲で書けるところまで書いてJSONを返してください。それも困難な場合は無理に内容を創作せず、\`summary\`を\`null\`にしたJSON(\`{"heading": "...", "importance": 1, "summary": null}\`)を返してください(いずれの場合も聞き返さない):

{"heading": "この記事から何が得られるか(結論・要点)が伝わる見出し(原文タイトルの逐語的な言い換えにとどめない)", "importance": 4, "summary": {"whatHappened": {"heading": "結論・要点を含む見出し", "teaser": "60〜120字程度の導入文", "detail": "展開表示する詳細文", "diagram": {"type": "mermaid", "code": "flowchart LR\\n..."}}, "whyItMatters": {"heading": "...", "teaser": "...", "detail": "...", "diagram": null}, "background": {"heading": "...", "teaser": "...", "detail": "...", "diagram": null}, "outlook": {"heading": "...", "teaser": "...", "detail": "...", "diagram": null}}}`
}

// Claude Code CLIを非対話モード(-p)で1回呼び出し、応答テキスト(result)を返す。
// 起動自体に失敗した場合も例外を投げず空文字を返し、呼び出し元がリトライ判断に回す。
// ただし利用枠枯渇を示すエラー(rate_limit/session limit/usage limit/429のいずれか)を検知した場合は、
// リトライしても回復しないためQuotaExhaustedErrorを投げて即座に打ち切る(design.md「エラーハンドリング」)。
//
// execFileAsync(CLIプロセス起動自体)の失敗と、起動には成功したstdoutのJSON.parse失敗は別のtry/catchで
// 扱う。後者(JSON.parse失敗)はCLIプロセスが正常終了しているため利用枠枯渇ではあり得ず、単純な応答不正
// (SyntaxError)として起動失敗と同じフォールバックに倒す。両者を同じcatchにまとめてしまうと、
// SyntaxErrorのメッセージに含まれる位置番号(例:「position 429」)がisQuotaExhaustionErrorの
// 「429」パターンと部分一致し、1候補だけの単純な失敗(exit 1)を利用枠枯渇(exit 2、週全体を打ち切り)と
// 誤判定してしまう
export async function callClaudeCode(prompt: string): Promise<string> {
  let stdout: string
  try {
    ;({ stdout } = await execFileAsync(
      'claude',
      ['-p', prompt, '--output-format', 'json', '--dangerously-skip-permissions'],
      { maxBuffer: 1024 * 1024 * 32 }
    ))
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; message?: string }
    const combinedText = [execError.stdout, execError.stderr, execError.message].filter(Boolean).join('\n')
    if (isQuotaExhaustionError(combinedText)) {
      throw new QuotaExhaustedError(`利用枠の枯渇を検知したため生成を打ち切ります: ${combinedText.slice(0, 300)}`)
    }
    if (execError.stdout) {
      try {
        const parsed = JSON.parse(execError.stdout) as { result?: string }
        return parsed.result ?? ''
      } catch {
        // stdoutがJSONでない場合は下のフォールバックに回す(利用枠枯渇判定は上ですでに済んでいる)
      }
    }
    console.error(`Claude Code CLIの起動に失敗しました: ${(error as Error).message}`)
    return ''
  }

  try {
    const parsed = JSON.parse(stdout) as { result?: string }
    return parsed.result ?? ''
  } catch (error) {
    // execFileAsync自体は成功している(CLIプロセスは正常終了している)ため、利用枠枯渇の判定対象にはしない
    console.error(`Claude Code CLIの起動に失敗しました: ${(error as Error).message}`)
    return ''
  }
}

// エージェントが返した観点ごとのdiagram(生の形式。isValidAgentDiagramで妥当性確認したもの)を、
// 記事データの最終形式(Diagram型)に解決する(design.md「図解を生成する処理」手順1〜4)。
// type: 'mermaid'はcodeをそのまま保存するだけでよい(構文検証はしない。壊れていても表示が崩れるのみ)。
// type: 'image'のみNano Banana呼び出しが必要なためgenerateDiagramImageに委ねる(呼び出し自体の
// 成否判定・フォールバックはgenerateDiagram.ts側の責務。ここでは呼び出すかどうかの振り分けのみ行う)
async function resolveDiagram(
  topicId: string,
  perspectiveKey: string,
  date: string,
  diagram: { type: 'mermaid'; code: string } | { type: 'image'; prompt: string } | null
): Promise<{ type: 'mermaid'; code: string } | { type: 'image'; path: string } | null> {
  if (diagram === null) return null
  if (diagram.type === 'mermaid') return diagram
  return generateDiagramImage({ date, topicId, perspectiveKey, prompt: diagram.prompt })
}

// エージェント応答テキストからJSONオブジェクトを抽出・検証し、観点ごとのdiagramをNano Banana呼び出し
// も含めて最終形式に解決する。抽出・パース・分量検証いずれかに失敗した場合はnullを返す
// (design.md「要約を書く処理」手順10、design.md「エラーハンドリング」)
async function parseAndResolveGeneratedContent(
  responseText: string,
  date: string,
  topicId: string
): Promise<GeneratedContent | null> {
  const match = responseText.match(/\{[\s\S]*\}/)
  if (!match) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return null
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const summary = (parsed as { summary?: unknown }).summary
    if (typeof summary === 'object' && summary !== null) {
      const summaryRecord = summary as Record<string, { diagram?: unknown } | undefined>
      for (const key of SUMMARY_KEYS) {
        const perspective = summaryRecord[key]
        if (!perspective || typeof perspective !== 'object') continue
        const rawDiagram = perspective.diagram
        if (rawDiagram === undefined) continue // 観点自体がdiagramキーを返していない(省略)
        if (!isValidAgentDiagram(rawDiagram)) {
          console.error(`図解データの形式が不正なため無視します(${topicId}/${key}): ${JSON.stringify(rawDiagram)}`)
          perspective.diagram = null
          continue
        }
        perspective.diagram = await resolveDiagram(topicId, key, date, rawDiagram)
      }
    }
  }

  return isUsableContent(parsed) ? parsed : null
}

// 1候補分の生成をmaxAttempts回まで試みる(design.md「エラーハンドリング」、
// weekly-publish/design.md「1週分の記事を生成する処理」手順4)。すべて失敗した場合はnullを返す
async function generateWithRetry(
  candidate: SelectedTopic,
  requirements: string,
  design: string,
  date: string,
  topicId: string
): Promise<GeneratedContent | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const responseText = await callClaudeCode(buildPrompt(candidate, requirements, design))
    const content = await parseAndResolveGeneratedContent(responseText, date, topicId)
    if (content) return content
    console.error(
      `候補の生成に失敗しました(${attempt}/${MAX_ATTEMPTS}回目): ${candidate.sourceName} - ${candidate.heading}`
    )
  }
  return null
}

async function main() {
  const selectionPath = process.argv[2]
  const candidateIndexArg = process.argv[3]
  if (!selectionPath || candidateIndexArg === undefined) {
    console.error('使い方: generate-content.ts <selection.jsonのパス> <candidateIndex>')
    process.exit(1)
  }

  const candidateIndex = Number(candidateIndexArg)
  if (!Number.isInteger(candidateIndex) || candidateIndex < 0) {
    console.error(`candidateIndexが不正です: ${candidateIndexArg}`)
    process.exit(1)
  }

  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    console.error('CLAUDE_CODE_OAUTH_TOKEN が環境変数に設定されていません(GitHub Actions Secretsの設定。weekly-publish/design.md「実行環境の前提」参照)')
    process.exit(1)
  }

  const selection = JSON.parse(fs.readFileSync(selectionPath, 'utf8')) as { date: string } & SelectionResult
  if (selection.status !== 'ok') {
    console.error('選定結果がスキップのため、要約生成の対象がありません')
    process.exit(1)
  }

  const candidate = selection.topics[candidateIndex]
  if (!candidate) {
    console.error(`candidateIndex=${candidateIndex}に対応する候補がありません(選定件数: ${selection.topics.length}件)`)
    process.exit(1)
  }

  const requirements = fs.readFileSync(REQUIREMENTS_PATH, 'utf8')
  const design = fs.readFileSync(DESIGN_PATH, 'utf8')

  // 図解の保存ファイル名に使う識別子(design.md「図解を生成する処理」手順3)。
  // 最終的なTopic.idはassembleArticle.ts側が生成失敗した候補を除外した後に採番するため、
  // ここではcandidateIndexから決定的に導出した仮の識別子を使う(一意なファイル名を得れば十分で、
  // 最終的なTopic.idと厳密に一致させる必要はない)
  const topicId = `topic-${candidateIndex + 1}`

  let content: GeneratedContent | null
  try {
    content = await generateWithRetry(candidate, requirements, design, selection.date, topicId)
  } catch (error) {
    if (error instanceof QuotaExhaustedError) {
      // 1候補だけの単純な失敗(exit 1)とは異なる専用の終了コードで区別する。
      // 呼び出し元(news-digest-weekly.yml)はexit 2をその週全体の打ち切りとして扱う
      console.error(error.message)
      process.exit(2)
    }
    throw error
  }
  if (!content) {
    console.error(`候補の生成に${MAX_ATTEMPTS}回失敗したため、この候補を除外してください: ${candidate.sourceName} - ${candidate.heading}`)
    process.exit(1)
  }

  process.stdout.write(JSON.stringify(content, null, 2) + '\n')
}

// CLIとして直接実行された場合のみmain()を起動する(テストからcallClaudeCodeをimportした際に
// CLI(process.exit等)が動いてしまわないようにするガード)
const isMainModule = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMainModule) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
