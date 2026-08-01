'use client'
import { useId, useState } from 'react'
import HelpIcon from './HelpIcon'

type Props = {
  title: string
  summary?: string
  helpId?: string
  helpText?: string
  openHelpId?: string | null
  onToggleHelp?: (id: string) => void
  onCloseHelp?: () => void
  defaultOpen?: boolean
  children: React.ReactNode
}

// 入力項目群を折りたたみ表示するアコーディオン。開閉状態はセクションごとに独立して持つ
// (「？」ヘルプのみ画面全体で1つに絞るため、既存のopenHelpId/onToggleHelp/onCloseHelpを素通しする)
// (仕様: asset-projection/design.md#画面設計)
export default function AccordionSection({
  title,
  summary,
  helpId,
  helpText,
  openHelpId,
  onToggleHelp,
  onCloseHelp,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  const buttonId = `${panelId}-button`

  return (
    <section className="overflow-hidden rounded-[35px] border border-lms-line-strong bg-lms-card shadow-[0_1px_2px_rgba(16,64,56,0.04)]">
      <div className="flex items-center gap-1.5 pr-4">
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((prev) => !prev)}
          className="flex flex-1 items-center justify-between gap-3 px-5 py-4 text-left outline-none"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-lms-ink">{title}</span>
            {summary && <span className="text-xs tabular-nums text-lms-muted">{summary}</span>}
          </span>
          <span
            aria-hidden="true"
            className={`text-xs text-lms-muted transition-transform ${open ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </button>
        {helpId && helpText && onToggleHelp && onCloseHelp && (
          <HelpIcon id={helpId} text={helpText} openId={openHelpId ?? null} onToggle={onToggleHelp} onClose={onCloseHelp} />
        )}
      </div>

      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}>
        <div className="border-t border-lms-line-strong/60 px-5 py-4">{children}</div>
      </div>
    </section>
  )
}
