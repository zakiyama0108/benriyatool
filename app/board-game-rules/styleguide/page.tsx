'use client'

import { useState } from 'react'
import BoardGameNav from '../components/BoardGameNav'
import PhotoUploader from '../components/PhotoUploader'
import FavoriteButton from '../components/FavoriteButton'
import LoginStatus from '../components/LoginStatus'

// board-game-rules(ボドゲのトリセツ)の共通部品カタログ(styleguide)。確定済みAnalog Hearthの
// トークンと共通部品の見た目を1ページで一覧確認するための開発者向けページ(利用者向けの公開機能では
// ない。トークン定義の正は specs/board-game-rules/DESIGN.md、実体は app/globals.css の bgr-*)。
// 新しい見た目・新しい共通部品はこのページのために作り起こさず、既存の確定物を写す
// (仕様: specs/board-game-rules/design-system/requirements.md#共通部品カタログstyleguideページ)。
// フォルダ名はアンダースコアを付けない(_styleguideはNext.jsのprivate folderでルーティング除外され
// styleguide.pngキャプチャの生きたURLに遷移できないため。DESIGN.md「6. Stitch連携」前の注記参照)。

// 配色8トークン(DESIGN.md「1. デザイントークン > 配色」から転記。実体は globals.css の @theme)
const COLOR_TOKENS: { name: string; hex: string; swatch: string; use: string }[] = [
  { name: 'bgr-bg', hex: '#F7F3EA', swatch: 'bg-bgr-bg', use: '背景(生成り)' },
  { name: 'bgr-card', hex: '#EFE7D6', swatch: 'bg-bgr-card', use: 'カード背景' },
  { name: 'bgr-line', hex: '#DCD0B4', swatch: 'bg-bgr-line', use: '縁線(1px罫線)' },
  { name: 'bgr-heading', hex: '#43392E', swatch: 'bg-bgr-heading', use: '見出し・線' },
  { name: 'bgr-subtext', hex: '#6B5F4F', swatch: 'bg-bgr-subtext', use: 'サブテキスト' },
  { name: 'bgr-primary', hex: '#6E7C58', swatch: 'bg-bgr-primary', use: 'アクセント1(主要操作)' },
  { name: 'bgr-primary-active', hex: '#556246', swatch: 'bg-bgr-primary-active', use: 'アクセント1押下・濃' },
  { name: 'bgr-accent', hex: '#B96B3E', swatch: 'bg-bgr-accent', use: 'アクセント2(強調)' },
]

// 角丸3段階(DESIGN.md「1. デザイントークン > 角丸」)
const RADII: { label: string; cls: string; use: string }[] = [
  { label: '8px', cls: 'rounded-lg', use: '標準UI' },
  { label: '16px', cls: 'rounded-2xl', use: '大コンテナ' },
  { label: '4px', cls: 'rounded', use: 'チップ' },
]

// カタログ内の各ブロックの見出し(共通の体裁)
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-heading text-lg font-bold text-bgr-heading">{title}</h2>
      {children}
    </section>
  )
}

// 小さなハートアイコン(FavoriteButtonのレプリカ用。実部品と同じ意匠の自前SVG)
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
      <path d="M12 20.3 4.6 13.1C2.5 11 2.5 7.7 4.6 5.6c2-2 5.2-2 7.2.1l.2.2.2-.2c2-2.1 5.2-2.1 7.2-.1 2.1 2.1 2.1 5.4 0 7.5L12 20.3Z" />
    </svg>
  )
}

