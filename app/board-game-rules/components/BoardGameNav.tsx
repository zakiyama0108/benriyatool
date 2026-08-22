import Link from 'next/link'
import AdminNavLink from './AdminNavLink'

// board-game-rules(ボドゲのトリセツ)アプリ全体で共有する左サイドバーの共通ナビ。
// 見た目はStep0で確定したAnalog Hearth(favorite/design.md「お気に入り一覧画面」・
// game-registration/design.md「画面設計」・game-list/design.md「ナビゲーション」)。
// Stitch参照デザインではHome/Search/Add Game/お気に入り/Profileの5項目が並ぶが、
// 遷移先画面が実装済みなのは「一覧(Home)」「登録依頼(Add Game)」「お気に入り」の3つだけ
// (game-detail/Profile等はrequirements.mdの通り未実装)。存在しないURLへのリンクは必ず
// 404になるため、実装済みの3画面のみをリンクとして並べ、対応する画面が実装され次第この配列に追加する。

// 現在地を示すキー(実装済み画面)。画面追加時にここへ増やす
export type BoardGameNavKey = 'list' | 'register' | 'favorites'

// 実装済み画面のナビ項目定義(表示順)。keyはactiveと突き合わせて現在地判定に使う。
// 一覧はアプリのトップのため最上段に置く(game-list/design.md「ナビゲーション」表示順)
const NAV_ITEMS: { key: BoardGameNavKey; href: string; label: string }[] = [
  { key: 'list', href: '/board-game-rules', label: '一覧' },
  { key: 'register', href: '/board-game-rules/register', label: '登録依頼' },
  { key: 'favorites', href: '/board-game-rules/favorites', label: 'お気に入り' },
]

// サービス共通の抽象ロゴ(design.md「ナビゲーション(左サイドバー共通ナビ)」)。ボードゲームの
// 汎用モチーフ(駒/ミープルのシルエット)で、囲碁・将棋等の特定ゲームを連想させないようにする
function MeepleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-bgr-primary">
      <path d="M12 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-3.6 7.2h7.2c1 0 1.9.7 2.1 1.7l1.5 6.4a1.1 1.1 0 0 1-1.1 1.4h-2.3l-.6 2.9a1 1 0 0 1-1 .8H8.8a1 1 0 0 1-1-.8l-.6-2.9H4.9a1.1 1.1 0 0 1-1.1-1.4l1.5-6.4c.2-1 1.1-1.7 2.1-1.7Z" />
    </svg>
  )
}

// 「一覧」項目のアイコン(Stitch参照デザインのHome相当の家形。一覧はアプリのトップのため)
function HomeIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 3 3 10.5V21h6v-6h6v6h6V10.5L12 3Z" />
    </svg>
  )
}

// 「登録依頼」項目のアイコン(Stitch参照デザインのadd_circle相当のプラス丸)
function AddGameIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 11h4v-2h-4V7h-2v4H7v2h4v4h2v-4Z" />
    </svg>
  )
}

// 「お気に入り」項目のアイコン(favorites/page.tsxのHeartIconと同じ意匠。共通ナビ用に集約)
function HeartIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 20.3 4.6 13.1C2.5 11 2.5 7.7 4.6 5.6c2-2 5.2-2 7.2.1l.2.2.2-.2c2-2.1 5.2-2.1 7.2-.1 2.1 2.1 2.1 5.4 0 7.5L12 20.3Z" />
    </svg>
  )
}

// ナビ項目ごとのアイコンを引く(keyに対応するアイコンを返す)
function NavIcon({ navKey }: { navKey: BoardGameNavKey }) {
  const className = 'h-4 w-4'
  if (navKey === 'list') return <HomeIcon className={className} />
  if (navKey === 'register') return <AddGameIcon className={className} />
  return <HeartIcon className={className} />
}

// 左サイドバーの共通ナビ。activeで渡した画面を現在地(aria-current="page")としてハイライトする。
// モバイル(md未満)ではサイドバーを隠す(狭幅では本文を優先。favorites/registerとも同方針)
export default function BoardGameNav({ active }: { active: BoardGameNavKey }) {
  return (
    <aside className="hidden shrink-0 flex-col border-r border-bgr-line bg-bgr-card px-4 py-8 md:sticky md:top-0 md:flex md:h-screen md:w-64">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-bgr-line bg-bgr-bg">
          <MeepleMark />
        </div>
        <div>
          <p className="font-heading text-sm font-bold text-bgr-heading">ボドゲのトリセツ</p>
          <p className="text-xs text-bgr-subtext">アナログゲームガイド</p>
        </div>
      </div>
      <nav aria-label="共通ナビ" className="flex flex-col gap-2">
        {NAV_ITEMS.map((item) => {
          const current = item.key === active
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={current ? 'page' : undefined}
              className={
                current
                  ? 'flex items-center gap-3 rounded-lg border-l-4 border-bgr-accent bg-bgr-bg px-3 py-2 font-bold text-bgr-primary'
                  : 'flex items-center gap-3 rounded-lg border-l-4 border-transparent px-3 py-2 text-bgr-subtext transition-colors hover:bg-bgr-bg hover:text-bgr-heading'
              }
            >
              <NavIcon navKey={item.key} />
              <span className="text-sm">{item.label}</span>
            </Link>
          )
        })}
        {/* 運営者ログイン中のみ表示される管理画面導線(クライアント島)。BoardGameNav自体は
            サーバーコンポーネントのまま(design.md「共通ナビに管理画面への導線を表示する処理」) */}
        <AdminNavLink />
      </nav>
    </aside>
  )
}
