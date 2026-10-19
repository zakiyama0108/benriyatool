import type { Edition } from '../lib/types'
import { EDITION_LABELS } from '../lib/types'

type Props = {
  edition: Edition
}

// 編(からだ・くらし編/科学・社会編)を示すバッジ表示(仕様: article-list/requirements.md#一覧表示-1〜2、
// article-list/design.md「画面設計」)。一覧の時点でどちらの回の記事かをひと目で見分けられるようにする。
// trend-digest・future-digestのEditionBadgeと同じ作りだが、research-digest用に独立して実装する(コードは共有しない)
export default function EditionBadge({ edition }: Props) {
  return (
    <span className="inline-block rounded-full bg-teal-50 px-2 py-0.5 text-xs font-extrabold text-teal-700">
      {EDITION_LABELS[edition]}
    </span>
  )
}
