import { supabase } from '../../lib/supabaseClient'

// 元写真の非公開Storageバケット(仕様: admin/design.md「元写真の非公開Storage」)。
const PHOTOS_BUCKET = 'board-game-rules-photos'
// 照合閲覧の間だけ表示できればよいため短めの有効期限にする
const SIGNED_URL_EXPIRES_IN_SECONDS = 300

export type PhotoFetchResult = { path: string; url: string | null }

// 表示中ゲームの投稿時の元写真を、運営者本人として照合用に取得する
// (仕様: game-detail/design.md「元写真を照合閲覧する処理(管理者)」)。一般取得(fetchGameById)は
// photo_pathsを含めないため、照合用に運営者として games からphoto_pathsを取得(全列SELECTは
// admin RLSで許可)し、非公開バケットの署名URLへ変換する。取得はStorageのアクセスポリシーで
// 運営者本人のみに絞られる。一部の写真取得に失敗しても他は表示できるよう、失敗した写真だけ
// url:nullにして返す(全体を失敗させない)。paths取得自体に失敗したら空配列を返す。
export async function fetchOriginalPhotos(gameId: string): Promise<PhotoFetchResult[]> {
  const { data, error } = await supabase
    .from('board_game_rules_games')
    .select('photo_paths')
    .eq('id', gameId)
    .maybeSingle()
  if (error || !data) {
    // eslint-disable-next-line no-console -- 原因究明用(design.md#ログ)。写真の中身は出さない
    console.error('元写真パスの取得に失敗しました', { gameId })
    return []
  }
  const paths = Array.isArray((data as { photo_paths?: unknown }).photo_paths)
    ? ((data as { photo_paths: string[] }).photo_paths)
    : []

  return Promise.all(
    paths.map(async (path) => {
      const { data: signed, error: signError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_EXPIRES_IN_SECONDS)
      if (signError || !signed) {
        // eslint-disable-next-line no-console -- 原因究明用(design.md#ログ)。写真の中身は出さない
        console.error('元写真の取得に失敗しました', path)
        return { path, url: null }
      }
      return { path, url: signed.signedUrl }
    })
  )
}
