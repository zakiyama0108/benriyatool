'use client'
import HelpIcon from './HelpIcon'
import { CONTEXT_HELP_TEXT } from '../lib/usageGuideContent'

type Props = {
  personalExpenseMonthly: number
  householdExpenseTotal: number
  hasSpouse: boolean
  expenseRatio: number | null
  monthlySurplus: number
  annualSurplus: number
  openHelpId: string | null
  onToggleHelp: (id: string) => void
  onCloseHelp: () => void
}

function formatManYen(amount: number): string {
  return `${Math.round(amount * 10) / 10}万円`
}

function Tile({ label, value, tone }: { label: string; value: string; tone: 'muted' | 'mint' | 'plain' }) {
  const tones = {
    muted: 'bg-lms-canvas',
    mint: 'bg-lms-teal-soft',
    plain: 'border border-lms-line-strong bg-white',
  }
  const valueTone = tone === 'mint' ? 'text-lms-teal' : 'text-lms-ink'
  return (
    <div className={`flex flex-col gap-1 rounded-[14px] px-4 py-3.5 ${tones[tone]}`}>
      <dt className="text-xs font-semibold text-lms-muted">{label}</dt>
      <dd className={`text-xl font-extrabold tabular-nums ${valueTone}`}>{value}</dd>
    </div>
  )
}

// 個人支出月合計・家計支出合計・支出割合・月次/年間余剰資金の計算結果表示
// (仕様: requirements.md#余剰資金の計算-3、#余剰資金の計算-4)
export default function BalanceSummary({
  personalExpenseMonthly,
  householdExpenseTotal,
  hasSpouse,
  expenseRatio,
  monthlySurplus,
  annualSurplus,
  openHelpId,
  onToggleHelp,
  onCloseHelp,
}: Props) {
  return (
    <div className="space-y-4 rounded-[18px] bg-white p-5 shadow-[0_10px_24px_-16px_rgba(20,158,146,0.35)]">
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-bold text-lms-ink">収支サマリー</p>
        <HelpIcon
          id="balanceSummary"
          text={CONTEXT_HELP_TEXT.balanceSummary}
          openId={openHelpId}
          onToggle={onToggleHelp}
          onClose={onCloseHelp}
        />
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <Tile label="個人支出の月合計" value={formatManYen(personalExpenseMonthly)} tone="muted" />
        {hasSpouse && <Tile label="家計支出全体の合計" value={formatManYen(householdExpenseTotal)} tone="muted" />}
        <div className="col-span-2 flex items-center gap-2 rounded-full bg-lms-sand-soft px-4 py-2 text-xs font-bold text-lms-sand-ink">
          <span>収入に対する支出割合</span>
          <span className="rounded-full bg-white px-2.5 py-0.5 text-sm tabular-nums">
            {expenseRatio === null ? '算出対象なし' : `${Math.round(expenseRatio * 100)}%`}
          </span>
        </div>
        <Tile label="月次余剰資金(賞与抜き)" value={formatManYen(monthlySurplus)} tone="mint" />
        <Tile label="年間余剰資金" value={formatManYen(annualSurplus)} tone="plain" />
      </dl>
    </div>
  )
}
