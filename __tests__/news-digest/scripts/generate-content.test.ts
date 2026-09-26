import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callClaudeCode } from '../../../scripts/news-digest/generate-content'

// execFile(node:child_process)をモックし、Claude Code CLI(claude -p)の実プロセスを起動せずに
// callClaudeCodeのエラー分類ロジック(execFileAsync失敗 vs stdoutのJSON.parse失敗)を検証する。
// vi.mockのfactoryはhoistされるため、モック関数はvi.hoistedで生成した参照を使う(非hoisted変数の
// 参照はReferenceErrorになる)。jsdom環境がnode:child_processのdefault exportも参照するため
// defaultも明示的に返す
const { execFileMock } = vi.hoisted(() => ({ execFileMock: vi.fn() }))
vi.mock('node:child_process', () => {
  const mod = { execFile: execFileMock, exec: vi.fn(), spawn: vi.fn(), execSync: vi.fn(), fork: vi.fn() }
  return { ...mod, default: mod }
})

type ExecFileCallback = (error: (Error & { stdout?: string; stderr?: string }) | null, result?: { stdout: string }) => void

beforeEach(() => {
  execFileMock.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

// 仕様: specs/news-digest/weekly-publish/design.md#エラーハンドリング、specs/news-digest/weekly-publish/requirements.md#掲載件数の保証-2
describe('Claude Code CLI呼び出し - CLIプロセスの起動失敗とstdoutのJSON.parse失敗を区別すること', () => {
  it('CLIプロセスが正常終了しstdoutが有効なJSONのとき、resultを返すこと', async () => {
    execFileMock.mockImplementation((..._args: unknown[]) => {
      const callback = _args[_args.length - 1] as ExecFileCallback
      callback(null, { stdout: JSON.stringify({ result: 'こんにちは' }) })
    })

    await expect(callClaudeCode('prompt')).resolves.toBe('こんにちは')
  })

  // 実際に観測された誤検知の再現: execFileAsync自体は成功(CLIは正常終了)しているが、stdoutが
  // { result?: string }としてパースできない。JSON.parseのSyntaxErrorメッセージには位置番号が入り、
  // 「position 429」のように利用枠枯渇パターン(429)と偶然一致しうる。このケースはCLIプロセスの
  // 異常終了ではないため、利用枠枯渇(QuotaExhaustedError→exit 2)として扱わず、
  // 単純な失敗(空文字を返す→呼び出し元はexit 1でこの候補を除外)として扱われるべきである
  it('CLIプロセスは正常終了したがstdoutがJSONとしてパースできない場合、利用枠枯渇として扱わず空文字を返すこと', async () => {
    const validJsonPrefix = '[' + Array(214).fill('1').join(',') + ']'
    const stdout = validJsonPrefix + 'garbage'
    // このstdoutをJSON.parseすると「position 429」を含むSyntaxErrorになることを前提として確認する
    expect(() => {
      JSON.parse(stdout)
    }).toThrowError(/position 429/)

    execFileMock.mockImplementation((..._args: unknown[]) => {
      const callback = _args[_args.length - 1] as ExecFileCallback
      callback(null, { stdout })
    })

    await expect(callClaudeCode('prompt')).resolves.toBe('')
  })

  it('execFileAsyncがrate_limit等の利用枠枯渇を示すエラーで失敗した場合、例外が投げられること', async () => {
    execFileMock.mockImplementation((..._args: unknown[]) => {
      const callback = _args[_args.length - 1] as ExecFileCallback
      const error = new Error('command failed') as Error & { stdout?: string; stderr?: string }
      error.stdout = ''
      error.stderr = 'usage limit reached for this account'
      callback(error)
    })

    await expect(callClaudeCode('prompt')).rejects.toThrow(/利用枠の枯渇/)
  })

  it('execFileAsyncが利用枠枯渇を示さない単純なエラーで失敗した場合、空文字を返すこと', async () => {
    execFileMock.mockImplementation((..._args: unknown[]) => {
      const callback = _args[_args.length - 1] as ExecFileCallback
      callback(new Error('command not found'))
    })

    await expect(callClaudeCode('prompt')).resolves.toBe('')
  })
})
