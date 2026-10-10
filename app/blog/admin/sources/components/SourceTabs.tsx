import type { DigestApp } from '../../../lib/digestApps'

type Props = {
  apps: DigestApp[]
  selectedId: string
  onSelect: (id: string) => void
}

// 5アプリのタブバー(仕様: requirements.md#アプリ切り替えタブ-1〜2、design.md「タブを切り替える処理」)。
// appsの記載順そのままにタブを並べる(DIGEST_APPSの順=ブログダイジェストハブページのカード順と揃える)
export default function SourceTabs({ apps, selectedId, onSelect }: Props) {
  return (
    <div role="tablist" className="flex gap-2 overflow-x-auto border-b border-gray-200">
      {apps.map((app) => {
        const selected = app.id === selectedId
        return (
          <button
            key={app.id}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onSelect(app.id)}
            className={
              selected
                ? 'whitespace-nowrap border-b-2 border-orange-500 px-3 py-2 text-sm font-bold text-orange-600'
                : 'whitespace-nowrap px-3 py-2 text-sm text-gray-500 hover:text-gray-900'
            }
          >
            {app.icon} {app.name}
          </button>
        )
      })}
    </div>
  )
}
