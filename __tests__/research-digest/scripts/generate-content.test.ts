import { describe, it, expect } from 'vitest'
import { buildClaudeArgs } from '../../../scripts/research-digest/generate-content'

// 仕様: specs/research-digest/content-generation/design.md「セキュリティ」
describe('要約の生成時のClaude Code CLIの起動条件 - 危険な許可フラグを付けず、使えるツールをWebFetchに限定する', () => {
  it('--dangerously-skip-permissionsを含まないこと', () => {
    expect(buildClaudeArgs('プロンプト')).not.toContain('--dangerously-skip-permissions')
  })

  it('--toolsでWebFetchのみ利用可能にすること(Bash・Read・Edit等を呼び出し不能にする)', () => {
    const args = buildClaudeArgs('プロンプト')
    expect(args[args.indexOf('--tools') + 1]).toBe('WebFetch')
  })

  it('--allowedToolsで確認なしに使えるツールもWebFetchのみに限定すること', () => {
    const args = buildClaudeArgs('プロンプト')
    expect(args[args.indexOf('--allowedTools') + 1]).toBe('WebFetch')
  })
})
