import { supabase } from '../../lib/supabaseClient'
import type { Genre } from './genres'

const PHOTOS_BUCKET = 'board-game-rules-photos'

export type GameRequestInput = {
  photos: File[]
  name?: string
  minPlayers?: number
  maxPlayers?: number
  minMinutes?: number
  maxMinutes?: number
  genres?: Genre[]
  minAge?: number
  difficulty?: string
  publisher?: string
  author?: string
  hasJapaneseRules?: boolean
  awards?: string
  releaseYear?: number
}

function extensionOf(file: File): string {
  const dot = file.name.lastIndexOf('.')
  return dot >= 0 ? file.name.slice(dot + 1) : 'jpg'
}

// 写真を非公開Storage(board-game-rules-photos)へ保存し、依頼(board_game_rules_game_requests)をINSERTする
// (仕様: game-registration/design.md「依頼を送信する処理」)。写真0枚・下限>上限は画面側で送信不可にする
// 想定だが、直接呼び出しに対する防御としてここでも同じ検証を行う。
export async function createGameRequest(input: GameRequestInput): Promise<boolean> {
  if (input.photos.length === 0) {
    // eslint-disable-next-line no-console -- 原因究明用(design.md#ログ)。画面には定型表示のみ
    console.error('登録依頼の送信に失敗しました: 写真が0枚です')
    return false
  }
  if (
    input.minPlayers != null &&
    input.maxPlayers != null &&
    input.minPlayers > input.maxPlayers
  ) {
    // eslint-disable-next-line no-console -- 原因究明用(design.md#ログ)
    console.error('登録依頼の送信に失敗しました: 対応人数の下限が上限を超えています')
    return false
  }
  if (
    input.minMinutes != null &&
    input.maxMinutes != null &&
    input.minMinutes > input.maxMinutes
  ) {
    // eslint-disable-next-line no-console -- 原因究明用(design.md#ログ)
    console.error('登録依頼の送信に失敗しました: プレイ時間の下限が上限を超えています')
    return false
  }

  try {
    const requestId = crypto.randomUUID()
    const photoPaths: string[] = []
    for (const [index, photo] of input.photos.entries()) {
      const path = `${requestId}/${index}.${extensionOf(photo)}`
      const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, photo)
      if (error || !data) {
        // eslint-disable-next-line no-console -- 原因究明用(design.md#ログ)
        console.error('登録依頼の送信に失敗しました: 写真の保存でエラーが発生しました', error)
        return false
      }
      photoPaths.push(data.path)
    }

    const { error } = await supabase.from('board_game_rules_game_requests').insert({
      photo_paths: photoPaths,
      name: input.name ?? null,
      min_players: input.minPlayers ?? null,
      max_players: input.maxPlayers ?? null,
      min_minutes: input.minMinutes ?? null,
      max_minutes: input.maxMinutes ?? null,
      genres: input.genres ?? [],
      min_age: input.minAge ?? null,
      difficulty: input.difficulty ?? null,
      publisher: input.publisher ?? null,
      author: input.author ?? null,
      has_japanese_rules: input.hasJapaneseRules ?? null,
      awards: input.awards ?? null,
      release_year: input.releaseYear ?? null,
    })
    if (error) {
      // eslint-disable-next-line no-console -- 原因究明用(design.md#ログ)
      console.error('登録依頼の送信に失敗しました: DB保存でエラーが発生しました', error)
      return false
    }
    return true
  } catch (e) {
    // eslint-disable-next-line no-console -- 原因究明用(design.md#ログ)
    console.error('登録依頼の送信に失敗しました', e)
    return false
  }
}
