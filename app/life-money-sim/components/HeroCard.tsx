type Row = { label: string; asset: number }

type Props = {
  rows: Row[]
  startAsset: number
  modeLabel: string
}

function formatManYen(amount: number): string {
  return `${Math.round(amount * 10) / 10}万円`
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100
    const y = 100 - ((value - min) / (max - min || 1)) * 100
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })

  return (
    <svg aria-hidden="true" className="h-16 w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="heroSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-lms-teal)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-lms-teal)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M0,100L${points.join('L')}L100,100Z`} fill="url(#heroSparkFill)" />
      <path
        d={`M${points.join('L')}`}
        fill="none"
        stroke="var(--color-lms-teal)"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// 表示範囲最終時点の資産額を大きく表示するヒーローカード。開始資産額との差分・推移の
// ミニグラフを添えて、資産推移テーブル・グラフを開かなくても結果が一目でわかるようにする
// (仕様: asset-projection/design.md#画面設計)
export default function HeroCard({ rows, startAsset, modeLabel }: Props) {
  if (rows.length === 0) return null
  const last = rows[rows.length - 1]
  const diff = last.asset - startAsset
  const positive = diff >= 0

  return (
    <section className="rounded-[35px] border border-lms-line-strong bg-lms-card p-5 shadow-[0_2px_12px_rgba(16,64,56,0.06)] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-bold text-lms-muted">{`${last.label}時点の資産額(${modeLabel})`}</h2>
          <p className="flex items-baseline gap-1 font-bold tabular-nums text-lms-ink">
            <span className="text-4xl leading-none tracking-tight sm:text-5xl">{last.asset.toLocaleString('ja-JP')}</span>
            <span className="text-lg text-lms-muted">万円</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold tabular-nums ${
                positive ? 'bg-lms-teal-soft text-lms-teal' : 'bg-lms-coral/10 text-lms-coral'
              }`}
            >
              <span aria-hidden="true">{positive ? '↑' : '↓'}</span>
              {`${positive ? '+' : ''}${formatManYen(diff)}`}
              <span className="sr-only">{positive ? 'の増加' : 'の減少'}</span>
            </span>
            <span className="text-xs tabular-nums text-lms-muted">{`開始資産 ${formatManYen(startAsset)}との差`}</span>
          </div>
        </div>

        <div className="w-full sm:w-56">
          <Sparkline values={rows.map((row) => row.asset)} />
          <p className="mt-1 flex justify-between text-[10px] tabular-nums text-lms-muted">
            <span>{rows[0].label}</span>
            <span>{last.label}</span>
          </p>
        </div>
      </div>
    </section>
  )
}
