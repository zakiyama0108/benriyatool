import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callClaudeCode } from '../../../scripts/news-digest/collect-and-select'

// execFile(node:child_process)をモックし、Claude Code CLI(claude -p)の実プロセスを起動せずに
// callClaudeCodeの挙動を検証する。vi.mockのfactoryはhoistされるため、モック関数はvi.hoistedで
// 生成した参照を使う。jsdom環境がnode:child_processのdefault exportも参照するためdefaultも明示的に返す
const { execFileMock } = vi.hoisted(() => ({ execFileMock: vi.fn() }))
vi.mock('node:child_process', () => {
  const mod = { execFile: execFileMock, exec: vi.fn(), spawn: vi.fn(), execSync: vi.fn(), fork: vi.fn() }
  return { ...mod, default: mod }
})

type ExecFileCallback = (error: (Error & { stdout?: string; stderr?: string }) | null, stdout?: string) => void

// stdin.end(prompt)の呼び出しを記録できる最小限の偽ChildProcess
function createFakeChild() {
  return { stdin: { end: vi.fn() } }
}

beforeEach(() => {
  execFileMock.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

// 仕様: specs/news-digest/content-selection/tasks.md Task11(2026-10-20の週次実行でspawn E2BIGにより
// 総合・経済/ビジネスが候補0件になったバグの修正)
describe('Claude Code CLI呼び出し - プロンプトをCLI引数ではなく標準入力(stdin)経由で渡すこと', () => {
  it('プロンプトがexecFileのCLI引数に含まれず、stdin.end()で渡されること(候補数が多いカテゴリでのspawn E2BIG再発防止)', () => {
    const fakeChild = createFakeChild()
    const hugePrompt = 'x'.repeat(5_000_000) // 総合カテゴリ相当の巨大プロンプトを模す
    execFileMock.mockImplementation((..._args: unknown[]) => {
      const callback = _args[_args.length - 1] as ExecFileCallback
      callback(null, JSON.stringify({ result: 'ok' }))
      return fakeChild
    })

    void callClaudeCode(hugePrompt)

    const [, args] = execFileMock.mock.calls[0] as [string, string[]]
    expect(args).not.toContain(hugePrompt)
    expect(fakeChild.stdin.end).toHaveBeenCalledWith(hugePrompt, 'utf8')
  })

  it('CLIプロセスが正常終了しstdoutが有効なJSONのとき、resultを返すこと', async () => {
    execFileMock.mockImplementation((..._args: unknown[]) => {
      const callback = _args[_args.length - 1] as ExecFileCallback
      callback(null, JSON.stringify({ result: 'こんにちは' }))
      return createFakeChild()
    })

    await expect(callClaudeCode('prompt')).resolves.toBe('こんにちは')
  })

  it('CLIプロセスが異常終了した場合、空文字を返すこと', async () => {
    execFileMock.mockImplementation((..._args: unknown[]) => {
      const callback = _args[_args.length - 1] as ExecFileCallback
      callback(new Error('command not found'))
      return createFakeChild()
    })

    await expect(callClaudeCode('prompt')).resolves.toBe('')
  })

  it('CLIプロセスは異常終了したがerror.stdoutが有効なJSONの場合、resultを返すこと', async () => {
    execFileMock.mockImplementation((..._args: unknown[]) => {
      const callback = _args[_args.length - 1] as ExecFileCallback
      const error = new Error('command failed') as Error & { stdout?: string }
      error.stdout = JSON.stringify({ result: '復旧' })
      callback(error)
      return createFakeChild()
    })

    await expect(callClaudeCode('prompt')).resolves.toBe('復旧')
  })

  it('CLIプロセスは正常終了したがstdoutがJSONとしてパースできない場合、空文字を返すこと', async () => {
    execFileMock.mockImplementation((..._args: unknown[]) => {
      const callback = _args[_args.length - 1] as ExecFileCallback
      callback(null, 'not json')
      return createFakeChild()
    })

    await expect(callClaudeCode('prompt')).resolves.toBe('')
  })
})
