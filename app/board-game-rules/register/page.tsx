'use client'

import { useState } from 'react'
import PhotoUploader from '../components/PhotoUploader'
import LoginStatus from '../components/LoginStatus'
import { GENRES, type Genre } from '../lib/genres'
import { createGameRequest, type GameRequestInput } from '../lib/gameRequests'

// Analog Hearthデザイントークン(design.md「デザイントークン」)の見出し/本文フォント(Plus Jakarta
// Sans / Work Sans)は同階層のlayout.tsxがnext/font/googleで読み込み、CSS変数として渡す
// (--font-plus-jakarta-sans/--font-work-sans。globals.cssのfont-heading/font-bodyから参照)。
// page.tsx自体はクライアントコンポーネントかつユニットテストで単体レンダリングされるため、
// フォント読み込みはサーバーコンポーネントのlayout.tsx側に置く(nextjs-notes.md参照)

type FormState = {
  name: string
  minPlayers: string
  maxPlayers: string
  minMinutes: string
  maxMinutes: string
  genres: Genre[]
  minAge: string
  difficulty: string
  publisher: string
  author: string
  hasJapaneseRules: '' | 'true' | 'false'
  awards: string
  releaseYear: string
}

const INITIAL_FORM: FormState = {
  name: '',
  minPlayers: '',
  maxPlayers: '',
  minMinutes: '',
  maxMinutes: '',
  genres: [],
  minAge: '',
  difficulty: '',
  publisher: '',
  author: '',
  hasJapaneseRules: '',
  awards: '',
  releaseYear: '',
}

type Status = 'idle' | 'submitting' | 'success' | 'error'

// 数値入力欄の値(空文字はundefined)をnumberへ変換する
function toNumberOrUndefined(value: string): number | undefined {
  return value === '' ? undefined : Number(value)
}

// テキスト入力欄の共通スタイル(Analog Hearth: 縁線#DCD0B4、角丸8px、影なし)
const TEXT_INPUT_CLASS =
  'w-full rounded-lg border border-bgr-line bg-bgr-bg px-3 py-2 text-sm text-bgr-heading placeholder:text-bgr-subtext/60 focus:border-bgr-primary focus:outline-none'
const LABEL_CLASS = 'block text-sm font-medium text-bgr-heading'

// サービス共通の抽象ロゴ(design.md「ヘッダー」)。ボードゲームの汎用モチーフ(駒/ミープルの
// シルエット)で、囲碁・将棋等の特定ゲームを連想させないようにする
function MeepleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-bgr-primary">
      <path d="M12 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-3.6 7.2h7.2c1 0 1.9.7 2.1 1.7l1.5 6.4a1.1 1.1 0 0 1-1.1 1.4h-2.3l-.6 2.9a1 1 0 0 1-1 .8H8.8a1 1 0 0 1-1-.8l-.6-2.9H4.9a1.1 1.1 0 0 1-1.1-1.4l1.5-6.4c.2-1 1.1-1.7 2.1-1.7Z" />
    </svg>
  )
}

// ロゴ+サービス名+任意ログイン状態(design.md「ヘッダー」)。ログイン状態表示は既存のLoginStatusを踏襲する
function Header() {
  return (
    <header className="border-b border-bgr-line">
      <div className="mx-auto flex max-w-[720px] items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <MeepleMark />
          <span className="font-heading text-lg font-bold text-bgr-heading">ボドゲのトリセツ</span>
        </div>
        <LoginStatus />
      </div>
    </header>
  )
}

