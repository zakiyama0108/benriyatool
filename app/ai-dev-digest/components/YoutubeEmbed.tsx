type Props = {
  videoId: string
}

// YouTube公式の埋め込みプレーヤーを表示する(仕様: design.md「その日の記事本文を表示する処理」
// 手順5、content-generation/requirements.md#著作権への配慮(根拠)-5)。
// youtube-nocookie.comドメインを使うことで、YouTube自身が許諾している利用方法の範囲にとどめる
export default function YoutubeEmbed({ videoId }: Props) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title="YouTube動画"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  )
}
