import { supabase } from '../../lib/supabaseClient'

// ゲーム紹介画像の公開Storageバケット(仕様: admin/design.md「ゲーム紹介画像の公開Storage」)。
// lib/gamePhotos.tsの公開URL変換・game-registration/lib/gameRequests.tsの依頼保存先と同じバケット。
const INTRO_PHOTOS_BUCKET = 'board-game-rules-game-photos'
// 登録依頼画面(GamePhotoUploader)と同じ量的制約(仕様: game-registration/design.md「バリデーション」)
const MAX_INTRO_PHOTO_COUNT = 20

function extensionOf(file: File): string {
  const dot = file.name.lastIndexOf('.')
  return dot >= 0 ? file.name.slice(dot + 1) : 'jpg'
}

// 変更後のintro_photo_pathsをUPDATEで保存する(追加・削除・並び替えのいずれも最終的にこれを呼ぶ。
// 仕様: game-detail/design.md「ゲーム紹介画像を差し替え・削除する処理(管理者)」手順5)。
// 運営者本人のみ実行できる(既存のゲーム編集RLSで担保)。
async function saveIntroPhotoPaths(gameId: string, paths: string[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('board_game_rules_games')
      .update({ intro_photo_paths: paths })
      .eq('id', gameId)
    return !error
  } catch {
    return false
  }
}

// 新しい画像を公開Storageへ当該ゲームのID配下にアップロードし、既存パスの末尾に追加する
// (仕様: game-detail/design.md「ゲーム紹介画像を差し替え・削除する処理(管理者)」手順2)。既存分と合わせて
// 上限20枚までとし、上限に達した状態からの追加選択・上限を超える追加分は切り捨てる
// (登録依頼画面のGamePhotoUploaderと同じ挙動)。
export async function addIntroPhotos(gameId: string, existingPaths: string[], files: File[]): Promise<boolean> {
  const capacity = Math.max(MAX_INTRO_PHOTO_COUNT - existingPaths.length, 0)
  if (capacity === 0) return false
  const accepted = files.slice(0, capacity)

  try {
    const newPaths: string[] = []
    for (const [offset, photo] of accepted.entries()) {
      const path = `${gameId}/${existingPaths.length + offset}.${extensionOf(photo)}`
      const { data, error } = await supabase.storage.from(INTRO_PHOTOS_BUCKET).upload(path, photo)
      if (error || !data) {
        // eslint-disable-next-line no-console -- 原因究明用(design.md#ログ)
        console.error('ゲーム紹介画像の追加に失敗しました: 画像の保存でエラーが発生しました', error)
        return false
      }
      newPaths.push(data.path)
    }
    return await saveIntroPhotoPaths(gameId, [...existingPaths, ...newPaths])
  } catch {
    return false
  }
}

// 指定パスを配列から取り除いてUPDATEする(仕様: game-detail/design.md「ゲーム紹介画像を差し替え・削除する処理(管理者)」手順3)。
// Storage上のオブジェクト自体は削除しない(公開URLを知らない限り閲覧経路がなく実害が小さいため。
// 依頼側バックアップと共有する元写真と同じ方針)。
export async function removeIntroPhoto(gameId: string, existingPaths: string[], path: string): Promise<boolean> {
  return saveIntroPhotoPaths(
    gameId,
    existingPaths.filter((p) => p !== path)
  )
}

// 指定パスを先頭へ移動する=メイン画像に変更する(仕様: game-detail/design.md「ゲーム紹介画像を差し替え・削除する処理(管理者)」手順4。
// 登録依頼画面と同じ「メイン画像にする」操作)。他のパスは選択順を保ったまま1つずつ後ろへずれる。
export async function setMainIntroPhoto(gameId: string, existingPaths: string[], path: string): Promise<boolean> {
  const rest = existingPaths.filter((p) => p !== path)
  return saveIntroPhotoPaths(gameId, [path, ...rest])
}
