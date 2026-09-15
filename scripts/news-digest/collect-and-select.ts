// 収集+選定のCLI化(仕様: design.md「関連するファイル(抜粋)」)。TDD対象外
// (tasks.md Task7。fetchCandidates/選定ロジック自体はTask3〜5でテスト済みの薄い呼び出しであり、
// エージェント呼び出し自体もプロンプト組み立てに検証可能な決定的ロジックがないため)。
// 応答のJSONパース・フォールバックのみapp/news-digest/lib/judgeCandidates.tsに切り出してテストする
// (tasks.md Task6)。
//
// 各情報源から新着候補を収集 → 掲載済み記事を除外 → カテゴリごとにClaude Code CLI(`claude -p`)を
// ヘッドレス起動してグループ化・採用基準判定 → 件数上限を適用、までを行い、選定結果JSONを
// 標準出力する。GitHub Actions(weekly-publish)が週次実行時にこのスクリプトを呼び出す。
//
// 実行方法: CLAUDE_CODE_OAUTH_TOKEN=xxx npx tsx scripts/news-digest/collect-and-select.ts 2026-09-14
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fetchAllCandidates, fetchHttpClient, buildSourceHealthLogLines } from '../../app/news-digest/lib/fetchCandidates'
import { excludeAlreadyPublished, selectWeeklyTopics } from '../../app/news-digest/lib/selection'
import { parseAgentJudgment, toJudgedCandidates } from '../../app/news-digest/lib/judgeCandidates'
import type { WatchlistEntry, Criteria, CategoryId } from '../../app/news-digest/lib/watchlistTypes'
import type { Candidate, JudgedCandidate } from '../../app/news-digest/lib/candidateTypes'
import type { Article } from '../../app/news-digest/lib/types'
import watchlistData from '../../content/news-digest/watchlist.json'
import criteriaData from '../../content/news-digest/criteria.json'

const execFileAsync = promisify(execFile)

const watchlist = watchlistData as WatchlistEntry[]
const criteria: Criteria = criteriaData

const ARTICLES_DIR = path.join(process.cwd(), 'content/news-digest/articles')

// 総合・経済/ビジネス: 「複数の主要メディアが同時に報じているか」の意味的な判定を、専用枠
// (神奈川ローカル・育児)は「その週で最も重要と判断される1件はどれか」の意味的な判定を、
// それぞれエージェントの推論に委ねる(design.md「設計の前提」)
const CORROBORATED_CATEGORIES: CategoryId[] = ['general', 'business']
const DEDICATED_CATEGORIES: CategoryId[] = ['kanagawa', 'childcare']

const RESPONSE_FORMAT_NOTE = `候補ごとに次のJSON形式のみを配列で返してください(前後に説明文・コードブロックの装飾を付けない)。要約本文は書かないでください(このあとの要約生成の担当ではありません):
[{"heading": "原文タイトル(代表候補のもの)", "category": "カテゴリID", "sourceName": "代表候補の発信者名", "sourceUrl": "代表候補の元URL", "sourcePublishedAt": "代表候補の公開日時(ISO 8601)", "meetsCriteria": true, "corroboratingSources": ["裏付けた情報源名", "..."]}]
判定に迷う場合(グループ化が曖昧、情報源の内容が薄い等)は、無理に基準を満たすと判定せず meetsCriteria: false としてください。この処理はヘッドレス実行のため、運営者に判断を仰ぐ質問文や選択肢を返してはいけません(返答する相手がいません)。採用に値する候補が1件もない場合は空配列 [] を返してください。`

function buildCorroboratedPrompt(category: CategoryId, candidates: Candidate[]): string {
  const list = candidates.map((c) => `- 発信者: ${c.sourceName} / 見出し: ${c.heading} / URL: ${c.url} / 公開日時: ${c.publishedAt}`).join('\n')
  return `あなたはニュースダイジェストの編集者です。カテゴリ「${category}」の以下の候補について、同じ出来事を報じている候補同士をグループにまとめ、含まれる情報源の数が${criteria.minCorroboratingSources}社以上のグループを「採用基準を満たす候補」(meetsCriteria: true)としてください。グループ内で最も詳しく報じている1件(または公開日時が最も新しい1件)を代表候補として残してください。WebSearch/WebFetchで各候補の元記事・関連報道を確認して構いません。

# 候補一覧
${list}

${RESPONSE_FORMAT_NOTE}`
}

function buildDedicatedPrompt(category: CategoryId, candidates: Candidate[]): string {
  const list = candidates.map((c) => `- 発信者: ${c.sourceName} / 見出し: ${c.heading} / URL: ${c.url} / 公開日時: ${c.publishedAt}`).join('\n')
  return `あなたはニュースダイジェストの編集者です。カテゴリ「${category}」は運営者にとって直接影響のある専用枠です。以下の候補から、運営者(読者)の生活・地域・仕事への影響度の観点で、その週で最も重要と判断される1件だけを選んでください。選んだ1件が複数の主要メディア(${criteria.minCorroboratingSources}社以上)でも報じられている場合はその旨も記録してください(meetsCriteria: true、corroboratingSourcesに裏付けた情報源名を列挙)。1社のみの報道であればmeetsCriteria: falseとし、corroboratingSourcesには選んだ候補自身の情報源名のみを入れてください。WebSearch/WebFetchで内容を確認して構いません。

# 候補一覧
${list}

${RESPONSE_FORMAT_NOTE}(この専用枠では配列の要素は最大1件です)`
}

