import type { Candidate, JudgedCandidate, SelectedTopic, SelectionResult } from './candidateTypes'
import type { Criteria } from './watchlistTypes'

// 採用基準の判定・1日分のトピック選定(仕様: requirements.md#採用基準(種別ごとの定量判定)、
// requirements.md#1日の掲載件数、design.md「採用基準を判定する処理」「1日分のトピックを
// 選び出す処理」)。入出力が純粋なデータのみのため通常のvitestで完全にテストできる

// 掲載済み記事の除外用にURLを正規化する(design.md「掲載済み記事を除外する処理」手順2)。
// ホスト名の小文字化・クエリ文字列とフラグメントの除去・末尾スラッシュの統一を行う
// (RSSフィードの移行やCMS差し替えで追跡パラメータ等が変わっても再掲を検知できるようにする)。
// URLとして解釈できない文字列は素の文字列のまま返す(誤って除外しないため)
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim())
    u.hostname = u.hostname.toLowerCase()
    u.search = ''
    u.hash = ''
    // 末尾スラッシュの統一: パス末尾のスラッシュを除去する(ルート"/"は残す)
    u.pathname = u.pathname.replace(/\/+$/, '') || '/'
    return u.toString()
  } catch {
    return raw.trim()
  }
}

// 過去に公開したダイジェスト記事で既に取り上げた記事・動画(元URLが一致するもの)を、
// 採用条件を満たしていても当日の採用候補から除外する(全種別が対象。requirements.md#掲載済み記事の再掲抑制-14)。
// 掲載済みURL集合は引数で受け取り(実行主体はcollect-and-select.ts)、正規化したうえで完全一致で突き合わせる
export function excludeAlreadyPublished(candidates: Candidate[], publishedUrls: Set<string>): Candidate[] {
  const normalizedPublished = new Set([...publishedUrls].map(normalizeUrl))
  return candidates.filter((candidate) => !normalizedPublished.has(normalizeUrl(candidate.url)))
}

// 情報源内の重複を抑制する(決定的なコード。design.md「情報源内の重複を抑制する処理」)。
// criteria.duplicateSuppressionSourceTypesに含まれる種別(初期値: individual-blog)は、
// 同じ情報源(sourceId)から同日に複数候補が挙がった場合、公開日時が最も新しい1件だけを残す
// (個人ブログは公式組織の告知と異なり同日に複数の短い投稿をすることがあるため。
// requirements.md#情報源内の重複掲載の抑制-13)
export function deduplicateSameSourceCandidates(candidates: Candidate[], criteria: Criteria): Candidate[] {
  const latestBySourceId = new Map<string, Candidate>()
  for (const candidate of candidates) {
    if (!criteria.duplicateSuppressionSourceTypes.includes(candidate.sourceType)) continue
    const current = latestBySourceId.get(candidate.sourceId)
    if (!current || candidate.publishedAt > current.publishedAt) {
      latestBySourceId.set(candidate.sourceId, candidate)
    }
  }
  return candidates.filter(
    (candidate) => !criteria.duplicateSuppressionSourceTypes.includes(candidate.sourceType) || latestBySourceId.get(candidate.sourceId) === candidate
  )
}

// 話題の関連性フィルタ(決定的なコード。design.md「話題の関連性フィルタを適用する処理」)。
// 原文タイトルにcriteria.topicExcludeKeywordsのいずれかが含まれる場合、大文字小文字を
// 区別せず除外する。他の採用基準(meetsCriteria)を満たしていても対象になる
// (requirements.md#話題の関連性-12)
export function isTopicExcluded(candidate: Candidate, criteria: Criteria): boolean {
  const heading = candidate.heading.toLowerCase()
  return criteria.topicExcludeKeywords.some((keyword) => heading.includes(keyword.toLowerCase()))
}

