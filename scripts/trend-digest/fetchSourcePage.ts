// 公開ページのHTTP取得(仕様: requirements.md#データ取得方法-2、
// design.md「固定リストジャンルの候補を収集・判定する処理」手順1)。
// 一般的なブラウザのUser-Agentを付与し(Bot判定回避目的の偽装ではなく、User-Agent未設定を理由に
// 一律ブロックするサイトへの通常アクセスのため)、文字コードはページのContent-Type/meta指定に従って
// 変換する(Shift-JIS等のページをUTF-8決め打ちで読まない)。
//
// サイトごとの専用パース(scripts/trend-digest/sourceParsers/)・構造化データの取得
// (scripts/trend-digest/fetchStructuredSource.ts)への振り分けはTask14で追加する

// 一般的なブラウザのUser-Agent(requirements.md#データ取得方法-2)
export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// Content-Typeヘッダーのcharsetパラメータを読み取る(design.md手順1)
function charsetFromContentType(contentType: string | null): string | null {
  if (!contentType) return null
  const match = contentType.match(/charset=["']?([^"';]+)/i)
  return match ? match[1].trim().toLowerCase() : null
}

// <meta charset="..."> または <meta http-equiv="Content-Type" content="...charset=..."> から
// 文字コードを読み取る(Content-Typeヘッダーにcharsetがないページ向け)。メタタグはASCII互換の
// 範囲に収まるため、いったんASCIIとして粗くデコードしても文字コード名自体は読み取れる
function charsetFromMetaTag(bytes: Uint8Array): string | null {
  const head = new TextDecoder('ascii').decode(bytes.slice(0, 2048))
  const metaCharset = head.match(/<meta[^>]+charset=["']?([^"';>\s]+)/i)
  if (metaCharset) return metaCharset[1].trim().toLowerCase()
  const httpEquiv = head.match(/<meta[^>]+content=["'][^"']*charset=([^"';\s]+)/i)
  return httpEquiv ? httpEquiv[1].trim().toLowerCase() : null
}

// Content-Type/metaのcharset指定に従ってHTMLをデコードする(design.md手順1)。
// どちらにも指定がない場合はUTF-8として扱う(現在の大半のサイトの既定)
export function decodeHtml(buffer: ArrayBuffer, contentTypeHeader: string | null): string {
  const bytes = new Uint8Array(buffer)
  const charset = charsetFromContentType(contentTypeHeader) ?? charsetFromMetaTag(bytes) ?? 'utf-8'
  try {
    return new TextDecoder(charset).decode(bytes)
  } catch {
    // 未知の文字コード名が指定されていた場合はUTF-8として読む(文字が壊れるより読める方を優先する)
    return new TextDecoder('utf-8').decode(bytes)
  }
}

// 公開ページを取得し、文字コードを正しく変換したHTML文字列を返す
export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': BROWSER_USER_AGENT } })
  if (!res.ok) throw new Error(`${url} の取得に失敗しました(status: ${res.status})`)
  const buffer = await res.arrayBuffer()
  return decodeHtml(buffer, res.headers.get('content-type'))
}
