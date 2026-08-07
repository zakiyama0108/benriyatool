'use client'

import { useState } from 'react'
import { GENRES, type Genre } from '../../lib/genres'
import { RULE_CHAPTERS, type ChapterKey } from '../../lib/rulesChapters'
import type { AdminGame } from '../lib/fetchAdminGames'
import type { GameEditInput } from '../lib/moderation'

type Props = {
  game: AdminGame
  onSave: (input: GameEditInput) => Promise<boolean>
  onCancel: () => void
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

function chapterBody(game: AdminGame, key: ChapterKey): string {
  return game.rulesDetailed.find((c) => c.key === key)?.body ?? ''
}

// 選んだゲームの分類情報・ルール本文(簡単版・詳しい版の各章)を編集して上書き保存する
// (仕様: admin/design.md「ゲームを編集して上書き保存する処理」)。登録時と同じ検証は
// moderation.tsのeditGameが行う(このフォームは値を組み立てて渡すだけ)。
export default function GameEditForm({ game, onSave, onCancel }: Props) {
  const [name, setName] = useState(game.name)
  const [minPlayers, setMinPlayers] = useState(String(game.minPlayers))
  const [maxPlayers, setMaxPlayers] = useState(String(game.maxPlayers))
  const [minMinutes, setMinMinutes] = useState(String(game.minMinutes))
  const [maxMinutes, setMaxMinutes] = useState(String(game.maxMinutes))
  const [genres, setGenres] = useState<Genre[]>(game.genres)
  const [minAge, setMinAge] = useState(game.minAge != null ? String(game.minAge) : '')
  const [difficulty, setDifficulty] = useState(game.difficulty ?? '')
  const [publisher, setPublisher] = useState(game.publisher ?? '')
  const [author, setAuthor] = useState(game.author ?? '')
  const [hasJapaneseRules, setHasJapaneseRules] = useState<'' | 'true' | 'false'>(
    game.hasJapaneseRules == null ? '' : game.hasJapaneseRules ? 'true' : 'false'
  )
  const [awards, setAwards] = useState(game.awards ?? '')
  const [releaseYear, setReleaseYear] = useState(game.releaseYear != null ? String(game.releaseYear) : '')
  const [rulesSimple, setRulesSimple] = useState(game.rulesSimple)
  const [chapterBodies, setChapterBodies] = useState<Record<ChapterKey, string>>(
    Object.fromEntries(RULE_CHAPTERS.map((c) => [c.key, chapterBody(game, c.key)])) as Record<ChapterKey, string>
  )
  const [status, setStatus] = useState<SaveStatus>('idle')

  function toggleGenre(genre: Genre) {
    setGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]))
  }

  async function handleSave() {
    setStatus('saving')
    const input: GameEditInput = {
      id: game.id,
      name,
      minPlayers: Number(minPlayers),
      maxPlayers: Number(maxPlayers),
      minMinutes: Number(minMinutes),
      maxMinutes: Number(maxMinutes),
      genres,
      minAge: minAge === '' ? undefined : Number(minAge),
      difficulty: difficulty || undefined,
      publisher: publisher || undefined,
      author: author || undefined,
      hasJapaneseRules: hasJapaneseRules === '' ? undefined : hasJapaneseRules === 'true',
      awards: awards || undefined,
      releaseYear: releaseYear === '' ? undefined : Number(releaseYear),
      rulesSimple,
      rulesDetailed: RULE_CHAPTERS.map((c) => ({ key: c.key, body: chapterBodies[c.key] })),
    }
    const ok = await onSave(input)
    setStatus(ok ? 'success' : 'error')
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4 text-sm">
      <div className="space-y-1">
        <label htmlFor="edit-name" className="block font-medium text-gray-700">
          ゲーム名
        </label>
        <input
          id="edit-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          aria-label="対応人数(下限)"
          type="number"
          value={minPlayers}
          onChange={(e) => setMinPlayers(e.target.value)}
          className="w-20 rounded border border-gray-300 px-2 py-1"
        />
        <span>〜</span>
        <input
          aria-label="対応人数(上限)"
          type="number"
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(e.target.value)}
          className="w-20 rounded border border-gray-300 px-2 py-1"
        />
        <span>人</span>
      </div>

      <div className="flex items-center gap-2">
        <input
          aria-label="プレイ時間(下限・分)"
          type="number"
          value={minMinutes}
          onChange={(e) => setMinMinutes(e.target.value)}
          className="w-20 rounded border border-gray-300 px-2 py-1"
        />
        <span>〜</span>
        <input
          aria-label="プレイ時間(上限・分)"
          type="number"
          value={maxMinutes}
          onChange={(e) => setMaxMinutes(e.target.value)}
          className="w-20 rounded border border-gray-300 px-2 py-1"
        />
        <span>分</span>
      </div>

      <fieldset className="space-y-1">
        <legend className="font-medium text-gray-700">ジャンル</legend>
        <div className="grid grid-cols-2 gap-1">
          {GENRES.map((g) => (
            <label key={g.value} className="flex items-center gap-1">
              <input
                type="checkbox"
                aria-label={g.value}
                checked={genres.includes(g.value)}
                onChange={() => toggleGenre(g.value)}
              />
              {g.value}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="edit-min-age" className="block font-medium text-gray-700">
          対象年齢
        </label>
        <input
          id="edit-min-age"
          type="number"
          value={minAge}
          onChange={(e) => setMinAge(e.target.value)}
          className="w-24 rounded border border-gray-300 px-2 py-1"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="edit-difficulty" className="block font-medium text-gray-700">
          難易度
        </label>
        <input
          id="edit-difficulty"
          type="text"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="edit-publisher" className="block font-medium text-gray-700">
          メーカー/出版社
        </label>
        <input
          id="edit-publisher"
          type="text"
          value={publisher}
          onChange={(e) => setPublisher(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="edit-author" className="block font-medium text-gray-700">
          作者
        </label>
        <input
          id="edit-author"
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="edit-has-japanese-rules" className="block font-medium text-gray-700">
          言語依存度(日本語ルール)
        </label>
        <select
          id="edit-has-japanese-rules"
          value={hasJapaneseRules}
          onChange={(e) => setHasJapaneseRules(e.target.value as 'true' | 'false' | '')}
          className="w-full rounded border border-gray-300 px-2 py-1"
        >
          <option value="">わからない</option>
          <option value="true">日本語ルールあり</option>
          <option value="false">日本語ルールなし</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="edit-awards" className="block font-medium text-gray-700">
          受賞歴
        </label>
        <input
          id="edit-awards"
          type="text"
          value={awards}
          onChange={(e) => setAwards(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="edit-release-year" className="block font-medium text-gray-700">
          発売年
        </label>
        <input
          id="edit-release-year"
          type="number"
          value={releaseYear}
          onChange={(e) => setReleaseYear(e.target.value)}
          className="w-32 rounded border border-gray-300 px-2 py-1"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="edit-rules-simple" className="block font-medium text-gray-700">
          簡単版ルール
        </label>
        <textarea
          id="edit-rules-simple"
          value={rulesSimple}
          onChange={(e) => setRulesSimple(e.target.value)}
          rows={4}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="font-medium text-gray-700">詳しい版ルール(章ごと)</legend>
        {RULE_CHAPTERS.map((chapter) => (
          <div key={chapter.key} className="space-y-1">
            <label htmlFor={`edit-chapter-${chapter.key}`} className="block text-xs text-gray-600">
              {chapter.heading}
            </label>
            <textarea
              id={`edit-chapter-${chapter.key}`}
              value={chapterBodies[chapter.key]}
              onChange={(e) =>
                setChapterBodies((prev) => ({ ...prev, [chapter.key]: e.target.value }))
              }
              rows={3}
              className="w-full rounded border border-gray-300 px-2 py-1"
            />
          </div>
        ))}
      </fieldset>

      {status === 'success' && <p className="text-green-700">保存しました。</p>}
      {status === 'error' && <p className="text-red-600">保存に失敗しました。</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={status === 'saving'}
          onClick={() => void handleSave()}
          className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-40"
        >
          保存する
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-gray-300 px-4 py-2 text-gray-700"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}
