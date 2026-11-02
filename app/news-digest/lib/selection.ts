import type { Candidate, JudgedCandidate, SelectedTopic, SelectionResult } from './candidateTypes'
import type { CategoryId, Criteria } from './watchlistTypes'

// 掲載済み記事の除外・件数上限の適用(仕様: requirements.md#掲載済み記事の再掲抑制-8、
// requirements.md#採用基準(カテゴリごとの定量判定)、requirements.md#1週あたりの掲載件数、
// design.md「掲載済み記事を除外する処理」「1週分のトピックを選び出す処理」)。
// 入出力が純粋なデータのみのため通常のvitestで完全にテストできる

// 掲載済み記事の除外用にURLを正規化する(design.md「掲載済み記事を除外する処理」手順2)。
// ホスト名の小文字化・クエリ文字列とフラグメントの除去・末尾スラッシュの統一を行う
// (情報源のCMS差し替えで追跡パラメータ等が変わっても再掲を検知できるようにする)。
// URLとして解釈できない文字列は素の文字列のまま返す(誤って除外しないため)
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim())
    u.hostname = u.hostname.toLowerCase()
    u.search = ''
    u.hash = ''
    u.pathname = u.pathname.replace(/\/+$/, '') || '/'
    return u.toString()
  } catch {
    return raw.trim()
  }
}

// 過去に掲載したダイジェスト記事で既に取り上げた記事(元URLが一致するもの)を、採用条件を
// 満たしていても当該週の採用候補から除外する(requirements.md#掲載済み記事の再掲抑制-8)。
// 掲載済みURL集合は引数で受け取り(実行主体はcollect-and-select.ts)、正規化したうえで
// 完全一致で突き合わせる
export function excludeAlreadyPublished(candidates: Candidate[], publishedUrls: Set<string>): Candidate[] {
  const normalizedPublished = new Set([...publishedUrls].map(normalizeUrl))
  return candidates.filter((candidate) => !normalizedPublished.has(normalizeUrl(candidate.url)))
}

// 発表時点の気象状況を伝える記事を示す見出しの語(requirements.md#発表時点の状況を伝える気象情報の除外-9)
const WEATHER_KEYWORDS = ['気象', '警報', '注意報', '天気', '大雨', '豪雨', '台風', '暴風', '大雪', '雨']
// 気象情報を「過去のもの」とみなす経過時間。週次実行の2日前までの天候情報は公開時点で既に過ぎているため48時間とする
const STALE_WEATHER_MS = 48 * 60 * 60 * 1000

// 気象関連の見出しで、公開から48時間以上経過した候補を除外する
// (requirements.md#発表時点の状況を伝える気象情報の除外-9)。公開日時が解釈できない候補は残す
export function excludeStaleWeatherInfo(candidates: Candidate[], now: Date): Candidate[] {
  return candidates.filter((candidate) => {
    if (!WEATHER_KEYWORDS.some((keyword) => candidate.heading.includes(keyword))) return true
    const publishedMs = Date.parse(candidate.publishedAt)
    if (Number.isNaN(publishedMs)) return true
    return now.getTime() - publishedMs < STALE_WEATHER_MS
  })
}

// 総合・経済/ビジネス: 2社以上の裏付けがある候補(meetsCriteria: true)を公開日時が新しい順に
// weeklyTopicCountMaxまで採用する。0件のカテゴリはその週その カテゴリの掲載なしとする
// (requirements.md#1週あたりの掲載件数-7。架空の話題を作らない)
function selectCorroboratedCategory(candidates: JudgedCandidate[], category: CategoryId, max: number): SelectedTopic[] {
  return candidates
    .filter((c) => c.category === category && c.meetsCriteria)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, max)
    .map((c) => ({ ...c, belowCriteria: false }))
}

// 基準未達の乖離内容を人が読める文言にする(design.md「1週分のトピックを選び出す処理」手順2)
function describeBelowCriteria(candidate: JudgedCandidate, criteria: Criteria): string {
  return `裏付けメディアが${candidate.corroboratingSources.length}社(基準${criteria.minCorroboratingSources}社)`
}

// 神奈川ローカル・育児: エージェントが選んだ1件をそのまま採用する。[4]の基準未達
// (meetsCriteria: false)の場合はbelowCriteria: trueとし、乖離内容をbelowCriteriaReasonに設定する
// (requirements.md#採用基準(カテゴリごとの定量判定)-5)。その週に候補が1件もない場合のみ、
// そのカテゴリの掲載なしとする
function selectDedicatedCategory(candidates: JudgedCandidate[], category: CategoryId, criteria: Criteria): SelectedTopic[] {
  const picked = candidates.find((c) => c.category === category)
  if (!picked) return []
  if (picked.meetsCriteria) return [{ ...picked, belowCriteria: false }]
  return [{ ...picked, belowCriteria: true, belowCriteriaReason: describeBelowCriteria(picked, criteria) }]
}

// 1週分のトピックを選び出す(仕様: requirements.md#1週あたりの掲載件数-6〜7、
// design.md「1週分のトピックを選び出す処理」)
export function selectWeeklyTopics(judgedCandidates: JudgedCandidate[], criteria: Criteria): SelectionResult {
  const topics: SelectedTopic[] = [
    ...selectCorroboratedCategory(judgedCandidates, 'general', criteria.weeklyTopicCountMax.general),
    ...selectCorroboratedCategory(judgedCandidates, 'business', criteria.weeklyTopicCountMax.business),
    ...selectDedicatedCategory(judgedCandidates, 'kanagawa', criteria),
    ...selectDedicatedCategory(judgedCandidates, 'childcare', criteria),
  ]

  // 全カテゴリが掲載なしになった場合は「候補不足によりスキップ」として扱う
  // (design.md「1週分のトピックを選び出す処理」手順3、「エラーハンドリング」)
  if (topics.length === 0) {
    return { status: 'skipped', reason: '該当週に採用できる候補が1件もありませんでした' }
  }

  return { status: 'ok', topics }
}