// Claude Code CLIを非対話モード(-p)で1回呼び出し、応答テキスト(result)を返す。
// 起動自体に失敗した場合も例外を投げず空文字を返し、呼び出し元のparseAgentJudgmentが
// 「候補なし」として扱う(1カテゴリの判定失敗で週次実行全体を止めない。design.md「エラーハンドリング」)
async function callClaudeCode(prompt: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      'claude',
      ['-p', prompt, '--output-format', 'json', '--dangerously-skip-permissions'],
      { maxBuffer: 1024 * 1024 * 32 }
    )
    const parsed = JSON.parse(stdout) as { result?: string }
    return parsed.result ?? ''
  } catch (error) {
    const withStdout = error as { stdout?: string }
    if (withStdout.stdout) {
      try {
        const parsed = JSON.parse(withStdout.stdout) as { result?: string }
        return parsed.result ?? ''
      } catch {
        // stdoutがJSONでない場合は下のフォールバックに回す
      }
    }
    console.error(`Claude Code CLIの起動に失敗しました: ${(error as Error).message}`)
    return ''
  }
}

// カテゴリごとに候補をグループ化し、採用基準を判定する(design.md「候補をグループ化し採用基準を
// 判定する処理」)。1カテゴリの判定失敗(応答が指定形式でない)はそのカテゴリを候補なしとして扱い、
// 他のカテゴリの処理を続ける
async function judgeAllCategories(candidatesByCategory: Map<CategoryId, Candidate[]>): Promise<JudgedCandidate[]> {
  const judged: JudgedCandidate[] = []

  for (const category of [...CORROBORATED_CATEGORIES, ...DEDICATED_CATEGORIES]) {
    const candidates = candidatesByCategory.get(category) ?? []
    if (candidates.length === 0) {
      console.error(`カテゴリ「${category}」: 掲載済み除外後の候補が0件のためエージェント判定をスキップします`)
      continue
    }

    const prompt = CORROBORATED_CATEGORIES.includes(category)
      ? buildCorroboratedPrompt(category, candidates)
      : buildDedicatedPrompt(category, candidates)
    const responseText = await callClaudeCode(prompt)
    const items = parseAgentJudgment(responseText)
    if (items.length === 0) {
      console.error(`カテゴリ「${category}」: エージェント応答を指定形式で解釈できず候補なしとして扱います`)
      continue
    }

    judged.push(...toJudgedCandidates(items, candidates))
  }

  return judged
}

// 掲載済み記事の元URLを全記事から集める(期間で絞らず全件。design.md「掲載済み記事を除外する処理」手順1)
function collectPublishedSourceUrls(): Set<string> {
  const urls = new Set<string>()
  if (!fs.existsSync(ARTICLES_DIR)) return urls
  for (const file of fs.readdirSync(ARTICLES_DIR)) {
    if (!file.endsWith('.json')) continue
    const article = JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8')) as Article
    for (const topic of article.topics) {
      if (topic.sourceUrl) urls.add(topic.sourceUrl)
    }
  }
  return urls
}

function groupByCategory(candidates: Candidate[]): Map<CategoryId, Candidate[]> {
  const map = new Map<CategoryId, Candidate[]>()
  for (const candidate of candidates) {
    const list = map.get(candidate.category) ?? []
    list.push(candidate)
    map.set(candidate.category, list)
  }
  return map
}

async function main() {
  const date = process.argv[2]
  if (!date) {
    console.error('使い方: collect-and-select.ts <YYYY-MM-DD>')
    process.exit(1)
  }

  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    console.error('CLAUDE_CODE_OAUTH_TOKEN が環境変数に設定されていません(GitHub Actions Secretsの設定)')
    process.exit(1)
  }

  const { candidates, stats } = await fetchAllCandidates(watchlist, fetchHttpClient)
  console.error('情報源ごとの取得件数:')
  for (const line of buildSourceHealthLogLines(stats)) console.error(`  ${line}`)
  console.error(`情報源からの取得候補数: ${candidates.length}件`)

  const publishedUrls = collectPublishedSourceUrls()
  console.error(`掲載済み記事の元URL: ${publishedUrls.size}件(当該週の候補から除外対象)`)
  const unpublished = excludeAlreadyPublished(candidates, publishedUrls)

  const judged = await judgeAllCategories(groupByCategory(unpublished))
  const result = selectWeeklyTopics(judged, criteria)

  if (result.status === 'skipped') {
    console.error(`候補不足によりスキップします: ${result.reason}`)
  } else {
    const belowCriteriaCount = result.topics.filter((t) => t.belowCriteria).length
    console.error(`選定件数: ${result.topics.length}件(うち基準未達: ${belowCriteriaCount}件)`)
  }

  process.stdout.write(JSON.stringify({ date, ...result }, null, 2) + '\n')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
