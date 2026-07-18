type Source = {
  label: string
  href: string
}

type Props = {
  sources: Source[]
  lastUpdated: string     // 例: 「2026年7月18日」
  appliedPeriod: string   // 制度定数の適用期間。例: 「2025年8月1日〜2026年7月31日」
}

// 記事末尾の参考資料フッター(YMYL対策)。
// 一次資料リンク・最終更新日・制度定数の適用期間・免責注記をすべての記事に表示する
export default function SourcesFooter({ sources, lastUpdated, appliedPeriod }: Props) {
  return (
    <footer className="border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500">
      <p className="font-semibold text-gray-600">参考資料(一次情報)</p>
      <ul className="mt-1 list-disc pl-5">
        {sources.map((source) => (
          <li key={source.href}>
            <a href={source.href} target="_blank" rel="noopener noreferrer" className="underline">
              {source.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-3">
        本記事の金額は、掲載時点の制度に基づく簡易な試算です。実際の支給額・支給要件は勤務先やハローワーク・協会けんぽ等でご確認ください。
      </p>
      <p className="mt-1">
        掲載金額は{appliedPeriod}適用の制度定数(賃金日額上限など)に基づいて算出しています。
      </p>
      <p className="mt-1">最終更新日: {lastUpdated}</p>
    </footer>
  )
}
