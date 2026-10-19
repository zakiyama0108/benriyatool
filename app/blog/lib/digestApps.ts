// 5つのダイジェストアプリの名称・1行概要・配信曜日ラベル・アイコン・リンク先の定義(仕様:
// requirements.md#ダイジェストカード一覧、design.md決定事項「配信曜日・1行概要の持ち方」)。
// この定数が唯一の定義元で、`/blog`のカード一覧(digest-hub)・`/blog/admin/sources`のタブ順
// (source-directory)の両方がここを参照する(二重管理しない)

export type DigestApp = {
  id: string
  name: string
  description: string
  // 配信曜日の表示。各アプリの配信specに従うが、本番で実際に配信されている曜日のみを表す
  // (requirements.md#ダイジェストカード一覧-3。配信specが週2回化等を定義済みでも未実装の間は
  // 現行の曜日を使い、本番の配信曜日が変わったら同じPRで追随して更新する)
  scheduleLabel: string
  href: string
  icon: string
}

// requirements.md#ダイジェストカード一覧-1の記載順(=カードの並び順。-4)で定義する
export const DIGEST_APPS: DigestApp[] = [
  {
    id: 'ai-dev-digest',
    name: 'AI駆動開発ダイジェスト',
    // README「アプリ一覧」の概要文を踏襲(requirements.md#カードの表示内容の出所-1)
    description: 'AI駆動開発関連の話題コンテンツを毎日自動収集・翻訳・要約し、ダイジェスト記事として公開する',
    scheduleLabel: '毎日', // specs/ai-dev-digest/daily-publish/requirements.md
    href: '/ai-dev-digest',
    icon: '🤖',
  },
  {
    id: 'news-digest',
    name: '重要ニュースダイジェスト',
    description: '総合・経済/ビジネス・神奈川ローカル・育児の重要ニュースを毎週自動収集・要約し、ダイジェスト記事として公開する',
    scheduleLabel: '毎週水曜', // specs/news-digest/weekly-publish/requirements.md
    href: '/news-digest',
    icon: '📰',
  },
  {
    id: 'trend-digest',
    name: '週刊トレンド',
    description: '音楽・映画・グルメなど様々なジャンルの流行を週2回自動収集・要約し、ダイジェスト記事として公開する',
    scheduleLabel: '火・金(週2回)', // specs/trend-digest/weekly-publish/requirements.md
    href: '/trend-digest',
    icon: '📈',
  },
  {
    id: 'future-digest',
    name: '週刊未来予測',
    description: '10ジャンルを2編に分け、未来予測記事を時間軸(近未来〜超長期未来)ごとに影響度付きで週2回要約・公開する',
    scheduleLabel: '木・日(週2回)', // specs/future-digest/weekly-publish/requirements.md
    href: '/future-digest',
    icon: '🔭',
  },
  {
    id: 'research-digest',
    name: '週刊研究発見',
    description: '10ジャンルを2編に分け、暮らしへの影響が大きい研究・論文を1本ずつ週2回要約・公開する',
    scheduleLabel: '月・土(週2回)', // specs/research-digest/weekly-publish/requirements.md
    href: '/research-digest',
    icon: '🔬',
  },
]