// お気に入りトグルの静的レプリカ。FavoriteButtonの実ボタンと同じTailwindクラスを複製し、
// session無しでは見られない「未登録/登録済み」の見た目を確認できるようにする(spanで作るため
// 実部品の「お気に入り」ボタンとは区別される)
function FavoriteReplica({ favorited }: { favorited: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-bgr-line bg-bgr-bg px-2 py-1 text-xs font-medium ${
        favorited ? 'text-bgr-accent' : 'text-bgr-subtext'
      }`}
    >
      <HeartIcon filled={favorited} />
      {favorited ? 'お気に入り済' : 'お気に入り'}
    </span>
  )
}

export default function StyleguidePage() {
  // PhotoUploaderは制御コンポーネントのため、カタログ側でローカルstateを持って実部品を動かす
  const [photos, setPhotos] = useState<File[]>([])

  return (
    <div className="font-body flex min-h-screen bg-bgr-bg text-bgr-heading">
      <BoardGameNav active="register" />
      <main className="mx-auto w-full max-w-4xl space-y-12 px-6 py-10">
        <header className="space-y-1">
          <h1 className="font-heading text-2xl font-bold text-bgr-heading">board-game-rules styleguide</h1>
          <p className="text-sm text-bgr-subtext">
            Analog Hearth のトークンと共通部品のカタログ(開発者向け確認ページ)。定義の正は
            {' '}
            <code className="rounded bg-bgr-card px-1">specs/board-game-rules/DESIGN.md</code>
            、実体は <code className="rounded bg-bgr-card px-1">app/globals.css</code> の <code>bgr-*</code>。
          </p>
        </header>

        {/* --- デザイントークン --- */}
        <Section title="デザイントークン(Analog Hearth)">
          <div>
            <h3 className="mb-2 text-sm font-bold text-bgr-heading">配色</h3>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {COLOR_TOKENS.map((t) => (
                <li key={t.name} className="rounded-lg border border-bgr-line bg-bgr-card p-2">
                  <div className={`mb-2 h-12 w-full rounded border border-bgr-line ${t.swatch}`} />
                  <p className="font-mono text-xs font-bold text-bgr-heading">{t.name}</p>
                  <p className="font-mono text-xs text-bgr-subtext">{t.hex}</p>
                  <p className="text-xs text-bgr-subtext">{t.use}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-bgr-line bg-bgr-card p-4">
              <p className="mb-1 text-xs text-bgr-subtext">見出しフォント</p>
              <p className="font-heading text-xl font-bold text-bgr-heading">ボドゲのトリセツ Aa 12345</p>
            </div>
            <div className="rounded-lg border border-bgr-line bg-bgr-card p-4">
              <p className="mb-1 text-xs text-bgr-subtext">本文フォント</p>
              <p className="font-body text-base text-bgr-heading">ボードゲームのルールをやさしく確認 Aa 12345</p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold text-bgr-heading">角丸</h3>
            <ul className="flex flex-wrap gap-4">
              {RADII.map((r) => (
                <li key={r.label} className="text-center">
                  <div className={`h-16 w-16 border border-bgr-line bg-bgr-card ${r.cls}`} />
                  <p className="mt-1 text-xs font-bold text-bgr-heading">{r.label}</p>
                  <p className="text-xs text-bgr-subtext">{r.use}</p>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* --- 共通chrome --- */}
        <Section title="共通chrome(左サイドバー共通ナビ)">
          <p className="text-sm text-bgr-subtext">
            左端に常時表示している <code>BoardGameNav</code>(真実の源はコード側 <code>components/BoardGameNav.tsx</code>)。md未満では隠れる。
          </p>
        </Section>

        {/* --- 共通部品カタログ --- */}
        <Section title="共通部品カタログ">
          <div className="space-y-6">
            {/* ボタン */}
            <div>
              <h3 className="mb-2 text-sm font-bold text-bgr-heading">ボタン</h3>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg bg-bgr-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-bgr-primary-active"
                >
                  主要ボタン
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-lg bg-bgr-primary px-4 py-2 text-sm font-bold text-white opacity-50"
                >
                  無効ボタン
                </button>
              </div>
            </div>

            {/* カード */}
            <div>
              <h3 className="mb-2 text-sm font-bold text-bgr-heading">カード</h3>
              <div className="max-w-xs rounded-lg border border-bgr-line bg-bgr-card p-4">
                <p className="font-heading font-bold text-bgr-heading">カード見本</p>
                <p className="text-sm text-bgr-subtext">影を使わず、トーン差 + 1px罫線(bgr-line)で階層を表現する。</p>
              </div>
            </div>

            {/* パンくず */}
            <div>
              <h3 className="mb-2 text-sm font-bold text-bgr-heading">パンくず</h3>
              <nav aria-label="パンくず(見本)" className="flex items-center gap-1 text-xs text-bgr-subtext">
                <span>べんりやつーる</span>
                <span aria-hidden="true">›</span>
                <span>ボドゲのトリセツ</span>
                <span aria-hidden="true">›</span>
                <span className="font-bold text-bgr-heading">登録依頼</span>
              </nav>
            </div>

            {/* フォーム部品: PhotoUploader(実部品) */}
            <div>
              <h3 className="mb-2 text-sm font-bold text-bgr-heading">写真アップロード(PhotoUploader・実部品)</h3>
              <PhotoUploader photos={photos} onChange={setPhotos} />
            </div>

            {/* お気に入りトグル(実部品 + レプリカ) */}
            <div>
              <h3 className="mb-2 text-sm font-bold text-bgr-heading">お気に入りトグル(FavoriteButton)</h3>
              <div className="flex flex-wrap items-end gap-6">
                <div className="text-xs text-bgr-subtext">
                  <p className="mb-1">実部品(未ログイン)</p>
                  <div className="min-h-[1.5rem]">
                    <FavoriteButton gameId="styleguide-sample" initialFavorited={false} />
                    <span className="text-bgr-subtext">(未ログインのため何も表示されない)</span>
                  </div>
                </div>
                <div className="text-xs text-bgr-subtext">
                  <p className="mb-1">未登録</p>
                  <FavoriteReplica favorited={false} />
                </div>
                <div className="text-xs text-bgr-subtext">
                  <p className="mb-1">登録済み</p>
                  <FavoriteReplica favorited={true} />
                </div>
              </div>
            </div>

            {/* ログイン導線(実部品 + レプリカ) */}
            <div>
              <h3 className="mb-2 text-sm font-bold text-bgr-heading">ログイン導線(LoginStatus)</h3>
              <div className="flex flex-wrap items-end gap-6">
                <div className="text-xs text-bgr-subtext">
                  <p className="mb-1">実部品(未ログイン)</p>
                  <LoginStatus />
                </div>
                <div className="text-xs text-bgr-subtext">
                  <p className="mb-1">ログイン中(レプリカ)</p>
                  {/* 実部品のログイン中の見た目(現状はgray/emerald直書き。DESIGN.md「5. 既知の不整合」)を
                      忠実に複製する。トークン化は別途対応 */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <a href="/board-game-rules/favorites" className="underline hover:text-emerald-700">
                      お気に入り一覧
                    </a>
                    <span>山田 太郎</span>
                    <button type="button" className="rounded-full border border-gray-200 px-3 py-1">
                      ログアウト
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-bgr-accent">
                既知の不整合: LoginStatus はまだ Analog Hearth トークン(bgr-*)ではなく gray/emerald を使用(別途対応。DESIGN.md「5. 既知の不整合」)。
              </p>
            </div>
          </div>
        </Section>
      </main>
    </div>
  )
}
