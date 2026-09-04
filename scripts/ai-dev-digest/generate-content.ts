// 要約生成CLI(仕様: content-generation/design.md「要約を書く処理」、daily-publish/design.md
// 「1日分の記事を生成する処理」手順4-5・「エラーハンドリング」)。TDD対象外(Claude Code CLIのヘッドレス起動を伴い、
// プロンプト組み立て自体に検証可能な決定的ロジックがないため)。ただし応答の分類・リトライ・除外・枯渇打ち切りの
// 決定的ロジックはapp/ai-dev-digest/lib/generateContent.tsに切り出し、__tests__/ai-dev-digest/lib/
// generateContent.test.tsで検証する(content-generation/tasks.md Task 8-9)。
//
// content-selection/collect-and-select.tsが出力した選定結果(SelectionResult)を受け取り、採用された候補
// 1件ずつについてClaude Code CLI(`claude -p`)をヘッドレス起動し、日本語の見出し・章立て要約を生成する。
// 1候補の生成が一時的に失敗した場合はリトライし、それでも失敗する候補は除外して残りで公開する。全候補失敗・
// 利用枠枯渇時は非ゼロ終了し、GitHub Actionsの実行を失敗(赤)として残す(daily-publish/requirements.md#掲載件数の保証-3)。
// 認証はAnthropic APIの従量課金ではなく運営者個人のClaude Code Pro/Maxサブスクリプション(CLAUDE_CODE_OAUTH_TOKEN)を使う。
//
// 実行方法: CLAUDE_CODE_OAUTH_TOKEN=xxx npx tsx scripts/ai-dev-digest/generate-content.ts <selection.jsonのパス>
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { extractYoutubeVideoId } from '../../app/ai-dev-digest/lib/youtubeUrl'
import type { GeneratedTopicInput } from '../../app/ai-dev-digest/lib/assembleArticle'
import type { SelectedTopic, SelectionResult } from '../../app/ai-dev-digest/lib/candidateTypes'
import { generateTopics, type ClaudeCliResponse } from '../../app/ai-dev-digest/lib/generateContent'

const execFileAsync = promisify(execFile)

const REQUIREMENTS_PATH = path.join(process.cwd(), 'specs/ai-dev-digest/content-generation/requirements.md')
const DESIGN_PATH = path.join(process.cwd(), 'specs/ai-dev-digest/content-generation/design.md')

// content-generation/design.md「要約を書く処理」のガードレール文言をそのまま転記する
// (daily-publishの実行指示に必ず含める運用。requirements.md#エージェントの逸脱防止-8の具体化)
const GUARDRAIL = `この記事で扱ってよい話題は、content-selectionの採用基準に基づき選定された候補のみである。選定候補に含まれない話題(政治・時事ネタ等)を、AI駆動開発に関連付けて新たに追加してはならない。要約(導入文・詳細文とも)は独自の章立てで再構成した解説とし、原文の段落構成・表現の順序をそのままなぞってはならない。原文の詳細な数値・結論を網羅的に転記してはならない。`

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

WebFetchツールで元URLの内容を把握したうえで、次のJSON形式のみを出力してください。前後に説明文・コードブロックの装飾(\`\`\`等)を付けず、JSONオブジェクト単体で応答してください。**この処理はヘッドレス実行のため、運営者に判断を仰ぐ質問文や選択肢を返してはいけません(返答する相手がいません)。** 元URLの内容を十分に取得できなかった場合でも、確認できた情報の範囲で書けるところまで書いてJSONを返してください。それも困難な場合は無理に内容を創作せず、\`summary\`を\`null\`にしたJSON(\`{"heading": "...", "importance": 1, "summary": null}\`)を返してください(いずれの場合も聞き返さない):

{"heading": "この記事から何が得られるか(結論・要点)が伝わる見出し(原文タイトルの逐語的な言い換えにとどめない)", "importance": 4, "summary": {"benefit": {"heading": "結論・メリットを含む見出し", "teaser": "60〜120字程度の導入文", "detail": "展開表示する詳細文"}, "whatsNew": {"heading": "...", "teaser": "...", "detail": "..."}, "how": {"heading": "...", "teaser": "...", "detail": "..."}, "howToUse": {"heading": "...", "teaser": "...", "detail": "..."}}}`
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

  // 1候補ずつ生成する。一時的失敗はリトライ→ダメなら除外、利用枠枯渇・全候補失敗は例外を投げ、
  // 下のmain().catchが非ゼロ終了させる(→後続のpush/PR作成が走らず、Actionsの実行が赤で残る)
  const generated = await generateTopics(
    selection.topics,
    (candidate) => callClaudeCode(buildPrompt(candidate, requirements, design)),
    {
      onExcluded: ({ candidate, attempts, detail }) => {
        console.error(
          `候補の生成に失敗したため除外します(${attempts}回試行): ${candidate.sourceName} - ${candidate.heading} / 理由: ${detail}`,
        )
      },
    },
  )

  const topics: GeneratedTopicInput[] = generated.map(({ candidate, content }) => ({
    heading: content.heading,
    summary: content.summary,
    importance: content.importance,
    sourceType: candidate.sourceType,
    sourceName: candidate.sourceName,
    sourceUrl: candidate.url,
    sourcePublishedAt: candidate.publishedAt,
    belowCriteria: candidate.belowCriteria,
    ...(extractYoutubeVideoId(candidate.url) ? { youtubeVideoId: extractYoutubeVideoId(candidate.url) } : {}),
    ...(candidate.shortfallReason ? { belowCriteriaReason: candidate.shortfallReason } : {}),
  }))

  process.stdout.write(JSON.stringify(topics, null, 2) + '\n')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