// 写真+分類情報(すべて任意)を運営者への登録依頼として送信する画面
// (仕様: game-registration/design.md「依頼を送信する処理」)。
// 見た目はAnalog Hearth(design.md「画面設計(登録依頼フォームのUI)」)に沿い、写真アップロードを
// 主役に据え、ジャンルはアコーディオン+チップ選択、その他の任意項目は「詳細情報」にまとめる。
export default function RegisterPage() {
  const [photos, setPhotos] = useState<File[]>([])
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [status, setStatus] = useState<Status>('idle')
  const [genreOpen, setGenreOpen] = useState(false)

  const minPlayers = toNumberOrUndefined(form.minPlayers)
  const maxPlayers = toNumberOrUndefined(form.maxPlayers)
  const minMinutes = toNumberOrUndefined(form.minMinutes)
  const maxMinutes = toNumberOrUndefined(form.maxMinutes)

  // 下限>上限は送信不可(requirements.md#入力値の制約-9)。境界値(下限=上限)は許容する
  const playersRangeInvalid = minPlayers != null && maxPlayers != null && minPlayers > maxPlayers
  const minutesRangeInvalid = minMinutes != null && maxMinutes != null && minMinutes > maxMinutes
  const canSubmit = photos.length > 0 && !playersRangeInvalid && !minutesRangeInvalid && status !== 'submitting'

  function toggleGenre(genre: Genre) {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre) ? prev.genres.filter((g) => g !== genre) : [...prev.genres, genre],
    }))
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setStatus('submitting')

    const input: GameRequestInput = {
      photos,
      name: form.name || undefined,
      minPlayers,
      maxPlayers,
      minMinutes,
      maxMinutes,
      genres: form.genres,
      minAge: toNumberOrUndefined(form.minAge),
      difficulty: form.difficulty || undefined,
      publisher: form.publisher || undefined,
      author: form.author || undefined,
      hasJapaneseRules: form.hasJapaneseRules === '' ? undefined : form.hasJapaneseRules === 'true',
      awards: form.awards || undefined,
      releaseYear: toNumberOrUndefined(form.releaseYear),
    }

    const ok = await createGameRequest(input)
    setStatus(ok ? 'success' : 'error')
  }

  if (status === 'success') {
    return (
      <div className="font-body min-h-screen bg-bgr-bg">
        <Header />
        <div className="mx-auto max-w-[720px] px-4 py-20 text-center">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="mx-auto h-12 w-12 fill-bgr-primary">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.4-4.2-4.2 1.4-1.4 2.8 2.8 6-6 1.4 1.4Z" />
          </svg>
          <p className="mt-4 text-base text-bgr-heading">受け付けました。運営者確認後に追加されます。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="font-body min-h-screen bg-bgr-bg">
      <Header />
      <main className="mx-auto max-w-[720px] space-y-6 px-4 py-8">
        <div>
          <h1 className="font-heading text-xl font-bold text-bgr-heading">ボードゲームの登録を依頼する</h1>
          <p className="mt-1 text-sm text-bgr-subtext">
            分かる範囲の情報を入力すると、運営者の登録作業の参考になります(写真以外はすべて任意です)。
          </p>
        </div>

        <section className="rounded-2xl border border-bgr-line bg-bgr-card p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-heading text-base font-bold text-bgr-heading">ルールブックの写真</h2>
            <span className="rounded bg-bgr-accent px-2 py-0.5 text-xs font-medium text-white">必須</span>
          </div>
          <p className="mt-1 text-xs text-bgr-subtext">表紙・目次・各ページなど、ルールブックの全ページを推奨します</p>
          <div className="mt-3">
            <PhotoUploader photos={photos} onChange={setPhotos} />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-bgr-line bg-bgr-card p-4 sm:p-6">
          <h2 className="font-heading text-base font-bold text-bgr-heading">基本情報</h2>

          <div className="space-y-1">
            <label htmlFor="game-name" className={LABEL_CLASS}>
              ゲーム名
            </label>
            <input
              id="game-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className={TEXT_INPUT_CLASS}
            />
          </div>

          <fieldset className="space-y-1">
            <legend className={LABEL_CLASS}>対応人数</legend>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="min-players"
                aria-label="対応人数(下限)"
                type="number"
                value={form.minPlayers}
                onChange={(e) => setForm((prev) => ({ ...prev, minPlayers: e.target.value }))}
                className="w-24 rounded-lg border border-bgr-line bg-bgr-bg px-3 py-2 text-sm text-bgr-heading focus:border-bgr-primary focus:outline-none"
              />
              <span className="text-sm text-bgr-subtext">〜</span>
              <input
                id="max-players"
                aria-label="対応人数(上限)"
                type="number"
                value={form.maxPlayers}
                onChange={(e) => setForm((prev) => ({ ...prev, maxPlayers: e.target.value }))}
                className="w-24 rounded-lg border border-bgr-line bg-bgr-bg px-3 py-2 text-sm text-bgr-heading focus:border-bgr-primary focus:outline-none"
              />
              <span className="text-sm text-bgr-subtext">人</span>
            </div>
            {playersRangeInvalid && (
              <p className="text-xs text-bgr-accent">対応人数は下限が上限以下になるように入力してください。</p>
            )}
          </fieldset>

          <fieldset className="space-y-1">
            <legend className={LABEL_CLASS}>プレイ時間</legend>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="min-minutes"
                aria-label="プレイ時間(下限・分)"
                type="number"
                value={form.minMinutes}
                onChange={(e) => setForm((prev) => ({ ...prev, minMinutes: e.target.value }))}
                className="w-24 rounded-lg border border-bgr-line bg-bgr-bg px-3 py-2 text-sm text-bgr-heading focus:border-bgr-primary focus:outline-none"
              />
              <span className="text-sm text-bgr-subtext">〜</span>
              <input
                id="max-minutes"
                aria-label="プレイ時間(上限・分)"
                type="number"
                value={form.maxMinutes}
                onChange={(e) => setForm((prev) => ({ ...prev, maxMinutes: e.target.value }))}
                className="w-24 rounded-lg border border-bgr-line bg-bgr-bg px-3 py-2 text-sm text-bgr-heading focus:border-bgr-primary focus:outline-none"
              />
              <span className="text-sm text-bgr-subtext">分</span>
            </div>
            {minutesRangeInvalid && (
              <p className="text-xs text-bgr-accent">プレイ時間は下限が上限以下になるように入力してください。</p>
            )}
          </fieldset>
        </section>

        <section className="rounded-2xl border border-bgr-line bg-bgr-card p-4 sm:p-6">
          <h2>
            <button
              type="button"
              onClick={() => setGenreOpen((open) => !open)}
              aria-expanded={genreOpen}
              aria-controls="genre-panel"
              className="flex w-full items-center justify-between font-heading text-base font-bold text-bgr-heading"
            >
              <span>ジャンル・メカニクス</span>
              <span aria-hidden="true" className={`text-bgr-subtext transition-transform ${genreOpen ? 'rotate-180' : ''}`}>
                ▾
              </span>
            </button>
          </h2>
          <p className="mt-1 text-xs text-bgr-subtext">任意・複数選択できます</p>

          <div id="genre-panel" hidden={!genreOpen} className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3">
            {GENRES.map((genre) => {
              const selected = form.genres.includes(genre.value)
              return (
                <div key={genre.value}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    aria-label={genre.value}
                    onClick={() => toggleGenre(genre.value)}
                    className={`w-full rounded border px-2.5 py-1.5 text-left text-sm transition-colors ${
                      selected
                        ? 'border-bgr-primary bg-bgr-primary text-white'
                        : 'border-bgr-line bg-bgr-bg text-bgr-heading hover:border-bgr-primary'
                    }`}
                  >
                    {genre.value}
                  </button>
                  {selected && <p className="mt-1 text-xs text-bgr-subtext">{genre.description}</p>}
                </div>
              )
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-bgr-line bg-bgr-card p-4 sm:p-6">
          <div>
            <h2 className="font-heading text-base font-bold text-bgr-heading">詳細情報</h2>
            <p className="mt-1 text-xs text-bgr-subtext">いずれも任意です</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="min-age" className={LABEL_CLASS}>
              対象年齢
            </label>
            <input
              id="min-age"
              type="number"
              value={form.minAge}
              onChange={(e) => setForm((prev) => ({ ...prev, minAge: e.target.value }))}
              className="w-24 rounded-lg border border-bgr-line bg-bgr-bg px-3 py-2 text-sm text-bgr-heading focus:border-bgr-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="difficulty" className={LABEL_CLASS}>
              難易度
            </label>
            <input
              id="difficulty"
              type="text"
              value={form.difficulty}
              onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
              className={TEXT_INPUT_CLASS}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="publisher" className={LABEL_CLASS}>
              メーカー/出版社
            </label>
            <input
              id="publisher"
              type="text"
              value={form.publisher}
              onChange={(e) => setForm((prev) => ({ ...prev, publisher: e.target.value }))}
              className={TEXT_INPUT_CLASS}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="author" className={LABEL_CLASS}>
              作者
            </label>
            <input
              id="author"
              type="text"
              value={form.author}
              onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
              className={TEXT_INPUT_CLASS}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="has-japanese-rules" className={LABEL_CLASS}>
              言語依存度(日本語ルール)
            </label>
            <select
              id="has-japanese-rules"
              value={form.hasJapaneseRules}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, hasJapaneseRules: e.target.value as FormState['hasJapaneseRules'] }))
              }
              className={TEXT_INPUT_CLASS}
            >
              <option value="">わからない</option>
              <option value="true">日本語ルールあり</option>
              <option value="false">日本語ルールなし</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="awards" className={LABEL_CLASS}>
              受賞歴
            </label>
            <input
              id="awards"
              type="text"
              value={form.awards}
              onChange={(e) => setForm((prev) => ({ ...prev, awards: e.target.value }))}
              className={TEXT_INPUT_CLASS}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="release-year" className={LABEL_CLASS}>
              発売年
            </label>
            <input
              id="release-year"
              type="number"
              value={form.releaseYear}
              onChange={(e) => setForm((prev) => ({ ...prev, releaseYear: e.target.value }))}
              className="w-32 rounded-lg border border-bgr-line bg-bgr-bg px-3 py-2 text-sm text-bgr-heading focus:border-bgr-primary focus:outline-none"
            />
          </div>
        </section>

        {status === 'error' && (
          <p className="text-sm text-bgr-accent">送信に失敗しました。もう一度お試しください。</p>
        )}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          className="w-full rounded-lg bg-bgr-primary py-3 text-sm font-bold text-white transition-colors hover:bg-bgr-primary-active disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === 'submitting' ? '送信中…' : '依頼を送信する'}
        </button>
      </main>
    </div>
  )
}
