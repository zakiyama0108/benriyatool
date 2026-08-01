import { describe, it, expect } from 'vitest'
import { extractYoutubeVideoId } from '../../../app/ai-dev-digest/lib/youtubeUrl'

// 仕様: specs/ai-dev-digest/content-generation/requirements.md#著作権への配慮-4
describe('YouTube動画IDの抽出 - 出典URLから公式埋め込みプレーヤー表示用の動画IDを取り出す', () => {
  it('youtube.com/watch?v=形式のURLから動画IDを抽出できること', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('youtu.be/形式の短縮URLから動画IDを抽出できること', () => {
    expect(extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('watch?v=の前後に他のクエリパラメータが付いていても動画IDを抽出できること', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?list=abc&v=dQw4w9WgXcQ&t=30s')).toBe('dQw4w9WgXcQ')
  })

  it('YouTube以外のURL(対応しない形式)ではundefinedを返すこと', () => {
    expect(extractYoutubeVideoId('https://example.com/blog/post-1')).toBeUndefined()
  })

  it('YouTubeのチャンネルURL等、動画IDを含まない形式ではundefinedを返すこと', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/@somechannel')).toBeUndefined()
  })
})
