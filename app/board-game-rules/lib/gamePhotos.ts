import { supabase } from '../../lib/supabaseClient'

// ゲーム紹介画像を保存する公開Storageバケット(仕様: game-registration/design.md「ゲーム紹介画像のStorage」、
// admin/design.md「ゲーム紹介画像の公開Storage」)。元写真の非公開バケットとは別。
const GAME_PHOTOS_BUCKET = 'board-game-rules-game-photos'

// ゲーム紹介画像(intro_photo_paths)のStorageパスを公開URLへ変換する
// (仕様: game-list/design.md「メイン画像を表示する処理」)。公開バケットのため署名URLの発行は不要で、
// getPublicUrlが返すURLがそのまま配信される。game-list・game-detail・adminの各specが共有する。
export function getGamePhotoUrl(path: string): string {
  const { data } = supabase.storage.from(GAME_PHOTOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
