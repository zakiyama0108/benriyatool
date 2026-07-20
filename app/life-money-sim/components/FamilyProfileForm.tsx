'use client'
import type { FamilyProfileInput } from '../lib/types'

type Props = {
  profile: FamilyProfileInput
  onChange: (profile: FamilyProfileInput) => void
  hasSpouse: boolean
  onHasSpouseChange: (hasSpouse: boolean) => void
}

const MAX_CHILDREN = 3

// 本人・配偶者・子どもの生年月入力。配偶者の有無・子どもの人数もここで設定する
// (仕様: requirements.md#前提入力-3、#前提入力-4)
export default function FamilyProfileForm({ profile, onChange, hasSpouse, onHasSpouseChange }: Props) {
  function setChildrenCount(count: number) {
    const childrenBirthMonths = Array.from({ length: count }, (_, i) => profile.childrenBirthMonths[i] ?? null)
    onChange({ ...profile, childrenCount: count, childrenBirthMonths })
  }

  return (
    <div className="space-y-3 rounded-[20px] bg-teal-50/70 p-4 shadow-[0_10px_30px_-18px_rgba(15,118,110,0.6)]">
      <p className="text-sm font-bold text-teal-800">家族構成</p>

      <label className="block text-xs text-teal-700">
        本人の生年月(任意)
        <input
          type="month"
          value={profile.selfBirthMonth ?? ''}
          onChange={(e) => onChange({ ...profile, selfBirthMonth: e.target.value || null })}
          className="mt-1 w-full rounded-full border border-teal-100 bg-white px-4 py-2 text-sm outline-none focus:border-teal-400"
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-teal-700">
        <input type="checkbox" checked={hasSpouse} onChange={(e) => onHasSpouseChange(e.target.checked)} />
        配偶者あり
      </label>
      {hasSpouse && (
        <label className="block text-xs text-teal-700">
          配偶者の生年月(任意)
          <input
            type="month"
            value={profile.spouseBirthMonth ?? ''}
            onChange={(e) => onChange({ ...profile, spouseBirthMonth: e.target.value || null })}
            className="mt-1 w-full rounded-full border border-teal-100 bg-white px-4 py-2 text-sm outline-none focus:border-teal-400"
          />
        </label>
      )}

      <label className="block text-xs text-teal-700">
        子どもの人数
        <select
          value={profile.childrenCount}
          onChange={(e) => setChildrenCount(Number(e.target.value))}
          className="mt-1 w-full rounded-full border border-teal-100 bg-white px-4 py-2 text-sm outline-none focus:border-teal-400"
        >
          {Array.from({ length: MAX_CHILDREN + 1 }, (_, n) => (
            <option key={n} value={n}>
              {n}人
            </option>
          ))}
        </select>
      </label>

      {profile.childrenBirthMonths.map((birthMonth, i) => (
        <label key={i} className="block text-xs text-teal-700">
          {`子ども${i + 1}の生年月(任意)`}
          <input
            type="month"
            value={birthMonth ?? ''}
            onChange={(e) => {
              const childrenBirthMonths = profile.childrenBirthMonths.map((b, idx) =>
                idx === i ? e.target.value || null : b
              )
              onChange({ ...profile, childrenBirthMonths })
            }}
            className="mt-1 w-full rounded-full border border-teal-100 bg-white px-4 py-2 text-sm outline-none focus:border-teal-400"
          />
        </label>
      ))}
    </div>
  )
}
