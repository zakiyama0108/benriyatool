import { describe, it, expect } from 'vitest'
import { buildClaudeArgs } from '../../../scripts/future-digest/generate-content'

// 仕様: specs/future-digest/content-generation/design.md「セキュリティ」
describe('Claude Code CLIの起動引数 - 危険な許可フラグを付けず、利用可能・許可ツールをWebFetchに限定する', () => {
  it('--dangerously-skip-permissionsを含まないこと', () => {
    const args = buildClaudeArgs('プロンプト')
    expect(args).not.toContain('--dangerously-skip-permissions')
  })

  it('--toolsでWebFetchのみ利用可能にすること(Bash・Read・Edit等を呼び出し不能にする)', () => {
    const args = buildClaudeArgs('プロンプト')
    expect(args).toContain('--tools')
    expect(args[args.indexOf('--tools') + 1]).toBe('WebFetch')
  })

  it('--allowedToolsで確認なしに使えるツールもWebFetchのみに限定すること', () => {
    const args = buildClaudeArgs('プロンプト')
    expect(args).toContain('--allowedTools')
    expect(args[args.indexOf('--allowedTools') + 1]).toBe('WebFetch')
  })
})
