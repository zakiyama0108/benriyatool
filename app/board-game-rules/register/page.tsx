'use client'

import { useState } from 'react'
import PhotoUploader from '../components/PhotoUploader'
import { GENRES, type Genre } from '../lib/genres'
import { createGameRequest, type GameRequestInput } from '../lib/gameRequests'

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

// 写真+分類情報(すべて任意)を運営者への登録依頼として送信する画面
// (仕様: game-registration/design.md「依頼を送信する処理」)。
// LLM解析・プレビュー・確定の一連は撤廃済みで、送信のみのシンプルな画面にする。
export default function RegisterPage() {
  const [photos, setPhotos] = useState<File[]>([])
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [status, setStatus] = useState<Status>('idle')

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
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-gray-700">受け付けました。運営者確認後に追加されます。</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <h1 className="text-xl font-bold">ボードゲームの登録を依頼する</h1>
      <p className="text-sm text-gray-500">
        ルールブックの写真をアップロードしてください。分かる範囲の情報を入力すると、運営者の登録作業の参考になります(すべて任意)。
      </p>

      <PhotoUploader photos={photos} onChange={setPhotos} />

      <div className="space-y-1">
        <label htmlFor="game-name" className="block text-sm font-medium text-gray-700">
          ゲーム名
        </label>
        <input
          id="game-name"
          type="text"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium text-gray-700">対応人数</legend>
        <div className="flex items-center gap-2">
          <input
            id="min-players"
            aria-label="対応人数(下限)"
            type="number"
            value={form.minPlayers}
            onChange={(e) => setForm((prev) => ({ ...prev, minPlayers: e.target.value }))}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <span className="text-sm text-gray-400">〜</span>
          <input
            id="max-players"
            aria-label="対応人数(上限)"
            type="number"
            value={form.maxPlayers}
            onChange={(e) => setForm((prev) => ({ ...prev, maxPlayers: e.target.value }))}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <span className="text-sm text-gray-400">人</span>
        </div>
        {playersRangeInvalid && (
          <p className="text-xs text-red-600">対応人数は下限が上限以下になるように入力してください。</p>
        )}
      </fieldset>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium text-gray-700">プレイ時間</legend>
        <div className="flex items-center gap-2">
          <input
            id="min-minutes"
            aria-label="プレイ時間(下限・分)"
            type="number"
            value={form.minMinutes}
            onChange={(e) => setForm((prev) => ({ ...prev, minMinutes: e.target.value }))}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <span className="text-sm text-gray-400">〜</span>
          <input
            id="max-minutes"
            aria-label="プレイ時間(上限・分)"
            type="number"
            value={form.maxMinutes}
            onChange={(e) => setForm((prev) => ({ ...prev, maxMinutes: e.target.value }))}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <span className="text-sm text-gray-400">分</span>
        </div>
        {minutesRangeInvalid && (
          <p className="text-xs text-red-600">プレイ時間は下限が上限以下になるように入力してください。</p>
        )}
      </fieldset>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium text-gray-700">ジャンル(複数選択可)</legend>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {GENRES.map((g) => (
            <label key={g.value} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                aria-label={g.value}
                checked={form.genres.includes(g.value)}
                onChange={() => toggleGenre(g.value)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">{g.value}</span>
                <span className="block text-xs text-gray-400">{g.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="min-age" className="block text-sm font-medium text-gray-700">
          対象年齢
        </label>
        <input
          id="min-age"
          type="number"
          value={form.minAge}
          onChange={(e) => setForm((prev) => ({ ...prev, minAge: e.target.value }))}
          className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
          難易度
        </label>
        <input
          id="difficulty"
          type="text"
          value={form.difficulty}
          onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="publisher" className="block text-sm font-medium text-gray-700">
          メーカー/出版社
        </label>
        <input
          id="publisher"
          type="text"
          value={form.publisher}
          onChange={(e) => setForm((prev) => ({ ...prev, publisher: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="author" className="block text-sm font-medium text-gray-700">
          作者
        </label>
        <input
          id="author"
          type="text"
          value={form.author}
          onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="has-japanese-rules" className="block text-sm font-medium text-gray-700">
          言語依存度(日本語ルール)
        </label>
        <select
          id="has-japanese-rules"
          value={form.hasJapaneseRules}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, hasJapaneseRules: e.target.value as FormState['hasJapaneseRules'] }))
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">わからない</option>
          <option value="true">日本語ルールあり</option>
          <option value="false">日本語ルールなし</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="awards" className="block text-sm font-medium text-gray-700">
          受賞歴
        </label>
        <input
          id="awards"
          type="text"
          value={form.awards}
          onChange={(e) => setForm((prev) => ({ ...prev, awards: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="release-year" className="block text-sm font-medium text-gray-700">
          発売年
        </label>
        <input
          id="release-year"
          type="number"
          value={form.releaseYear}
          onChange={(e) => setForm((prev) => ({ ...prev, releaseYear: e.target.value }))}
          className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-600">送信に失敗しました。もう一度お試しください。</p>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void handleSubmit()}
        className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {status === 'submitting' ? '送信中…' : '依頼を送信する'}
      </button>
    </div>
  )
}
