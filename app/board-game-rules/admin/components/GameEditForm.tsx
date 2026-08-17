'use client'

import { useState } from 'react'
import { GENRES, type Genre } from '../../lib/genres'
import { RULE_CHAPTERS, type ChapterKey } from '../../lib/rulesChapters'
import { getGamePhotoUrl } from '../../lib/gamePhotos'
import type { AdminGame } from '../lib/fetchAdminGames'
import type { GameEditInput } from '../lib/moderation'

// 登録依頼画面(GamePhotoUploader)と同じ量的制約(仕様: game-registration/design.md「バリデーション」、
// admin/design.md「ゲーム紹介画像を差し替え・削除する処理」手順2)。実際の上限判定は
// admin/lib/introPhotos.tsのaddIntroPhotosが行う(このフォームは表示用に同じ値を持つのみ)
const MAX_INTRO_PHOTO_COUNT = 20

type Props = {
  game: AdminGame
  onSave: (input: GameEditInput) => Promise<boolean>
  onCancel: () => void
  // ゲーム紹介画像の追加・削除・並び替えは他の項目と異なり、保存ボタンを介さず操作ごとに
  // 即時UPDATEする(仕様: admin/design.md「ゲーム紹介画像を差し替え・削除する処理」)。
  // 呼び出し元(admin/page.tsx)がintroPhotos.tsの各関数を再取得(reload)込みでラップして渡す
  onAddIntroPhotos: (gameId: string, existingPaths: string[], files: File[]) => Promise<boolean>
  onRemoveIntroPhoto: (gameId: string, existingPaths: string[], path: string) => Promise<boolean>
  onSetMainIntroPhoto: (gameId: string, existingPaths: string[], path: string) => Promise<boolean>
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

function chapterBody(game: AdminGame, key: ChapterKey): string {
  return game.rulesDetailed.find((c) => c.key === key)?.body ?? ''
}

// 選んだゲームの分類情報・ルール本文(簡単版・詳しい版の各章)を編集して上書き保存する
// (仕様: admin/design.md「ゲームを編集して上書き保存する処理」)。登録時と同じ検証は
// moderation.tsのeditGameが行う(このフォームは値を組み立てて渡すだけ)。
export default function GameEditForm({
  game,
  onSave,
  onCancel,
  onAddIntroPhotos,
  onRemoveIntroPhoto,
  onSetMainIntroPhoto,
}: Props) {
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
  // ゲーム紹介画像の追加・削除・並び替えは保存ボタンとは別に即時UPDATEされるため、
  // 失敗時の表示もstatus(保存ボタン用)とは別枠で管理する(design.md「ゲーム紹介画像を
  // 差し替え・削除する処理」手順6: 失敗したら失敗表示)
  const [introPhotoStatus, setIntroPhotoStatus] = useState<'idle' | 'error'>('idle')
  const introPhotoAtLimit = game.introPhotoPaths.length >= MAX_INTRO_PHOTO_COUNT

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

  // ゲーム紹介画像は他の項目と異なり操作ごとに即時UPDATEされる(design.md「ゲーム紹介画像を
  // 差し替え・削除する処理」)。表示は常にgame.introPhotoPaths(props)から行い、親のreloadで
  // 最新化されたgameを受け直すことで反映する(ローカルにミラーした状態を持たない)。
  // 成功時は再取得後の表示に反映されるためintroPhotoStatusをidleに戻し、失敗時は失敗表示を出す
  async function handleAddIntroPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) {
      const ok = await onAddIntroPhotos(game.id, game.introPhotoPaths, files)
      setIntroPhotoStatus(ok ? 'idle' : 'error')
    }
    e.target.value = ''
  }

  async function handleRemoveIntroPhoto(path: string) {
    const ok = await onRemoveIntroPhoto(game.id, game.introPhotoPaths, path)
    setIntroPhotoStatus(ok ? 'idle' : 'error')
  }

  async function handleSetMainIntroPhoto(path: string) {
    const ok = await onSetMainIntroPhoto(game.id, game.introPhotoPaths, path)
    setIntroPhotoStatus(ok ? 'idle' : 'error')
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

      <fieldset className="space-y-2">
        <legend className="font-medium text-gray-700">ゲーム紹介画像</legend>
        {game.introPhotoPaths.length > 0 && (
          <ul className="flex flex-wrap gap-3">
            {game.introPhotoPaths.map((path, index) => (
              <li key={path} className="relative w-20">
                {index === 0 && (
                  <span className="absolute left-1 top-1 z-10 rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    メイン
                  </span>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element -- 公開Storageの外部URLをそのまま表示する(next/image最適化は不要) */}
                <img
                  src={getGamePhotoUrl(path)}
                  alt={`ゲーム紹介画像 ${index + 1}枚目`}
                  className="h-20 w-20 rounded border border-gray-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => void handleRemoveIntroPhoto(path)}
                  aria-label={`ゲーム紹介画像 ${index + 1}枚目を削除`}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs text-white"
                >
                  ×
                </button>
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => void handleSetMainIntroPhoto(path)}
                    aria-label={`ゲーム紹介画像 ${index + 1}枚目をメイン画像にする`}
                    className="mt-1 w-full rounded border border-gray-300 px-1 py-0.5 text-[10px] text-gray-600"
                  >
                    メイン画像にする
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-gray-500">
          {game.introPhotoPaths.length}/{MAX_INTRO_PHOTO_COUNT}枚
        </p>
        {introPhotoAtLimit && (
          <p className="text-xs text-red-600">上限の{MAX_INTRO_PHOTO_COUNT}枚に達しました。これ以上は追加できません。</p>
        )}
        <label htmlFor="edit-intro-photo-input" className="block text-xs text-gray-600">
          画像を追加
        </label>
        <input
          id="edit-intro-photo-input"
          type="file"
          accept="image/*"
          multiple
          disabled={introPhotoAtLimit}
          onChange={(e) => void handleAddIntroPhotos(e)}
          aria-label="ゲーム紹介画像を追加"
          className="text-xs"
        />
        {introPhotoStatus === 'error' && <p className="text-red-600">画像の変更に失敗しました。</p>}
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
