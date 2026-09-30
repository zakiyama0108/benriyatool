// 見出し・本文生成CLI(仕様: content-generation/design.md「見出し・本文を書く処理」)。TDD対象外
// (Claude Code CLIのヘッドレス起動とプロンプトの組み立てで、検証可能な決定的ロジックは
// app/research-digest/lib/generateContent.tsに切り出し、テスト済みのため。tasks.md Task 6参照)。
//
// collect-and-select.tsが出力した選定結果を受け取り、採用された候補(status: 'selected')
// 1件ずつについてClaude Code CLI(`claude -p`)をヘッドレス起動し、見出し・本文を生成する。
// 1候補の生成が一時的に失敗した場合はやり直し、それでも失敗する候補は「生成に失敗したジャンル」として
// 除き残りで公開する(採用0件・全件失敗でも公開をスキップしない。weekly-publish/requirements.md#掲載件数の保証-4)。
// 利用上限への到達を検知した場合はここで非ゼロ終了し、後続のwrite-article.ts(公開)には進まない
// (weekly-publish/design.md「1回分の記事を生成する処理」手順4)。
// 認証は運営者個人のClaude Code Pro/Maxサブスクリプション(CLAUDE_CODE_OAUTH_TOKEN)を使う。
//
// 実行方法: CLAUDE_CODE_OAUTH_TOKEN=xxx npx tsx scripts/research-digest/generate-content.ts <selection.jsonのパス>
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import type { Candidate, GenreResult } from '../../app/research-digest/lib/candidateTypes'
import { GENRE_LABELS, IMPACT_LABELS } from '../../app/research-digest/lib/types'
import { generateFindings, type ClaudeCliResponse } from '../../app/research-digest/lib/generateContent'

const execFileAsync = promisify(execFile)

const REQUIREMENTS_PATH = path.join(process.cwd(), 'specs/research-digest/content-generation/requirements.md')
const DESIGN_PATH = path.join(process.cwd(), 'specs/research-digest/content-generation/design.md')

// content-generation/design.md「見出し・本文を書く処理」の「プロンプトに必ず含めるガードレール文言」をそのまま転記する
const GUARDRAIL = `この記事で扱ってよいのは、渡された論文・公式発表に書かれている研究結果だけである。元の構成・表現の順序をなぞらず独自に書き直し、数値・全文を網羅的に転記しない。研究結果を実際より確かなもの・効果の大きいものとして書かず、研究の限界を注意点に書く。健康に関わる研究では、読者に個別の治療・服薬の開始・中止・変更を勧めない。元にない内容を推測で断定しない。渡された影響度・その根拠・査読前かどうかは事実として扱い、それと異なることを書かない。査読前の論文であれば、そのことを注意点に必ず書く。`

function buildPrompt(candidate: Candidate, requirements: string, design: string): string {
  return `あなたは「週刊研究発見」の記事執筆を担当するエージェントです。以下の要件定義・設計に厳密に従って、指定された研究の見出し・本文を日本語で執筆してください。

# 要件定義(content-generation/requirements.md)
${requirements}

# 設計(content-generation/design.md)
${design}

# 厳守事項
${GUARDRAIL}

# 対象研究
- ジャンル: ${GENRE_LABELS[candidate.genre] ?? candidate.genre}(${candidate.genre})
- 影響度: ${IMPACT_LABELS[candidate.impact]}(${candidate.impact})
- 影響度の根拠: ${candidate.impactReason}
- 論文名(公式発表のタイトル): ${candidate.sourceTitle}
- 掲載誌名・発表元: ${candidate.sourceName}
- 元URL: ${candidate.sourceUrl}
- DOI: ${candidate.doi ?? 'なし'}
- 発表年: ${candidate.publishedYear ?? '不明'}
- 査読前の論文(プレプリント): ${candidate.isPreprint ? 'はい(査読前であることを本文の注意点に必ず書くこと)' : 'いいえ'}

WebFetchツールで元URLの内容を把握したうえで(有料で全文を読めない場合は、要旨・公式発表など公開されている範囲で把握する)、次のJSON形式のみを出力してください。前後に説明文・コードブロックの装飾(\`\`\`等)を付けず、JSONオブジェクト単体で応答してください。**この処理はヘッドレス実行のため、運営者に判断を仰ぐ質問文や選択肢を返してはいけません(返答する相手がいません)。** 元URLの内容を十分に取得できなかった場合でも、渡された情報の範囲で書けるところまで書いてJSONを返してください。それも困難な場合は無理に内容を創作せず、\`heading\`を\`null\`にしたJSON(\`{"heading": null, "body": null}\`)を返してください(いずれの場合も聞き返さない):

{"heading": "何が分かったかが一目で分かる1文の見出し", "body": "200〜400字程度の本文(何が分かったか・どう調べたか〈方法・規模〉・暮らしにどう関わるか・注意点)"}`
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
    const { stdout } = await execFileAsync('claude', buildClaudeArgs(prompt), { maxBuffer: 1024 * 1024 * 32 })
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

  const selection = JSON.parse(fs.readFileSync(selectionPath, 'utf8')) as { genreResults: GenreResult[] }
  const selectedCandidates = selection.genreResults
    .filter((r): r is Extract<GenreResult, { status: 'selected' }> => r.status === 'selected')
    .map((r) => r.candidate)

  if (selectedCandidates.length === 0) {
    console.error('採用された候補が0件のため、生成をスキップします')
    process.stdout.write(JSON.stringify({ findings: [], failedGenres: [] }, null, 2) + '\n')
    return
  }

  const requirements = fs.readFileSync(REQUIREMENTS_PATH, 'utf8')
  const design = fs.readFileSync(DESIGN_PATH, 'utf8')

  // 1候補ずつ生成する。一時的失敗はやり直し→ダメなら「生成に失敗したジャンル」として除く。
  // 利用枠枯渇はQuotaExhaustedErrorとしてここから外へ伝播し、下のmain().catchが非ゼロ終了させる
  // (→後続のwrite-article.tsが走らず、Actionsの実行が赤で残る)
  const result = await generateFindings(
    selectedCandidates,
    (candidate) => callClaudeCode(buildPrompt(candidate, requirements, design)),
    {
      onExcluded: ({ candidate, attempts, detail }) => {
        console.error(`${candidate.genre}: 生成失敗(${attempts}回試行) 理由: ${detail}`)
      },
    },
  )

  // 1本ごとに、生成の成否・本文の文字数を実行ログに出す(本文そのものはログに出さない。
  // 失敗時の理由は上のonExcludedで出している。design.md「ログ」)
  for (const { finding } of result.succeeded) {
    console.error(`${finding.genre}: 生成成功(本文${finding.body.length}字)`)
  }
  console.error(`生成成功: ${result.succeeded.length}件 / 生成失敗: ${result.failed.length}件`)

  process.stdout.write(
    JSON.stringify(
      {
        findings: result.succeeded.map((r) => r.finding),
        failedGenres: result.failed.map((f) => f.candidate.genre),
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
