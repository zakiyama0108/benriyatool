'use client'
import type { InvestmentModeInput } from '../lib/types'
import HelpIcon from './HelpIcon'
import { CONTEXT_HELP_TEXT } from '../lib/usageGuideContent'

type Props = {
  value: InvestmentModeInput
  onChange: (value: InvestmentModeInput) => void
  openHelpId: string | null
  onToggleHelp: (id: string) => void
  onCloseHelp: () => void
}

// 「貯蓄のみ」/「資産運用」の切り替えと、資産運用選択時のみ表示する想定利回り入力
// (仕様: requirements.md#貯蓄/運用シミュレーションの切り替え-1、#貯蓄/運用シミュレーションの切り替え-2、
// #貯蓄/運用シミュレーションの切り替え-3)。カード自体の装飾・タイトル行は他カードに揃えて
// 新設したもの(仕様: usage-guide/design.md#関連するファイル(抜粋))
export default function ModeToggle({ value, onChange, openHelpId, onToggleHelp, onCloseHelp }: Props) {
  return (
    <div className="space-y-3 rounded-[18px] bg-lms-card p-5 shadow-[0_10px_24px_-16px_rgba(20,158,146,0.35)]">
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-bold text-lms-ink">貯蓄/運用切替</p>
        <HelpIcon
          id="investmentMode"
          text={CONTEXT_HELP_TEXT.investmentMode}
          openId={openHelpId}
          onToggle={onToggleHelp}
          onClose={onCloseHelp}
        />
      </div>
      <div role="tablist" className="flex rounded-full bg-white p-1">
        <button
          type="button"
          role="tab"
          aria-selected={!value.investmentMode}
          onClick={() => onChange({ ...value, investmentMode: false })}
          className={`flex-1 rounded-full py-2 text-xs font-medium transition-colors ${
            !value.investmentMode ? 'bg-lms-teal text-white' : 'text-lms-muted'
          }`}
        >
          貯蓄のみ
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={value.investmentMode}
          onClick={() => onChange({ ...value, investmentMode: true })}
          className={`flex-1 rounded-full py-2 text-xs font-medium transition-colors ${
            value.investmentMode ? 'bg-lms-teal text-white' : 'text-lms-muted'
          }`}
        >
          資産運用
        </button>
      </div>
      {value.investmentMode && (
        <label className="block text-xs text-lms-muted">
          想定利回り(年率・%)
          <input
            type="number"
            value={Number.isFinite(value.expectedAnnualRate) ? value.expectedAnnualRate : ''}
            onChange={(e) => onChange({ ...value, expectedAnnualRate: e.target.valueAsNumber })}
            className="mt-1 w-full rounded-full border border-lms-line bg-white px-4 py-2 text-sm tabular-nums outline-none focus:border-lms-teal"
          />
        </label>
      )}
    </div>
  )
}