// 種別ごとの採用基準を満たすかを判定する。
// - official/individual-blog: 発信量が少なく信頼性が高いため無条件で採用候補にする(requirements.md#採用基準-4、#採用基準-6)
// - individual-youtube: チャンネルごとの規模差を吸収するため、直近平均再生回数の
//   youtubeAboveAverageRatio倍を「明確に上回る」場合のみ採用候補にする(超える、ではなく上回る=同値は不可。requirements.md#採用基準-5)
// - qiita/zenn: いいね数がそれぞれの閾値以上なら採用候補にする(requirements.md#採用基準-7、#採用基準-8)
export function meetsCriteria(candidate: Candidate, criteria: Criteria): boolean {
  switch (candidate.sourceType) {
    case 'official':
    case 'individual-blog':
      return true
    case 'individual-youtube': {
      const threshold = (candidate.recentAverageViews ?? 0) * criteria.youtubeAboveAverageRatio
      return candidate.metricValue > threshold
    }
    case 'qiita':
      return candidate.metricValue >= criteria.qiitaMinLikes
    case 'zenn':
      return candidate.metricValue >= criteria.zennMinLikes
  }
}

// 基準を満たさない候補について、どれだけ乖離しているかを人が読める文言にする
// (design.md「採用基準を判定する処理」手順6。例: "いいね数18件(基準30件に11件不足)")
export function describeShortfall(candidate: Candidate, criteria: Criteria): string {
  switch (candidate.sourceType) {
    case 'qiita': {
      const shortfall = criteria.qiitaMinLikes - candidate.metricValue
      return `いいね数${candidate.metricValue}件(基準${criteria.qiitaMinLikes}件に${shortfall}件不足)`
    }
    case 'zenn': {
      const shortfall = criteria.zennMinLikes - candidate.metricValue
      return `いいね数${candidate.metricValue}件(基準${criteria.zennMinLikes}件に${shortfall}件不足)`
    }
    case 'individual-youtube': {
      const threshold = Math.round((candidate.recentAverageViews ?? 0) * criteria.youtubeAboveAverageRatio)
      const shortfall = threshold - candidate.metricValue
      return `再生回数${candidate.metricValue}回(基準${threshold}回に${shortfall}回不足)`
    }
    case 'official':
    case 'individual-blog':
      // この2種別は常にmeetsCriteria=trueのため、乖離内容が呼ばれることはない
      return ''
  }
}

// 収集した候補1件ずつに、基準を満たすかどうかと(満たさない場合の)乖離内容を記録する
function judgeCandidate(candidate: Candidate, criteria: Criteria): JudgedCandidate {
  const meets = meetsCriteria(candidate, criteria)
  return meets ? { ...candidate, meetsCriteria: true } : { ...candidate, meetsCriteria: false, shortfallReason: describeShortfall(candidate, criteria) }
}

// 基準未達の候補を、基準からの乖離が小さい順(=採用に値する順)に並べる。
// 乖離の絶対量は種別ごとに単位が異なるため、種別を横断した統合スコアは作らない方針
// (requirements.md#スコープ外)だが、「不足分が少ない候補から補う」こと自体は
// 基準未達候補の中だけで種別を跨いで比較する必要がある(design.md#1日の掲載件数-10)。
// ここでは「基準値に対する不足の比率」を補充順の決定にのみ使う(表示・記録には使わない)
function shortfallRatio(candidate: Candidate, criteria: Criteria): number {
  switch (candidate.sourceType) {
    case 'qiita':
      return (criteria.qiitaMinLikes - candidate.metricValue) / criteria.qiitaMinLikes
    case 'zenn':
      return (criteria.zennMinLikes - candidate.metricValue) / criteria.zennMinLikes
    case 'individual-youtube': {
      const threshold = (candidate.recentAverageViews ?? 0) * criteria.youtubeAboveAverageRatio
      if (threshold === 0) return 1
      return (threshold - candidate.metricValue) / threshold
    }
    case 'official':
    case 'individual-blog':
      return 0
  }
}

