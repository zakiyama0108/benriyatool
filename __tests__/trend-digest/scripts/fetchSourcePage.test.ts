import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchHtml, decodeHtml, BROWSER_USER_AGENT } from '../../../scripts/trend-digest/fetchSourcePage'

afterEach(() => {
  vi.unstubAllGlobals()
})

// 仕様: specs/trend-digest/content-selection/requirements.md#データ取得方法-2
describe('公開ページの文字コード変換 - Content-Type/metaのcharset指定に従ってHTMLをデコードする(UTF-8決め打ちで読まない)', () => {
  it('Content-Typeヘッダーにcharset=shift_jisが指定されている場合、Shift-JISとしてデコードされること', () => {
    const sjisBytes = new Uint8Array([0x82, 0xa0]) // 「あ」のShift-JIS表現
    const html = decodeHtml(sjisBytes.buffer, 'text/html; charset=shift_jis')
    expect(html).toBe('あ')
  })

  it('Content-Typeヘッダーにcharset指定がなく、meta charsetタグがある場合、そこから文字コードを読み取ってデコードすること', () => {
    const sjisChar = new Uint8Array([0x82, 0xa0]) // 「あ」のShift-JIS表現
    const metaTag = new TextEncoder().encode('<meta charset="shift_jis">') // タグ自体はASCII互換
    const bytes = new Uint8Array([...metaTag, ...sjisChar])
    const decoded = decodeHtml(bytes.buffer, null)
    expect(decoded).toBe('<meta charset="shift_jis">あ')
  })

  it('Content-Type・metaのどちらにも文字コード指定がない場合、UTF-8としてデコードされること', () => {
    const utf8Bytes = new TextEncoder().encode('こんにちは')
    const html = decodeHtml(utf8Bytes.buffer, null)
    expect(html).toBe('こんにちは')
  })

  it('未知の文字コード名が指定されていても例外を投げず、UTF-8として読めること', () => {
    const utf8Bytes = new TextEncoder().encode('テスト')
    const html = decodeHtml(utf8Bytes.buffer, 'text/html; charset=unknown-charset-xyz')
    expect(html).toBe('テスト')
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#データ取得方法-2
describe('公開ページの取得 - 一般的なブラウザのUser-Agentを付与する(User-Agent未設定を理由に一律ブロックするサイトへの通常アクセスのため)', () => {
  it('fetchHtmlがUser-Agentヘッダーを付与してfetchを呼び出すこと', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/html; charset=utf-8' },
      arrayBuffer: () => Promise.resolve(new TextEncoder().encode('<html></html>').buffer),
    })
    vi.stubGlobal('fetch', mockFetch)

    await fetchHtml('https://example.com/page')

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/page', {
      headers: { 'User-Agent': BROWSER_USER_AGENT },
    })
  })

  it('取得に失敗した場合(status不正)、例外を投げること', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    vi.stubGlobal('fetch', mockFetch)

    await expect(fetchHtml('https://example.com/broken')).rejects.toThrow()
  })
})
