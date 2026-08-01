// YouTube動画IDの抽出(仕様: content-generation/requirements.md#著作権への配慮-4、
// design.md「YouTube動画IDを抽出する処理」)。抽出できた場合のみarticle-detail側で
// youtube-nocookie.comドメインの公式埋め込みプレーヤーを表示する。抽出できない形式は
// undefinedを返し、通常の出典リンク表示にフォールバックさせる
export function extractYoutubeVideoId(url: string): string | undefined {
  try {
    const parsed = new URL(url)

    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1)
      return id || undefined
    }

    const isYoutubeHost = /(^|\.)youtube\.com$/.test(parsed.hostname)
    if (isYoutubeHost && parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v')
      return id || undefined
    }

    return undefined
  } catch {
    return undefined
  }
}
