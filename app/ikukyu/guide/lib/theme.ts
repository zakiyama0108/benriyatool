// 記事別テーマカラー(カテゴリカラー方式)。レイアウト・コンポーネント構造は共通のまま、
// アクセント色だけを記事ごとに切り替える(記事1=ミント、記事2=スカイ、記事3=ピンク)
export type GuideTheme = 'mint' | 'sky' | 'pink'

export type ThemeClasses = {
  pageBg: string        // ページ背景(淡いグラデーション)
  accentText: string    // 強調テキスト・数値
  accentSoftBg: string  // バッジ・アイコンの淡い背景
  headerRule: string    // 表ヘッダー下の罫線
  ctaBg: string         // CTAボタンの背景
}

export const GUIDE_THEMES: Record<GuideTheme, ThemeClasses> = {
  mint: {
    pageBg: 'bg-gradient-to-b from-emerald-50 via-teal-50/40 to-white',
    accentText: 'text-teal-600',
    accentSoftBg: 'bg-teal-50 text-teal-600',
    headerRule: 'border-teal-100',
    ctaBg: 'bg-teal-500',
  },
  sky: {
    pageBg: 'bg-gradient-to-b from-sky-50 via-sky-50/40 to-white',
    accentText: 'text-sky-600',
    accentSoftBg: 'bg-sky-50 text-sky-600',
    headerRule: 'border-sky-100',
    ctaBg: 'bg-sky-500',
  },
  pink: {
    pageBg: 'bg-gradient-to-b from-pink-50 via-rose-50/40 to-white',
    accentText: 'text-pink-600',
    accentSoftBg: 'bg-pink-50 text-pink-600',
    headerRule: 'border-pink-100',
    ctaBg: 'bg-pink-500',
  },
}
