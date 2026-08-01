'use client'

type Option = { value: string; label: string }

type Props = {
  label: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  size?: 'md' | 'sm'
  fullWidth?: boolean
  // lms-card(白)の中(アコーディオン内など)で使う場合は'onCard'にして薄いcanvasトラックにする
  variant?: 'surface' | 'onCard'
}

// 2〜3択のトグル切り替え共通コンポーネント(貯蓄/運用切替・月次/年次の表示単位切り替えで共通利用)
// (仕様: asset-projection/design.md#画面設計)
export default function SegmentedControl({
  label,
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  variant = 'surface',
}: Props) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-full p-1 ${variant === 'onCard' ? 'bg-lms-canvas' : 'bg-lms-card'} ${fullWidth ? 'w-full' : ''}`}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-full font-bold transition-colors outline-none ${
              size === 'md' ? 'px-5 py-2 text-xs' : 'px-4 py-1.5 text-xs'
            } ${fullWidth ? 'flex-1' : ''} ${selected ? 'bg-lms-teal text-white' : 'text-lms-muted'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
