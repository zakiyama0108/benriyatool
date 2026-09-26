import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import {
  buildAuthorizeUrl,
  prepareAuthorization,
  readCallback,
  exchangeCodeForTokens,
  saveTokens,
  loadTokens,
  clearTokens,
  getFreshAccessToken,
  initializeSession,
  SPOTIFY_SCOPE,
  type StoredTokens,
} from '@/app/spotify-playlist/lib/spotifyAuth'

const VERIFIER_KEY = 'spotify-playlist:pkce-verifier'
const STATE_KEY = 'spotify-playlist:pkce-state'
const TOKENS_KEY = 'spotify-playlist:tokens'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// 有効期限が十分に先のトークン一式
function freshTokens(overrides: Partial<StoredTokens> = {}): StoredTokens {
  return { accessToken: 'access-1', refreshToken: 'refresh-1', expiresAt: Date.now() + 3600_000, ...overrides }
}

let fetchMock: MockInstance<typeof fetch>
let errorSpy: MockInstance<typeof console.error>

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  window.history.replaceState({}, '', '/spotify-playlist/')
  fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'log').mockImplementation(() => {})
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  clearTokens()
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-1、specs/spotify-playlist/playlist-create/requirements.md#プレイリストの公開範囲-1
describe('Spotifyログインの認可URL - 非公開プレイリスト作成の権限だけを要求して認可画面へ送る', () => {
  it('client_id・redirect_uri・S256のcode_challenge・state・scopeを含む認可URLになること', () => {
    const url = new URL(
      buildAuthorizeUrl({ redirectUri: 'https://benriyatool.com/spotify-playlist/', codeChallenge: 'CH', state: 'ST' })
    )
    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('redirect_uri')).toBe('https://benriyatool.com/spotify-playlist/')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBe('CH')
    expect(url.searchParams.get('state')).toBe('ST')
    expect(url.searchParams.get('scope')).toBe('playlist-modify-private')
  })

  it('要求スコープは非公開プレイリスト作成の1つだけで、ライブラリ閲覧やアカウント変更の権限を含まないこと', () => {
    expect(SPOTIFY_SCOPE).toBe('playlist-modify-private')
    expect(SPOTIFY_SCOPE.split(' ')).toHaveLength(1)
  })

  it('NEXT_PUBLIC_SPOTIFY_CLIENT_IDが未設定のまま開発環境で認可URLを組み立てると、設定忘れに気づけるようコンソール警告を出すこと', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    buildAuthorizeUrl({ redirectUri: 'https://benriyatool.com/spotify-playlist/', codeChallenge: 'CH', state: 'ST' })
    expect(warnSpy).toHaveBeenCalled()
  })

  it('本番相当の環境ではNEXT_PUBLIC_SPOTIFY_CLIENT_IDが未設定でも警告を出さないこと', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    buildAuthorizeUrl({ redirectUri: 'https://benriyatool.com/spotify-playlist/', codeChallenge: 'CH', state: 'ST' })
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('認可を開始すると、往復用のcode_verifierとstateがsessionStorageに一時保存されること', async () => {
    const url = await prepareAuthorization()
    const verifier = sessionStorage.getItem(VERIFIER_KEY)
    const state = sessionStorage.getItem(STATE_KEY)
    expect(verifier).toBeTruthy()
    expect(state).toBeTruthy()
    // 保存したstateが認可URLにも載っている
    expect(new URL(url).searchParams.get('state')).toBe(state)
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-1
describe('認可コード帰還時のstate検証 - 不正なリダイレクトとキャンセルを見分けて一時情報を後始末する', () => {
  it('利用者が認可を拒否した(errorパラメータ付き)場合、中断結果を返しcode_verifier・stateを削除すること', () => {
    sessionStorage.setItem(VERIFIER_KEY, 'v')
    sessionStorage.setItem(STATE_KEY, 's')
    const result = readCallback(new URLSearchParams('error=access_denied&state=s'))
    expect(result).toEqual({ kind: 'denied' })
    expect(sessionStorage.getItem(VERIFIER_KEY)).toBeNull()
    expect(sessionStorage.getItem(STATE_KEY)).toBeNull()
    // 利用者の拒否は通常のキャンセル扱いのため、ログには残さない
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('access_denied以外の認可エラー値が返った場合も中断結果(denied)にするが、値をconsole.errorに記録すること', () => {
    sessionStorage.setItem(VERIFIER_KEY, 'v')
    sessionStorage.setItem(STATE_KEY, 's')
    const result = readCallback(new URLSearchParams('error=server_error&state=s'))
    expect(result).toEqual({ kind: 'denied' })
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[spotify-playlist]'), 'server_error')
  })

  it('戻ってきたstateが保存済みのものと一致しない場合、不正リダイレクト扱いにしてcode_verifier・stateを削除すること', () => {
    sessionStorage.setItem(VERIFIER_KEY, 'v')
    sessionStorage.setItem(STATE_KEY, 'saved-state')
    const result = readCallback(new URLSearchParams('code=abc&state=attacker-state'))
    expect(result).toEqual({ kind: 'invalid_state' })
    expect(sessionStorage.getItem(VERIFIER_KEY)).toBeNull()
  })

  it('stateが一致する場合は認可コードを取り出せること', () => {
    sessionStorage.setItem(STATE_KEY, 'ok-state')
    const result = readCallback(new URLSearchParams('code=the-code&state=ok-state'))
    expect(result).toEqual({ kind: 'code', code: 'the-code' })
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-1
describe('認可コードからのトークン交換 - 成否にかかわらず一時情報を残さない', () => {
  it('認可コードとcode_verifierでアクセストークン・リフレッシュトークン・有効期限を得られること', async () => {
    sessionStorage.setItem(VERIFIER_KEY, 'the-verifier')
    fetchMock.mockResolvedValue(
      jsonResponse({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600 })
    )
    const before = Date.now()
    const tokens = await exchangeCodeForTokens('the-code', 'https://benriyatool.com/spotify-playlist/')

    expect(tokens.accessToken).toBe('AT')
    expect(tokens.refreshToken).toBe('RT')
    expect(tokens.expiresAt).toBeGreaterThanOrEqual(before + 3600_000)
    // 交換に使ったcode_verifierは消えている
    expect(sessionStorage.getItem(VERIFIER_KEY)).toBeNull()
    // クライアントシークレットは送らず、code_verifierを送っている(bodyは常にフォームエンコード済み文字列)
    const sentBody = (fetchMock.mock.calls[0][1]?.body as string) ?? ''
    expect(sentBody).toContain('code_verifier=the-verifier')
    expect(sentBody).not.toContain('client_secret')
  })

  it('トークン発行が通信エラーで失敗した場合もcode_verifier・stateを削除すること', async () => {
    sessionStorage.setItem(VERIFIER_KEY, 'the-verifier')
    sessionStorage.setItem(STATE_KEY, 's')
    fetchMock.mockRejectedValue(new TypeError('network down'))

    await expect(exchangeCodeForTokens('c', 'https://benriyatool.com/spotify-playlist/')).rejects.toThrow()
    expect(sessionStorage.getItem(VERIFIER_KEY)).toBeNull()
    expect(sessionStorage.getItem(STATE_KEY)).toBeNull()
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-1、specs/spotify-playlist/playlist-create/requirements.md#機能要件-10
describe('トークンの保存・復元・破棄 - 次回訪問時の自動ログインとログアウトの土台', () => {
  it('取得したトークン一式をlocalStorageに保存し、読み戻せること', () => {
    const tokens = freshTokens()
    saveTokens(tokens)
    expect(loadTokens()).toEqual(tokens)
  })

  it('保存が無い・壊れている場合はnullを返すこと', () => {
    expect(loadTokens()).toBeNull()
    localStorage.setItem(TOKENS_KEY, '{壊れたJSON')
    expect(loadTokens()).toBeNull()
  })

  it('ログアウトするとlocalStorageのトークンが消えること', () => {
    saveTokens(freshTokens())
    clearTokens()
    expect(loadTokens()).toBeNull()
    expect(localStorage.getItem(TOKENS_KEY)).toBeNull()
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-1
describe('アクセストークンの自動リフレッシュ - API呼び出し直前に期限を見て必要な時だけ再発行する', () => {
  it('有効期限に余裕がある場合はリフレッシュせず保存済みのアクセストークンをそのまま返すこと', async () => {
    saveTokens(freshTokens({ accessToken: 'still-valid', expiresAt: Date.now() + 600_000 }))
    const token = await getFreshAccessToken()
    expect(token).toBe('still-valid')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('残り60秒未満の場合はリフレッシュトークンで再発行し、新しいトークンを保存して返すこと', async () => {
    saveTokens(freshTokens({ accessToken: 'about-to-expire', refreshToken: 'RT', expiresAt: Date.now() + 30_000 }))
    fetchMock.mockResolvedValue(jsonResponse({ access_token: 'new-AT', expires_in: 3600 }))

    const token = await getFreshAccessToken()
    expect(token).toBe('new-AT')
    // refresh応答にrefresh_tokenが無くても既存値を引き継いで保存する
    expect(loadTokens()).toMatchObject({ accessToken: 'new-AT', refreshToken: 'RT' })
  })

  it('リフレッシュに失敗した場合は保存トークンを破棄しエラーを投げること(再ログインを促す)', async () => {
    saveTokens(freshTokens({ expiresAt: Date.now() + 10_000 }))
    fetchMock.mockResolvedValue(jsonResponse({ error: 'invalid_grant' }, 400))

    await expect(getFreshAccessToken()).rejects.toThrow()
    expect(loadTokens()).toBeNull()
  })

  it('同時に複数回呼ばれても、Spotifyへのリフレッシュリクエストは1回だけ発行され全ての呼び出しが結果を受け取ること', async () => {
    saveTokens(freshTokens({ expiresAt: Date.now() + 10_000 }))
    fetchMock.mockResolvedValue(jsonResponse({ access_token: 'shared-AT', expires_in: 3600 }))

    const results = await Promise.all([getFreshAccessToken(), getFreshAccessToken(), getFreshAccessToken()])
    expect(results).toEqual(['shared-AT', 'shared-AT', 'shared-AT'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-1
describe('ログイン状態の初期化 - 認可コード帰還・保存トークン・未ログインの3分岐を判定する', () => {
  it('URLに認可コードが付いている場合、トークン交換と自ユーザー情報取得を経てログイン中になり、表示名・画像・IDを保持すること', async () => {
    sessionStorage.setItem(VERIFIER_KEY, 'v')
    sessionStorage.setItem(STATE_KEY, 'st')
    window.history.replaceState({}, '', '/spotify-playlist/?code=abc&state=st')
    fetchMock.mockImplementation((input) => {
      const target = input as string
      if (target.includes('/api/token')) {
        return Promise.resolve(jsonResponse({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600 }))
      }
      return Promise.resolve(
        jsonResponse({ id: 'user-1', display_name: 'さくら', images: [{ url: 'https://img/p.jpg' }] })
      )
    })

    const state = await initializeSession()
    expect(state).toEqual({
      status: 'loggedIn',
      user: { id: 'user-1', displayName: 'さくら', imageUrl: 'https://img/p.jpg' },
    })
    // 認可コード・stateがURLから除去されている
    expect(window.location.search).toBe('')
    expect(loadTokens()).toMatchObject({ accessToken: 'AT', refreshToken: 'RT' })
  })

  it('URLに認可コードが無く保存済みリフレッシュトークンがある場合、自ユーザー情報を取り直してログイン中になること', async () => {
    saveTokens(freshTokens())
    fetchMock.mockResolvedValue(jsonResponse({ id: 'user-9', display_name: null, images: [] }))

    const state = await initializeSession()
    expect(state).toMatchObject({ status: 'loggedIn', user: { id: 'user-9', imageUrl: null } })
  })

  it('認可コードも保存トークンも無い場合は未ログインになること', async () => {
    const state = await initializeSession()
    expect(state).toEqual({ status: 'loggedOut' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('トークン交換は成功したが自ユーザー情報の取得に失敗した場合、トークンを保存せず未ログイン扱いにし、URLの認可コードも除去すること', async () => {
    sessionStorage.setItem(VERIFIER_KEY, 'v')
    sessionStorage.setItem(STATE_KEY, 'st')
    window.history.replaceState({}, '', '/spotify-playlist/?code=abc&state=st')
    fetchMock.mockImplementation((input) => {
      const target = input as string
      if (target.includes('/api/token')) {
        return Promise.resolve(jsonResponse({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600 }))
      }
      return Promise.resolve(jsonResponse({ error: { status: 500 } }, 500))
    })

    const state = await initializeSession()
    expect(state).toEqual({ status: 'loggedOut' })
    expect(loadTokens()).toBeNull()
    expect(window.location.search).toBe('')
  })
})
