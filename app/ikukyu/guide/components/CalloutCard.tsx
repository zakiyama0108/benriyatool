import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
}

// 上限ラインなど、読み飛ばすと誤解につながる注意点を目立たせるボックス
export default function CalloutCard({ title, children }: Props) {
  return (
    <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed">
      <p className="mb-1 text-xs font-bold tracking-wide text-amber-700">{title}</p>
      <div className="text-gray-700">{children}</div>
    </div>
  )
}
