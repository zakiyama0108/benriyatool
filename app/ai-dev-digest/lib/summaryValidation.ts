import type { Importance, SummarySection, SummaryPerspective, TopicSummary, DomainPerspective } from './types'
import { hasDomainPerspective, DOMAIN_LABELS } from './types'

// 導入文(teaser)の分量検証(仕様: requirements.md#要約-3、design.md「要約の分量を検証する処理」手順2)。
// 「60〜120字程度」の「程度」を、最初に導入した要約分量チェック(目安100〜150字に対し±20字の許容幅)
// と同じ絶対値の許容幅として解釈し、40〜140字を有効範囲とする(要件は許容幅の数値までは定めていないため設計判断)。
export const TEASER_MIN_LENGTH = 40
export const TEASER_MAX_LENGTH = 140

export function isValidTeaserLength(teaser: string): boolean {
  return teaser.length >= TEASER_MIN_LENGTH && teaser.length <= TEASER_MAX_LENGTH
}

// 詳細文(detail)合計の分量検証(仕様: requirements.md#要約-4〜5、design.md「要約の分量を検証する処理」手順1・3)。
// 「1000〜1500字程度」の「程度」を、既存の要約分量チェック(目安100〜150字に対し80〜170字の許容幅=約±20%)
// と同じ比率の許容幅として解釈し、800〜1700字を有効範囲とする(要件は許容幅の数値までは定めていないため設計判断)。
export const DETAIL_TOTAL_MIN_LENGTH = 800
export const DETAIL_TOTAL_MAX_LENGTH = 1700

// 「複数のセクションに分けて構成する」は2件以上を必須とする制約であり、目安とされているのは
// セクションの数(2〜4程度)であって「複数であること」自体は目安ではない(design.md参照)
const MIN_SECTION_COUNT = 2

export function isValidDetailLength(sections: SummarySection[]): boolean {
  if (sections.length < MIN_SECTION_COUNT) return false
  if (
    sections.some(
      (section) => section.heading.length === 0 || section.teaser.length === 0 || section.detail.length === 0
    )
  ) {
    return false
  }

  const totalLength = sections.reduce((sum, section) => sum + section.detail.length, 0)
  return totalLength >= DETAIL_TOTAL_MIN_LENGTH && totalLength <= DETAIL_TOTAL_MAX_LENGTH
}

// 1観点分の内容検証(heading/teaser/detailが空文字でないこと、teaserが有効範囲であること)。
// summaryは呼び出し側でJSON由来の値をキャストして渡す場合があり、型上は必須のキーが実行時には
// 欠けている(undefined)ことがあるため、型チェックをすり抜けないよう明示的に確認する
function isValidPerspective(p: SummaryPerspective | undefined): p is SummaryPerspective {
  if (p === undefined) return false
  if (p.heading.length === 0 || p.teaser.length === 0 || p.detail.length === 0) return false
  return isValidTeaserLength(p.teaser)
}

// 🧭開発領域観点の追加検証(仕様: requirements.md#開発領域-15〜16、design.md「要約の分量を検証する処理」
// 手順2。2026-09追加)。domainsが1件以上の配列で、各要素がrequirements.md#開発領域-15で定める値
// (DOMAIN_LABELSのキー)のいずれかであることを確認する
function isValidDomainPerspective(p: DomainPerspective | undefined): boolean {
  if (!isValidPerspective(p)) return false
  const domains = p.domains
  if (!Array.isArray(domains) || domains.length === 0) return false
  return domains.every((domain) => domain in DOMAIN_LABELS)
}

// 固定4観点(TopicSummary)の分量検証(仕様: requirements.md#要約-2〜5、requirements.md#開発領域-15〜16、
// design.md「要約の分量を検証する処理」手順1〜3)。2026-08追加、2026-09拡張。
// hasDomainPerspectiveで新形式(domain/benefit/how/howToUse)・旧形式(benefit/whatsNew/how/howToUse)の
// どちらの4キー構成も受け付ける。各観点のheading/teaser/detailが空文字でないこと、各観点のteaserが
// 有効範囲(isValidTeaserLengthを再利用)であること、新形式はdomain.domainsの検証もあわせて行うこと、
// 4観点のdetail合計がDETAIL_TOTAL_MIN_LENGTH〜DETAIL_TOTAL_MAX_LENGTHの範囲内であることを確認する
export function isValidSummaryDetailLength(summary: TopicSummary): boolean {
  if (hasDomainPerspective(summary)) {
    if (!isValidDomainPerspective(summary.domain)) return false
    const perspectives = [summary.domain, summary.benefit, summary.how, summary.howToUse]
    if (perspectives.some((p) => !isValidPerspective(p))) return false
    const totalLength = perspectives.reduce((sum, p) => sum + p.detail.length, 0)
    return totalLength >= DETAIL_TOTAL_MIN_LENGTH && totalLength <= DETAIL_TOTAL_MAX_LENGTH
  }

  const perspectives = [summary.benefit, summary.whatsNew, summary.how, summary.howToUse]
  if (perspectives.some((p) => !isValidPerspective(p))) return false
  const totalLength = perspectives.reduce((sum, p) => sum + p.detail.length, 0)
  return totalLength >= DETAIL_TOTAL_MIN_LENGTH && totalLength <= DETAIL_TOTAL_MAX_LENGTH
}

// 重要度(importance)の検証(仕様: requirements.md#重要度-13)。2026-08追加。1〜5の整数であることを確認する
export function isValidImportance(value: unknown): value is Importance {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5
}
