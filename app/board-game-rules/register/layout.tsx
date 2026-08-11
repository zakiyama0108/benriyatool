import { Plus_Jakarta_Sans, Work_Sans } from 'next/font/google'

// Analog Hearthデザイントークン(design.md「デザイントークン」)の見出し/本文フォント。
// next/font/googleはフォントが使われるコンポーネント単位でスコープされるため(コードから読み取れない
// Next.js挙動。詳細はimplementation/references/nextjs-notes.mdを参照)、ここ(サーバーコンポーネントの
// layout.tsx)で読み込みCSS変数として下位へ渡す。register/page.tsxはクライアントコンポーネントかつ
// ユニットテストで単体レンダリングされるため、フォント読み込みはpage.tsx側に置かない
const headingFont = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta-sans' })
const bodyFont = Work_Sans({ subsets: ['latin'], variable: '--font-work-sans' })

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${headingFont.variable} ${bodyFont.variable}`}>{children}</div>
}