// 基準を満たす候補が上限件数を超える場合、種別ができるだけ偏らないように分散させながら
// 新しい順に選ぶ(design.md「1日分のトピックを選び出す処理」手順1。要件は絞り込み方法を
// 定めていないため設計判断)。種別ごとに新しい順のキューを作り、種別を巡回しながら
// 1件ずつ取り出すことで、特定の種別に偏らない分散を実現する
function pickDiversified(candidates: JudgedCandidate[], count: number): JudgedCandidate[] {
  const sorted = [...candidates].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
  const queuesBySourceType = new Map<string, JudgedCandidate[]>()
  for (const candidate of sorted) {
    const queue = queuesBySourceType.get(candidate.sourceType) ?? []
    queue.push(candidate)
    queuesBySourceType.set(candidate.sourceType, queue)
  }

  const picked: JudgedCandidate[] = []
  let remaining = true
  while (picked.length < count && remaining) {
    remaining = false
    for (const queue of queuesBySourceType.values()) {
      if (picked.length >= count) break
      const next = queue.shift()
      if (next) {
        picked.push(next)
        remaining = true
      }
    }
  }
  return picked
}

// 1日分のトピックを選び出す(仕様: requirements.md#1日の掲載件数-9〜10、
// design.md「1日分のトピックを選び出す処理」)
export function selectDailyTopics(
  candidates: Candidate[],
  criteria: Criteria,
  publishedUrls: Set<string> = new Set()
): SelectionResult {
  if (candidates.length === 0) {
    return { status: 'skipped', reason: '収集した候補が1件もありませんでした' }
  }

  // フィルタの適用順(design.md「1日分のトピックを選び出す処理」):
  // 1. 掲載済み記事の除外 → 2. 情報源内の重複抑制 → 3. 話題の関連性フィルタ → 4. 採用基準 → 5. 件数調整

  // 1. 掲載済み記事を除外する(requirements.md#掲載済み記事の再掲抑制-14)
  const unpublished = excludeAlreadyPublished(candidates, publishedUrls)
  if (unpublished.length === 0) {
    return { status: 'skipped', reason: '収集した候補はすべて過去に掲載済みでした' }
  }

  // 2. 情報源内の重複抑制は話題の関連性フィルタ・採用基準の判定より前に適用する
  // (requirements.md#情報源内の重複掲載の抑制-13)
  const deduplicated = deduplicateSameSourceCandidates(unpublished, criteria)

  // 話題の関連性フィルタは採用基準の判定より前に適用する(除外された候補は、他の基準を
  // 満たしていても採用候補にも基準未達候補にもならない。requirements.md#話題の関連性-12)
  const eligible = deduplicated.filter((candidate) => !isTopicExcluded(candidate, criteria))
  if (eligible.length === 0) {
    return { status: 'skipped', reason: '収集した候補はすべて話題の関連性フィルタにより除外されました' }
  }

  const judged = eligible.map((candidate) => judgeCandidate(candidate, criteria))
  const meeting = judged.filter((c) => c.meetsCriteria)
  const notMeeting = judged.filter((c) => !c.meetsCriteria)
  const { min, max } = criteria.dailyTopicCount

  // 基準を満たす候補が上限を超える場合: 種別分散+新しい順でmax件に絞る
  if (meeting.length > max) {
    const selected = pickDiversified(meeting, max)
    return { status: 'ok', topics: selected.map((c) => ({ ...c, belowCriteria: false })) }
  }

  // 基準を満たす候補がmin〜max件: そのまま採用
  if (meeting.length >= min) {
    return { status: 'ok', topics: meeting.map((c) => ({ ...c, belowCriteria: false })) }
  }

  // 基準を満たす候補がmin件未満: 基準未達の候補を乖離が小さい順に補う
  const sortedShortfall = [...notMeeting].sort((a, b) => shortfallRatio(a, criteria) - shortfallRatio(b, criteria))
  const shortage = min - meeting.length
  const supplemented = sortedShortfall.slice(0, shortage)

  // candidates.length > 0 が保証されているため、meeting+supplementedは必ず1件以上になる
  // (実在する候補が1件以上ある限りスキップしない。requirements.md#1日の掲載件数-10)
  const topics: SelectedTopic[] = [
    ...meeting.map((c) => ({ ...c, belowCriteria: false })),
    ...supplemented.map((c) => ({ ...c, belowCriteria: true })),
  ]

  return { status: 'ok', topics }
}
