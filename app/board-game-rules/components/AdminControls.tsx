'use client'

import { useState } from 'react'
import { GENRES, type Genre } from '../lib/genres'
import { RULE_CHAPTERS, type ChapterKey } from '../lib/rulesChapters'
import { getGamePhotoUrl } from '../lib/gamePhotos'
import type { Game } from '../lib/games'
import { editGame, deleteGame, type GameEditInput } from '../lib/gameModeration'
import { addIntroPhotos, removeIntroPhoto, setMainIntroPhoto } from '../lib/introPhotos'
import { fetchOriginalPhotos, type PhotoFetchResult } from '../lib/originalPhotos'

// 登録依頼画面(GamePhotoUploader)と同じ量的制約(仕様: game-registration/design.md「バリデーション」)。
// 実際の上限判定はintroPhotos.tsのaddIntroPhotosが行い、ここは表示用に同じ値を持つのみ。
const MAX_INTRO_PHOTO_COUNT = 20

type Props = {
  game: Game
  // 編集・紹介画像変更の成功後に詳細を再取得する(親=detail/page.tsx)
  onChanged: () => void
  // 物理削除の成功後に一覧へ遷移する(親=detail/page.tsx)
  onDeleted: () => void
}

function chapterBody(game: Game, key: ChapterKey): string {
  return game.rulesDetailed.find((c) => c.key === key)?.body ?? ''
}

