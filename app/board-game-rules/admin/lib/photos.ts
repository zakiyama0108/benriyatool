import { supabase } from '../../../lib/supabaseClient'

const PHOTOS_BUCKET = 'board-game-rules-photos'
// 照合閲覧の間だけ表示できればよいため短めの有効期限にする
const SIGNED_URL_EXPIRES_IN_SECONDS = 300

export type PhotoFetchResult = { path: string; url: string | null }

// 登録依頼のphoto_pathsから、非公開Storageの元写真を運営者本人として取得する
// (仕様: admin/requirements.md#登録依頼の確認-8、admin/design.md「登録依頼を確認する処理」)。
// 取得はStorageのアクセスポリシーで運営者本人のみに絞られる。一部の写真取得に失敗しても
// 他の写真は表示できるよう、失敗した写真だけurl: nullにして返す(全体を失敗させない)。
export async function fetchOriginalPhotos(photoPaths: string[]): Promise<PhotoFetchResult[]> {
  return Promise.all(
    photoPaths.map(async (path) => {
      const { data, error } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_EXPIRES_IN_SECONDS)
      if (error || !data) {
        // eslint-disable-next-line no-console -- 原因究明用(design.md#ログ)。写真の中身は出さない
        console.error('元写真の取得に失敗しました', path, error)
        return { path, url: null }
      }
      return { path, url: data.signedUrl }
    })
  )
}
