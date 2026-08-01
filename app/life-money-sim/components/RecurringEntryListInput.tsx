'use client'
import type { RecurringEntry } from '../lib/types'

type Props = {
  entries: RecurringEntry[]
  onChange: (entries: RecurringEntry[]) => void
}

function newEntry(): RecurringEntry {
  return { label: '', amount: 0, type: 'expense', startYearMonth: '', endYearMonth: '', frequencyMonths: 1 }
}

// 名目・金額・種別(収入/支出)・開始月・終了月・頻度(何ヶ月ごとか)を指定する
// 定期的な収入・支出の登録リスト。複数登録・削除に対応する
// (仕様: requirements.md#定期的な収入・支出の登録-1、#定期的な収入・支出の登録-2、#定期的な収入・支出の登録-3)
export default function RecurringEntryListInput({ entries, onChange }: Props) {
  function addEntry() {
    onChange([...entries, newEntry()])
  }

  function updateEntry(i: number, patch: Partial<RecurringEntry>) {
    onChange(entries.map((entry, idx) => (idx === i ? { ...entry, ...patch } : entry)))
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {entries.map((entry, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              aria-label="定期項目の名目"
              value={entry.label}
              onChange={(e) => updateEntry(i, { label: e.target.value })}
              placeholder="名目(例: 家賃)"
              className="min-w-0 flex-1 rounded-full border border-lms-line-strong bg-white px-3 py-1.5 text-xs outline-none focus:border-lms-sand-ink focus:bg-lms-sand-soft/40"
            />
            <input
              type="number"
              aria-label="定期項目の金額"
              value={Number.isFinite(entry.amount) ? entry.amount : ''}
              onChange={(e) => updateEntry(i, { amount: e.target.valueAsNumber })}
              placeholder="万円"
              className="w-24 rounded-full border border-lms-line-strong bg-white px-3 py-1.5 text-xs tabular-nums outline-none focus:border-lms-sand-ink focus:bg-lms-sand-soft/40"
            />
            <select
              aria-label="定期項目の種別"
              value={entry.type}
              onChange={(e) => updateEntry(i, { type: e.target.value as RecurringEntry['type'] })}
              className="rounded-full border border-lms-line-strong bg-white px-3 py-1.5 text-xs outline-none focus:border-lms-sand-ink focus:bg-lms-sand-soft/40"
            >
              <option value="income">収入</option>
              <option value="expense">支出</option>
            </select>
            <input
              type="month"
              aria-label="定期項目の開始月"
              value={entry.startYearMonth}
              onChange={(e) => updateEntry(i, { startYearMonth: e.target.value })}
              className="rounded-full border border-lms-line-strong bg-white px-3 py-1.5 text-xs outline-none focus:border-lms-sand-ink focus:bg-lms-sand-soft/40"
            />
            <input
              type="month"
              aria-label="定期項目の終了月"
              value={entry.endYearMonth}
              onChange={(e) => updateEntry(i, { endYearMonth: e.target.value })}
              className="rounded-full border border-lms-line-strong bg-white px-3 py-1.5 text-xs outline-none focus:border-lms-sand-ink focus:bg-lms-sand-soft/40"
            />
            <label className="flex items-center gap-1 text-xs text-lms-muted">
              <input
                type="number"
                aria-label="定期項目の頻度(何ヶ月ごとか)"
                value={Number.isFinite(entry.frequencyMonths) ? entry.frequencyMonths : ''}
                onChange={(e) => updateEntry(i, { frequencyMonths: e.target.valueAsNumber })}
                className="w-16 rounded-full border border-lms-line-strong bg-white px-3 py-1.5 text-xs tabular-nums outline-none focus:border-lms-sand-ink focus:bg-lms-sand-soft/40"
              />
              ヶ月ごと
            </label>
            <button
              type="button"
              onClick={() => onChange(entries.filter((_, idx) => idx !== i))}
              className="shrink-0 rounded-full px-2 py-1 text-xs text-lms-coral hover:bg-lms-coral/10"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={addEntry}
        className="rounded-full bg-lms-teal/10 px-4 py-1.5 text-xs font-medium text-lms-teal hover:bg-lms-teal/20"
      >
        + 定期収入・支出を追加
      </button>
    </div>
  )
}
