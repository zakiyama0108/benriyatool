import { describe, it, expect, vi } from 'vitest'
import { waitForPageAvailable } from '../../app/lib/waitForPageAvailable'

// テスト用のResponseもどきを作る(実際のfetchを呼ばずステータスだけを再現する)
function buildResponse(status: number): Response {
  return new Response(null, { status })
}

// 仕様: specs/ai-dev-digest/line-broadcast/requirements.md#配信タイミング・方式-8、specs/ai-dev-digest/line-broadcast/requirements.md#配信タイミング・方式-9、specs/ai-dev-digest/line-broadcast/design.md#記事ページの公開を待つ処理、specs/news-digest/line-broadcast/requirements.md#配信タイミング・方式-8、specs/news-digest/line-broadcast/requirements.md#配信タイミング・方式-9、specs/news-digest/line-broadcast/design.md#記事ページの公開を待つ処理、specs/trend-digest/line-broadcast/requirements.md#配信タイミング・方式-8、specs/trend-digest/line-broadcast/requirements.md#配信タイミング・方式-9、specs/trend-digest/line-broadcast/design.md#記事ページの公開を待つ処理
describe('記事ページの公開待ち - 記事詳細ページへのHTTP GETが200を返すまでポーリングし、デプロイ未完了時のリンク配信を防ぐ', () => {
  it('最初のGETで200が返ってきた場合、1回のfetchで待機を終え、公開済みと判定すること', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse(200))
    const sleep = vi.fn().mockResolvedValue(undefined)

    const result = await waitForPageAvailable('https://benriyatool.com/ai-dev-digest/2026-09-23', {
      fetch: fetchMock,
      sleep,
    })

    expect(result.available).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('デプロイ未完了による404が続いたあと200になった場合、公開済みと判定して待機を終えること', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(buildResponse(404))
      .mockResolvedValueOnce(buildResponse(404))
      .mockResolvedValueOnce(buildResponse(200))
    const sleep = vi.fn().mockResolvedValue(undefined)

    const result = await waitForPageAvailable('https://benriyatool.com/ai-dev-digest/2026-09-23', {
      fetch: fetchMock,
      sleep,
      pollIntervalMs: 1000,
      timeoutMs: 60000,
    })

    expect(result.available).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(1000)
  })

  it('3xxリダイレクト(例: trailingSlash: trueによる308)を追った先が最終的に200の場合も、公開済みと判定すること(fetch既定のredirect: \'follow\'のまま、manualにしないことの確認)', async () => {
    // fetchはデフォルトのredirect: 'follow'では308等を自動で追い、最終レスポンス(200)のみを返す。
    // ここではその「自動で追った結果」を、redirectedフラグ付きの200レスポンスとして再現する
    const redirectedResponse = buildResponse(200)
    Object.defineProperty(redirectedResponse, 'redirected', { value: true })
    const fetchMock = vi.fn().mockResolvedValue(redirectedResponse)
    const sleep = vi.fn().mockResolvedValue(undefined)

    const result = await waitForPageAvailable('https://benriyatool.com/ai-dev-digest/2026-09-23', {
      fetch: fetchMock,
      sleep,
    })

    expect(result.available).toBe(true)
    // redirect: 'manual'を指定していないこと(指定するとリダイレクト先の200を観測できなくなるため)
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.redirect).not.toBe('manual')
  })

  it('timeoutMsを超えても200が返らない場合、公開待ちを打ち切り失敗を返すこと(LINE配信を行わせないため)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse(404))
    const sleep = vi.fn().mockResolvedValue(undefined)

    const result = await waitForPageAvailable('https://benriyatool.com/ai-dev-digest/2026-09-23', {
      fetch: fetchMock,
      sleep,
      pollIntervalMs: 1000,
      timeoutMs: 2000,
    })

    expect(result.available).toBe(false)
  })

  it('fetchが例外(ネットワークエラー)を投げても、その場で打ち切らず次のポーリングへ進むこと', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(buildResponse(200))
    const sleep = vi.fn().mockResolvedValue(undefined)

    const result = await waitForPageAvailable('https://benriyatool.com/ai-dev-digest/2026-09-23', {
      fetch: fetchMock,
      sleep,
      pollIntervalMs: 1000,
      timeoutMs: 60000,
    })

    expect(result.available).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('時間切れ時の戻り値に、最後に観測したHTTPステータスと経過時間(ミリ秒)が含まれること', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse(404))
    const sleep = vi.fn().mockResolvedValue(undefined)

    const result = await waitForPageAvailable('https://benriyatool.com/ai-dev-digest/2026-09-23', {
      fetch: fetchMock,
      sleep,
      pollIntervalMs: 1000,
      timeoutMs: 2000,
    })

    expect(result.available).toBe(false)
    if (result.available) throw new Error('unreachable')
    expect(result.lastStatus).toBe(404)
    expect(result.elapsedMs).toBeGreaterThanOrEqual(2000)
  })

  it('時間切れ時、最後の試行がネットワークエラーだった場合は戻り値のステータスが「ネットワークエラーだった旨」になること', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network error'))
    const sleep = vi.fn().mockResolvedValue(undefined)

    const result = await waitForPageAvailable('https://benriyatool.com/ai-dev-digest/2026-09-23', {
      fetch: fetchMock,
      sleep,
      pollIntervalMs: 1000,
      timeoutMs: 2000,
    })

    expect(result.available).toBe(false)
    if (result.available) throw new Error('unreachable')
    expect(result.lastStatus).toBe('network-error')
  })

  it('onAttemptコールバックを渡すと、試行ごとに経過秒数とHTTPステータスを引数に呼ばれること', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(buildResponse(404))
      .mockResolvedValueOnce(buildResponse(200))
    const sleep = vi.fn().mockResolvedValue(undefined)
    const onAttempt = vi.fn()

    await waitForPageAvailable('https://benriyatool.com/ai-dev-digest/2026-09-23', {
      fetch: fetchMock,
      sleep,
      pollIntervalMs: 1000,
      timeoutMs: 60000,
      onAttempt,
    })

    expect(onAttempt).toHaveBeenCalledTimes(2)
    expect(onAttempt).toHaveBeenNthCalledWith(1, { elapsedSeconds: 0, status: 404 })
    expect(onAttempt).toHaveBeenNthCalledWith(2, { elapsedSeconds: 1, status: 200 })
  })

  it('onAttemptコールバックを渡さなくても、公開待ちが正常に動作すること', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse(200))
    const sleep = vi.fn().mockResolvedValue(undefined)

    const result = await waitForPageAvailable('https://benriyatool.com/ai-dev-digest/2026-09-23', {
      fetch: fetchMock,
      sleep,
    })

    expect(result.available).toBe(true)
  })

  it('公開確認のGETにCache-Control: no-cacheヘッダーを付けること(cache: \'no-store\'だけではNodeのfetchにCDN/HTTPキャッシュ回避効果がないため)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse(200))
    const sleep = vi.fn().mockResolvedValue(undefined)

    await waitForPageAvailable('https://benriyatool.com/ai-dev-digest/2026-09-23', {
      fetch: fetchMock,
      sleep,
    })

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.cache).toBe('no-store')
    expect((init.headers as Record<string, string>)['Cache-Control']).toBe('no-cache')
  })

  it('fetch自体の所要時間も合計の経過時間に算入されること(pollIntervalMsの累計だけでは実時間より過小評価になるため)', async () => {
    vi.useFakeTimers()
    try {
      // 1回のfetchが6秒かかる状況を模す。fakeTimersの時計をfetchモック内で直接進めることで、
      // 実際に6秒待たずに「fetchが実時間を消費する」状況を決定的に再現する
      const fetchMock = vi.fn().mockImplementation(() => {
        vi.advanceTimersByTime(6000)
        return Promise.resolve(buildResponse(404))
      })
      const sleep = vi.fn().mockResolvedValue(undefined)

      const result = await waitForPageAvailable('https://benriyatool.com/ai-dev-digest/2026-09-23', {
        fetch: fetchMock,
        sleep,
        pollIntervalMs: 1000,
        timeoutMs: 10000,
      })

      expect(result.available).toBe(false)
      // pollIntervalMs(1000ms)の累計だけなら10回超の試行が必要だが、fetchの所要時間(6秒/回)が
      // 算入されるため2回の試行で合計経過時間が10秒を超えて打ち切られること
      expect(fetchMock).toHaveBeenCalledTimes(2)
      if (result.available) throw new Error('unreachable')
      expect(result.elapsedMs).toBeGreaterThanOrEqual(10000)
    } finally {
      vi.useRealTimers()
    }
  })

  it('GETがrequestTimeoutMsを超えて応答しない場合、タイムアウトしてネットワークエラー扱いになること(応答しない相手への張り付きを防ぐ)', async () => {
    // fetchのinitに渡されたAbortSignalが実際にabortされたらrejectする、fetch本来のタイムアウト
    // 挙動を模したモック。requestTimeoutMsを小さい値にすることで実時間をほぼ使わずに検証する
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init.signal as AbortSignal
        signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')))
      })
    })
    const sleep = vi.fn().mockResolvedValue(undefined)

    const result = await waitForPageAvailable('https://benriyatool.com/ai-dev-digest/2026-09-23', {
      fetch: fetchMock,
      sleep,
      pollIntervalMs: 1000,
      timeoutMs: 2000,
      requestTimeoutMs: 10,
    })

    expect(result.available).toBe(false)
    if (result.available) throw new Error('unreachable')
    expect(result.lastStatus).toBe('network-error')
  })
})
