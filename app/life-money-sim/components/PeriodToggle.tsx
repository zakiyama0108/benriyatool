'use client'
import type { PeriodUnit } from '../lib/types'
import SegmentedControl from './SegmentedControl'

type Props = {
  value: PeriodUnit
  onChange: (value: PeriodUnit) => void
}

// 資産推移テーブル・グラフの月次/年次の表示単位切り替え(仕様: requirements.md#表示単位の切り替え-1)
export default function PeriodToggle({ value, onChange }: Props) {
  return (
    <SegmentedControl
      label="表示単位切替"
      size="sm"
      value={value}
      onChange={(next) => onChange(next as PeriodUnit)}
      options={[
        { value: 'month', label: '月次' },
        { value: 'year', label: '年次' },
      ]}
    />
  )
}
