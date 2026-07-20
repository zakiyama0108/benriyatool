'use client'
import type { BonusEntry, EventEntry } from '../lib/types'

type Props = {
  bonuses: BonusEntry[]
  onBonusesChange: (bonuses: BonusEntry[]) => void
  events: EventEntry[]
  onEventsChange: (events: EventEntry[]) => void
}

// 月ごとの賞与・イベント(名目+金額)の登録リスト。複数登録・同月複数件登録に対応する
// (仕様: requirements.md#賞与・イベントの登録-1、#賞与・イベントの登録-2)
export default function EventListInput({ bonuses, onBonusesChange, events, onEventsChange }: Props) {
  function addBonus() {
    onBonusesChange([...bonuses, { yearMonth: '', amount: 0 }])
  }
  function addEvent() {
    onEventsChange([...events, { yearMonth: '', label: '', amount: 0 }])
  }

  return (
    <div className="space-y-4 rounded-[20px] bg-teal-50/70 p-4 shadow-[0_10px_30px_-18px_rgba(15,118,110,0.6)]">
      <div className="space-y-2">
        <p className="text-sm font-bold text-amber-700">賞与(通常のボーナスとは別に登録)</p>
        <ul className="space-y-2">
          {bonuses.map((bonus, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="month"
                aria-label="賞与の対象年月"
                value={bonus.yearMonth}
                onChange={(e) =>
                  onBonusesChange(bonuses.map((b, idx) => (idx === i ? { ...b, yearMonth: e.target.value } : b)))
                }
                className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs outline-none"
              />
              <input
                type="number"
                aria-label="賞与の金額"
                value={Number.isFinite(bonus.amount) ? bonus.amount : ''}
                onChange={(e) =>
                  onBonusesChange(bonuses.map((b, idx) => (idx === i ? { ...b, amount: e.target.valueAsNumber } : b)))
                }
                placeholder="万円"
                className="w-24 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs tabular-nums outline-none"
              />
              <button
                type="button"
                onClick={() => onBonusesChange(bonuses.filter((_, idx) => idx !== i))}
                className="shrink-0 rounded-full px-2 py-1 text-xs text-rose-400 hover:bg-rose-50"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addBonus}
          className="rounded-full bg-amber-100 px-4 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200"
        >
          + 賞与を追加
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold text-rose-500">イベント(一時的な追加支出)</p>
        <ul className="space-y-2">
          {events.map((event, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                aria-label="イベントの対象年月"
                value={event.yearMonth}
                onChange={(e) =>
                  onEventsChange(events.map((ev, idx) => (idx === i ? { ...ev, yearMonth: e.target.value } : ev)))
                }
                className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs outline-none"
              />
              <input
                type="text"
                aria-label="イベントの名目"
                value={event.label}
                onChange={(e) =>
                  onEventsChange(events.map((ev, idx) => (idx === i ? { ...ev, label: e.target.value } : ev)))
                }
                placeholder="名目(例: 結婚)"
                className="min-w-0 flex-1 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs outline-none"
              />
              <input
                type="number"
                aria-label="イベントの金額"
                value={Number.isFinite(event.amount) ? event.amount : ''}
                onChange={(e) =>
                  onEventsChange(events.map((ev, idx) => (idx === i ? { ...ev, amount: e.target.valueAsNumber } : ev)))
                }
                placeholder="万円"
                className="w-24 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs tabular-nums outline-none"
              />
              <button
                type="button"
                onClick={() => onEventsChange(events.filter((_, idx) => idx !== i))}
                className="shrink-0 rounded-full px-2 py-1 text-xs text-rose-400 hover:bg-rose-50"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addEvent}
          className="rounded-full bg-rose-100 px-4 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-200"
        >
          + イベントを追加
        </button>
      </div>
    </div>
  )
}
