import type { GuideTheme } from './theme'

// 制度定数の適用期間の表記(1か所定義)。
// calculator.tsの上限定数(毎年8月1日改定)と対で更新する。全記事のSourcesFooterに表示する
export const APPLIED_PERIOD_LABEL = '2025年8月1日〜2026年7月31日'

// 記事の最終更新日。数値や本文を更新したときに合わせて更新する
export const LAST_UPDATED_LABEL = '2026年7月18日'
export const LAST_UPDATED_ISO = '2026-07-18'

// 参考資料(一次情報)へのリンク。全記事で共通に使う(URLは2026-07-18にWeb上で実在・内容を確認済み)
export const PRIMARY_SOURCES = [
  {
    label: '厚生労働省「育児休業等給付について」',
    href: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000135090_00001.html',
  },
  {
    label: 'ハローワークインターネットサービス「育児休業等給付」',
    href: 'https://www.hellowork.mhlw.go.jp/insurance/insurance_childcareleave.html',
  },
] as const

// ガイド記事の一覧(記事一覧ページ・関連記事リンクの共通データ源)。
// 追加するときはこの配列に1件足し、app/ikukyu/guide/<slug>/page.tsx を作る
export type GuideArticle = {
  slug: string
  title: string
  summary: string   // 一覧カード・関連記事リンクに出す1文
  theme: GuideTheme
}

export const GUIDE_ARTICLES: GuideArticle[] = [
  {
    slug: 'tedori-10wari',
    title: '【2026年版】育休の手取り10割は本当?月給別に実額を検証',
    summary: '出生後休業支援給付金で本当に手取り10割になるのか、月給20万〜50万円の実額と「10割にならない月給ライン」を検証。',
    theme: 'mint',
  },
  {
    slug: 'hayamihyo',
    title: '月給別・育休給付金早見表(20万〜60万円)',
    summary: '月給5万円刻みで「最初の180日(67%)」「181日以降(50%)」「上乗せ後(80%)」の給付月額を一覧できる早見表。',
    theme: 'sky',
  },
  {
    slug: 'fufu-ikukyu',
    title: '夫婦で育休を取ると世帯収入はどうなる?パターン別シミュレーション',
    summary: 'ママのみ育休・パパ28日・夫婦同時期取得の3パターンで、世帯収入の月次推移と差額を実額で比較。',
    theme: 'pink',
  },
]
