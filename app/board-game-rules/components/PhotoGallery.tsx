import { getGamePhotoUrl } from '../lib/gamePhotos'

type Props = {
  // ゲーム紹介画像のStorageパス(順序付き。先頭がメイン画像)
  paths: string[]
}

// ゲーム紹介画像のギャラリー表示(仕様: game-detail/design.md「ゲーム紹介画像をギャラリー表示する処理」)。
// 1枚以上あれば登録順に公開URLへ変換して並べ、0枚(空配列)なら領域ごと何も描画しない。
// 1枚目(メイン画像)を大きく、残りをその下に並べる。1枚の読み込み失敗が他や
// ページ全体を止めないよう、個別の<img>読み込みエラーとして扱う(design.md#エラーハンドリング)。
export default function PhotoGallery({ paths }: Props) {
  if (paths.length === 0) return null

  const [main, ...rest] = paths

  return (
    <div className="mb-6">
      {/* eslint-disable-next-line @next/next/no-img-element -- 公開StorageのURLをそのまま表示する(next/image最適化は不要) */}
      <img
        src={getGamePhotoUrl(main)}
        alt="ゲーム紹介画像"
        className="max-h-80 w-full rounded-lg border border-bgr-line object-cover"
        onError={(e) => {
          // 壊れたパスでもページを白紙化しない。当該画像だけ非表示にする
          e.currentTarget.style.display = 'none'
        }}
      />
      {rest.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {rest.map((path, index) => (
            // eslint-disable-next-line @next/next/no-img-element -- 公開StorageのURLをそのまま表示する(next/image最適化は不要)
            <img
              key={`${path}-${index}`}
              src={getGamePhotoUrl(path)}
              alt="ゲーム紹介画像"
              className="h-20 w-20 rounded-lg border border-bgr-line object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
