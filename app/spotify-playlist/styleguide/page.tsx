'use client'

import SongResultCard from '../components/SongResultCard'
import CreateBar from '../components/CreateBar'
import type { TrackCandidate } from '../lib/spotifyApi'

// spotify-playlist(曲名からプレイリスト作成)の配色トークンと共通部品のカタログ(開発者向け確認ページ。
// 利用者向けの公開機能ではない。sitemap除外: specs/hub-site/requirements.md#機能要件-5)。
// トークンの実体は app/globals.css の sp-*。新しい見た目はこのページのために作り起こさず、
// 実装済みの部品・トークンを写す(design/SKILL.md「共通chromeとトークンの一貫性」)。
// フォルダ名にアンダースコアは付けない(_styleguideはNext.jsのprivate folderで生きたURLに遷移できないため)。

// 配色トークン(globals.css の @theme sp-* から転記)
const COLOR_TOKENS: { name: string; hex: string; swatch: string; use: string }[] = [
  { name: 'sp-bg', hex: '#121212', swatch: 'bg-sp-bg', use: '背景(ダーク基調)' },
  { name: 'sp-surface', hex: '#181818', swatch: 'bg-sp-surface', use: 'カード・バー背景' },
  { name: 'sp-surface-hover', hex: '#282828', swatch: 'bg-sp-surface-hover', use: 'ホバー・選択' },
  { name: 'sp-line', hex: '#2a2a2a', swatch: 'bg-sp-line', use: '罫線' },
  { name: 'sp-text', hex: '#ffffff', swatch: 'bg-sp-text', use: '本文・見出し' },
  { name: 'sp-subtext', hex: '#b3b3b3', swatch: 'bg-sp-subtext', use: 'サブテキスト' },
  { name: 'sp-green', hex: '#1db954', swatch: 'bg-sp-green', use: 'アクセント(主要操作)' },
  { name: 'sp-green-hover', hex: '#1ed760', swatch: 'bg-sp-green-hover', use: 'アクセント押下・ホバー' },
]

function candidate(id: string, title: string, artist: string): TrackCandidate {
  return { id, uri: `spotify:track:${id}`, title, artist, album: 'アルバム名', albumArtUrl: null, durationMs: 214_000 }
}
const multiCandidates = [
  candidate('a', 'Lemon', '米津玄師'),
  candidate('b', 'Lemon (Live)', '米津玄師'),
  candidate('c', 'Lemon - Cover', 'カバーアーティスト'),
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-sp-text">{title}</h2>
      {children}
    </section>
  )
}

export default function SpotifyPlaylistStyleguidePage() {
  return (
    <div className="min-h-screen bg-sp-bg text-sp-text">
      <header className="border-b border-sp-line px-6 py-3">
        <span className="text-sm font-bold">曲名からプレイリスト作成 — styleguide</span>
      </header>
      <main className="mx-auto w-full max-w-3xl space-y-12 px-6 py-10">
        <p className="text-sm text-sp-subtext">
          sp-* トークンと共通部品のカタログ(開発者向け)。トークンの実体は app/globals.css。
        </p>

        <Section title="配色トークン(Spotifyライク ダーク基調)">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COLOR_TOKENS.map((token) => (
              <li key={token.name} className="rounded-lg border border-sp-line bg-sp-surface p-2">
                <div className={`mb-2 h-12 w-full rounded border border-sp-line ${token.swatch}`} />
                <p className="font-mono text-xs font-bold">{token.name}</p>
                <p className="font-mono text-xs text-sp-subtext">{token.hex}</p>
                <p className="text-xs text-sp-subtext">{token.use}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="ボタン">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="rounded-full bg-sp-green px-5 py-1.5 text-sm font-bold text-sp-on-green">
              主要操作(検索する / 作成)
            </button>
            <button
              type="button"
              disabled
              className="rounded-full bg-sp-green px-5 py-1.5 text-sm font-bold text-sp-on-green disabled:opacity-50"
            >
              無効
            </button>
            <button
              type="button"
              className="rounded-full border border-sp-line px-4 py-1.5 text-sm font-bold text-sp-text"
            >
              副次操作(ログアウト / もう一度作る)
            </button>
          </div>
        </Section>

        <Section title="SongResultCard(曲ごとの検索結果カード)">
          <div className="space-y-3">
            <SongResultCard songName="検索中の曲" state="検索中" candidates={[]} selectedId={null} hasMore={false} onSelect={() => {}} onLoadMore={() => {}} />
            <SongResultCard songName="見つからなかった曲" state="見つからなかった" candidates={[]} selectedId={null} hasMore={false} onSelect={() => {}} onLoadMore={() => {}} />
            <SongResultCard songName="検索に失敗した曲" state="検索失敗" candidates={[]} selectedId={null} hasMore={false} onSelect={() => {}} onLoadMore={() => {}} />
            <SongResultCard
              songName="1件だけヒットした曲"
              state="採用確定"
              candidates={[candidate('single', 'Pretender', 'Official髭男dism')]}
              selectedId="single"
              hasMore={false}
              onSelect={() => {}}
              onLoadMore={() => {}}
            />
            <SongResultCard
              songName="複数候補・未選択"
              state="未選択"
              candidates={multiCandidates}
              selectedId={null}
              hasMore
              onSelect={() => {}}
              onLoadMore={() => {}}
            />
            <SongResultCard
              songName="複数候補・選択済み"
              state="採用確定"
              candidates={multiCandidates}
              selectedId="b"
              hasMore={false}
              onSelect={() => {}}
              onLoadMore={() => {}}
            />
          </div>
        </Section>

        <Section title="CreateBar(下部固定バー)">
          <div className="space-y-4">
            <div className="rounded-lg border border-sp-line">
              <CreateBar adoptedCount={3} playlistName="夜ドライブ" onPlaylistNameChange={() => {}} disabled={false} isCreating={false} onCreate={() => {}} onReset={() => {}} />
            </div>
            <div className="rounded-lg border border-sp-line">
              <CreateBar adoptedCount={0} playlistName="" onPlaylistNameChange={() => {}} disabled isCreating={false} onCreate={() => {}} onReset={() => {}} errorMessage="通信エラーが発生しました。時間をおいて再度お試しください。" />
            </div>
            <div className="rounded-lg border border-sp-line">
              <CreateBar adoptedCount={3} playlistName="夜ドライブ" onPlaylistNameChange={() => {}} disabled isCreating onCreate={() => {}} onReset={() => {}} />
            </div>
            <div className="rounded-lg border border-sp-line">
              <CreateBar adoptedCount={3} playlistName="夜ドライブ" onPlaylistNameChange={() => {}} disabled={false} isCreating={false} onCreate={() => {}} onReset={() => {}} completedUrl="https://open.spotify.com/playlist/example" />
            </div>
          </div>
        </Section>
      </main>
    </div>
  )
}
