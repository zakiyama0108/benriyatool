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
//
// 実行方法: CLAUDE_CODE_OAUTH_TOKEN=xxx npx tsx scripts/news-digest/generate-content.ts <selection.jsonのパス> <candidateIndex>
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { isUsableContent, isQuotaExhaustionError, type GeneratedContent } from '../../app/news-digest/lib/generateContent'
import type { SelectedTopic, SelectionResult } from '../../app/news-digest/lib/candidateTypes'

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

WebFetch/WebSearchツールで元URLの内容を把握したうえで、次のJSON形式のみを出力してください。前後に説明文・コードブロックの装飾(\`\`\`等)を付けず、JSONオブジェクト単体で応答してください。**この処理はヘッドレス実行のため、運営者に判断を仰ぐ質問文や選択肢を返してはいけません(返答する相手がいません)。** 元URLの内容を十分に取得できなかった場合でも、確認できた情報の範囲で書けるところまで書いてJSONを返してください。それも困難な場合は無理に内容を創作せず、\`summary\`を\`null\`にしたJSON(\`{"heading": "...", "importance": 1, "summary": null}\`)を返してください(いずれの場合も聞き返さない):

{"heading": "この記事から何が得られるか(結論・要点)が伝わる見出し(原文タイトルの逐語的な言い換えにとどめない)", "importance": 4, "summary": {"whatHappened": {"heading": "結論・要点を含む見出し", "teaser": "60〜120字程度の導入文", "detail": "展開表示する詳細文"}, "whyItMatters": {"heading": "...", "teaser": "...", "detail": "..."}, "background": {"heading": "...", "teaser": "...", "detail": "..."}, "outlook": {"heading": "...", "teaser": "...", "detail": "..."}}}`
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

// エージェント応答テキストからJSONオブジェクトを抽出・検証する。抽出・パース・検証いずれかに
// 失敗した場合はnullを返す(design.md「要約を書く処理」手順10、design.md「エラーハンドリング」)
function parseGeneratedContent(responseText: string): GeneratedContent | null {
  const match = responseText.match(/\{[\s\S]*\}/)
  if (!match) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return null
  }
  return isUsableContent(parsed) ? parsed : null
}

// 1候補分の生成をmaxAttempts回まで試みる(design.md「エラーハンドリング」、
// weekly-publish/design.md「1週分の記事を生成する処理」手順4)。すべて失敗した場合はnullを返す
async function generateWithRetry(
  candidate: SelectedTopic,
  requirements: string,
  design: string
): Promise<GeneratedContent | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const responseText = await callClaudeCode(buildPrompt(candidate, requirements, design))
    const content = parseGeneratedContent(responseText)
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

  let content: GeneratedContent | null
  try {
    content = await generateWithRetry(candidate, requirements, design)
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
