import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import YoutubeEmbed from '../../../app/ai-dev-digest/components/YoutubeEmbed'

// 仕様: specs/ai-dev-digest/content-generation/requirements.md#著作権への配慮(根拠)-5
describe('YouTube公式埋め込みプレーヤー - youtube-nocookie.comドメインの公式埋め込みでYouTube動画を表示する', () => {
  it('videoIdから、youtube-nocookie.comドメインのiframeが生成されること', () => {
    const { container } = render(<YoutubeEmbed videoId="dQw4w9WgXcQ" />)
    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })
})
