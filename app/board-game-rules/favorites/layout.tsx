import { Plus_Jakarta_Sans, Work_Sans } from 'next/font/google'

// Analog Hearthデザイントークン(design.md「画面設計」)の見出し/本文フォント。
// register/layout.tsxと同じ理由(nextjs-notes.md参照)で、フォント読み込みはサーバー
// コンポーネントのlayout.tsx側に置き、favorites/page.tsx(クライアントコンポーネント・
// ユニットテストで単体レンダリングされる)には置かない
const headingFont = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta-sans' })
const bodyFont = Work_Sans({ subsets: ['latin'], variable: '--font-work-sans' })

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${headingFont.variable} ${bodyFont.variable}`}>{children}</div>
}