// 運営者(管理者)ログイン時のみ詳細画面に表示する管理者導線
// (仕様: game-detail/design.md「運営者向けの操作(管理者ログイン時)」)。編集・物理削除(確認付き)・
// 元写真照合・紹介画像の差し替え/削除/並び替えをまとめる。コメント削除はCommentSection側が担う。
// 表示の出し分けは案内用で、実際の保護はDBのRLS・Storageポリシーが担う(design.md#セキュリティ)。
export default function AdminControls({ game, onChanged, onDeleted }: Props) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [failed, setFailed] = useState(false)
  const [originalPhotos, setOriginalPhotos] = useState<PhotoFetchResult[] | null>(null)
  const [loadingOriginals, setLoadingOriginals] = useState(false)

  // 編集フォームの入力状態
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

  const introPhotoAtLimit = game.introPhotoPaths.length >= MAX_INTRO_PHOTO_COUNT

  function toggleGenre(genre: Genre) {
    setGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]))
  }

  async function handleSave() {
    if (processing) return
    setProcessing(true)
    setFailed(false)
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
    const ok = await editGame(input)
    setProcessing(false)
    if (ok) {
      setEditing(false)
      onChanged()
      return
    }
    setFailed(true)
  }

  async function handleConfirmDelete() {
    if (processing) return
    setProcessing(true)
    setFailed(false)
    const ok = await deleteGame(game.id)
    if (ok) {
      onDeleted()
      return
    }
    setProcessing(false)
    setFailed(true)
  }

  async function handleViewOriginals() {
    setLoadingOriginals(true)
    const photos = await fetchOriginalPhotos(game.id)
    setOriginalPhotos(photos)
    setLoadingOriginals(false)
  }

  async function handleAddIntroPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) {
      const ok = await addIntroPhotos(game.id, game.introPhotoPaths, files)
      if (ok) onChanged()
      else setFailed(true)
    }
    e.target.value = ''
  }

  async function handleRemoveIntroPhoto(path: string) {
    const ok = await removeIntroPhoto(game.id, game.introPhotoPaths, path)
    if (ok) onChanged()
    else setFailed(true)
  }

  async function handleSetMainIntroPhoto(path: string) {
    const ok = await setMainIntroPhoto(game.id, game.introPhotoPaths, path)
    if (ok) onChanged()
    else setFailed(true)
  }

  return (
    <section className="mt-4 space-y-3 rounded-lg border border-bgr-accent/40 bg-bgr-accent/5 p-4 text-sm">
      <h2 className="font-bold text-bgr-accent">管理者メニュー</h2>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="rounded border border-bgr-line px-3 py-1 text-bgr-text"
        >
          編集
        </button>
        <button
          type="button"
          onClick={() => void handleViewOriginals()}
          className="rounded border border-bgr-line px-3 py-1 text-bgr-text"
        >
          元写真を照合
        </button>
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="rounded border border-red-300 px-3 py-1 text-red-600"
          >
            ゲームを削除
          </button>
        ) : (
          <span className="inline-flex items-center gap-2">
            <span className="text-red-600">このゲームを完全に削除します。元に戻せません。</span>
            <button
              type="button"
              disabled={processing}
              onClick={() => void handleConfirmDelete()}
              className="rounded bg-red-600 px-3 py-1 text-white disabled:opacity-50"
            >
              削除を確定
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={() => setConfirmingDelete(false)}
              className="rounded border border-bgr-line px-3 py-1 text-bgr-subtext"
            >
              やめる
            </button>
          </span>
        )}
      </div>

      {failed && <p className="text-xs text-red-600">操作に失敗しました。時間をおいて再度お試しください。</p>}

      {/* 元写真の照合閲覧(運営者本人のみ取得可) */}
      {loadingOriginals && <p className="text-xs text-bgr-subtext">元写真を読み込み中…</p>}
      {originalPhotos && (
        <div>
          <p className="mb-1 text-xs text-bgr-subtext">投稿時の元写真(照合用・運営者のみ)</p>
          {originalPhotos.length === 0 ? (
            <p className="text-xs text-bgr-subtext">元写真はありません。</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {originalPhotos.map((photo, index) =>
                photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 非公開Storageの署名URLをそのまま表示する(next/image最適化は不要)
                  <img
                    key={photo.path}
                    src={photo.url}
                    alt={`元写真 ${index + 1}枚目`}
                    className="h-24 w-24 rounded border border-bgr-line object-cover"
                  />
                ) : (
                  <span key={photo.path} className="text-xs text-bgr-subtext">
                    (取得できませんでした)
                  </span>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* ゲーム紹介画像の差し替え・削除・並び替え */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-bgr-text">
          ゲーム紹介画像({game.introPhotoPaths.length}/{MAX_INTRO_PHOTO_COUNT}枚)
        </p>
        {game.introPhotoPaths.length > 0 && (
          <ul className="flex flex-wrap gap-3">
            {game.introPhotoPaths.map((path, index) => (
              <li key={path} className="relative w-20">
                {index === 0 && (
                  <span className="absolute left-1 top-1 z-10 rounded bg-bgr-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                    メイン
                  </span>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element -- 公開StorageのURLをそのまま表示する */}
                <img
                  src={getGamePhotoUrl(path)}
                  alt={`ゲーム紹介画像 ${index + 1}枚目`}
                  className="h-20 w-20 rounded border border-bgr-line object-cover"
                />
                <button
                  type="button"
                  onClick={() => void handleRemoveIntroPhoto(path)}
                  aria-label={`ゲーム紹介画像 ${index + 1}枚目を削除`}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-bgr-text text-xs text-white"
                >
                  ×
                </button>
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => void handleSetMainIntroPhoto(path)}
                    aria-label={`ゲーム紹介画像 ${index + 1}枚目をメイン画像にする`}
                    className="mt-1 w-full rounded border border-bgr-line px-1 py-0.5 text-[10px] text-bgr-subtext"
                  >
                    メイン画像にする
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {introPhotoAtLimit && (
          <p className="text-xs text-red-600">上限の{MAX_INTRO_PHOTO_COUNT}枚に達しました。これ以上は追加できません。</p>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={introPhotoAtLimit}
          onChange={(e) => void handleAddIntroPhotos(e)}
          aria-label="ゲーム紹介画像を追加"
          className="text-xs"
        />
      </div>

      {/* 分類情報・ルール本文の編集フォーム(展開式) */}
      {editing && (
        <div className="space-y-3 rounded border border-bgr-line p-3">
          <div className="space-y-1">
            <label htmlFor="admin-edit-name" className="block font-medium text-bgr-text">
              ゲーム名
            </label>
            <input
              id="admin-edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-bgr-line px-3 py-2"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              aria-label="対応人数(下限)"
              type="number"
              value={minPlayers}
              onChange={(e) => setMinPlayers(e.target.value)}
              className="w-20 rounded border border-bgr-line px-2 py-1"
            />
            <span>〜</span>
            <input
              aria-label="対応人数(上限)"
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              className="w-20 rounded border border-bgr-line px-2 py-1"
            />
            <span>人</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              aria-label="プレイ時間(下限・分)"
              type="number"
              value={minMinutes}
              onChange={(e) => setMinMinutes(e.target.value)}
              className="w-20 rounded border border-bgr-line px-2 py-1"
            />
            <span>〜</span>
            <input
              aria-label="プレイ時間(上限・分)"
              type="number"
              value={maxMinutes}
              onChange={(e) => setMaxMinutes(e.target.value)}
              className="w-20 rounded border border-bgr-line px-2 py-1"
            />
            <span>分</span>
          </div>

          <fieldset className="space-y-1">
            <legend className="font-medium text-bgr-text">ジャンル</legend>
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
            <label htmlFor="admin-edit-min-age" className="block font-medium text-bgr-text">
              対象年齢
            </label>
            <input
              id="admin-edit-min-age"
              type="number"
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
              className="w-24 rounded border border-bgr-line px-2 py-1"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="admin-edit-difficulty" className="block font-medium text-bgr-text">
              難易度
            </label>
            <input
              id="admin-edit-difficulty"
              type="text"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded border border-bgr-line px-2 py-1"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="admin-edit-publisher" className="block font-medium text-bgr-text">
              メーカー/出版社
            </label>
            <input
              id="admin-edit-publisher"
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              className="w-full rounded border border-bgr-line px-2 py-1"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="admin-edit-author" className="block font-medium text-bgr-text">
              作者
            </label>
            <input
              id="admin-edit-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full rounded border border-bgr-line px-2 py-1"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="admin-edit-has-japanese-rules" className="block font-medium text-bgr-text">
              言語依存度(日本語ルール)
            </label>
            <select
              id="admin-edit-has-japanese-rules"
              value={hasJapaneseRules}
              onChange={(e) => setHasJapaneseRules(e.target.value as 'true' | 'false' | '')}
              className="w-full rounded border border-bgr-line px-2 py-1"
            >
              <option value="">わからない</option>
              <option value="true">日本語ルールあり</option>
              <option value="false">日本語ルールなし</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="admin-edit-awards" className="block font-medium text-bgr-text">
              受賞歴
            </label>
            <input
              id="admin-edit-awards"
              type="text"
              value={awards}
              onChange={(e) => setAwards(e.target.value)}
              className="w-full rounded border border-bgr-line px-2 py-1"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="admin-edit-release-year" className="block font-medium text-bgr-text">
              発売年
            </label>
            <input
              id="admin-edit-release-year"
              type="number"
              value={releaseYear}
              onChange={(e) => setReleaseYear(e.target.value)}
              className="w-32 rounded border border-bgr-line px-2 py-1"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="admin-edit-rules-simple" className="block font-medium text-bgr-text">
              簡単版ルール
            </label>
            <textarea
              id="admin-edit-rules-simple"
              value={rulesSimple}
              onChange={(e) => setRulesSimple(e.target.value)}
              rows={4}
              className="w-full rounded border border-bgr-line px-2 py-1"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="font-medium text-bgr-text">詳しい版ルール(章ごと)</legend>
            {RULE_CHAPTERS.map((chapter) => (
              <div key={chapter.key} className="space-y-1">
                <label htmlFor={`admin-edit-chapter-${chapter.key}`} className="block text-xs text-bgr-subtext">
                  {chapter.heading}
                </label>
                <textarea
                  id={`admin-edit-chapter-${chapter.key}`}
                  value={chapterBodies[chapter.key]}
                  onChange={(e) => setChapterBodies((prev) => ({ ...prev, [chapter.key]: e.target.value }))}
                  rows={3}
                  className="w-full rounded border border-bgr-line px-2 py-1"
                />
              </div>
            ))}
          </fieldset>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={processing}
              onClick={() => void handleSave()}
              className="rounded bg-bgr-accent px-4 py-2 text-white disabled:opacity-50"
            >
              保存する
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={() => setEditing(false)}
              className="rounded border border-bgr-line px-4 py-2 text-bgr-subtext"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
