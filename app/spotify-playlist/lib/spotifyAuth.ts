// Spotifyの認可(Authorization Code with PKCE)とトークン管理をブラウザ内で完結させるモジュール。
// サーバーを持たない静的配信の制約下でクライアントシークレットを使わずに認可する
// (design.md#セキュリティ、architecture.md#3-設計方針)。
import { generateCodeVerifier, generateState, deriveCodeChallenge } from './pkce'

const AUTHORIZE_ENDPOINT = 'https://accounts.spotify.com/authorize'
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'

// 要求スコープは「非公開プレイリストの作成」の1つだけに絞る(design.md#セキュリティ、
// requirements.md#プレイリストの公開範囲)。
export const SPOTIFY_SCOPE = 'playlist-modify-private'

// Client IDは公開情報のためビルドに埋め込む(design.md#セキュリティ)。
// 未設定時の気づきやすさのため、実際に認可URLを組み立てる際(buildAuthorizeUrl)に開発環境限定で警告する。
export const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? ''

// リフレッシュトークンの保存先。次回訪問時の自動ログインに使うため永続化する(design.md#セキュリティ)。
const TOKENS_STORAGE_KEY = 'spotify-playlist:tokens'
// 認可の往復でしか使わない一時値。タブを閉じれば消えてよいためsessionStorageに置く(design.md#spotifyでログインする処理 手順2)。
const PKCE_VERIFIER_KEY = 'spotify-playlist:pkce-verifier'
const PKCE_STATE_KEY = 'spotify-playlist:pkce-state'

// アクセストークンは有効期限の残りがこの秒数未満になったら事前にリフレッシュする。
// 取得〜利用開始までの遅延やAPI呼び出し中の失効を避けるための余裕(design.md#アクセストークンを自動更新する処理)。
const REFRESH_MARGIN_MS = 60_000

export type StoredTokens = {
  accessToken: string
  refreshToken: string
  // アクセストークンの有効期限(エポックミリ秒)
  expiresAt: number
}

// 画面表示のためだけにメモリ内で保持するユーザー情報。localStorage等へは永続化しない(design.md#セキュリティ)。
export type SpotifyUser = {
  id: string
  displayName: string
  imageUrl: string | null
}

// 認可コード付き帰還を処理した結果。呼び出し元(初期化処理)が状態を分岐するために使う。
export type CallbackResult =
  | { kind: 'none' } // URLに認可コードもerrorも付いていない(通常アクセス)
  | { kind: 'denied' } // 利用者がSpotify側で認可を拒否した(通常のキャンセル扱い)
  | { kind: 'invalid_state' } // stateが一致しない(不正なリダイレクトの疑い)
  | { kind: 'code'; code: string } // 正常な認可コード

class SpotifyAuthError extends Error {
  constructor(
    message: string,
    // console.errorに出す技術情報。トークン本体は含めない(design.md#セキュリティ)
    readonly detail?: unknown
  ) {
    super(message)
    this.name = 'SpotifyAuthError'
  }
}

export { SpotifyAuthError }

// 本アプリのコールバックURL。Spotify Developer Dashboardに登録したredirect URIと完全一致させる必要がある。
export function getRedirectUri(): string {
  return `${window.location.origin}/spotify-playlist/`
}

// -------------------- 認可の開始 --------------------

// client_id・redirect_uri・code_challenge・state・scopeを載せた認可URLを組み立てる(tasks.md 2)。
export function buildAuthorizeUrl(params: {
  redirectUri: string
  codeChallenge: string
  state: string
}): string {
  if (!SPOTIFY_CLIENT_ID && process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console -- 開発中にNEXT_PUBLIC_SPOTIFY_CLIENT_IDの設定忘れへ気づけるようにする
    console.warn('[spotify-playlist] NEXT_PUBLIC_SPOTIFY_CLIENT_IDが未設定です')
  }
  const query = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: params.redirectUri,
    code_challenge_method: 'S256',
    code_challenge: params.codeChallenge,
    state: params.state,
    scope: SPOTIFY_SCOPE,
  })
  return `${AUTHORIZE_ENDPOINT}?${query.toString()}`
}

// PKCE用の値を生成してsessionStorageへ保存し、遷移先の認可URLを返す(design.md#spotifyでログインする処理 手順1-3)。
// 実際の画面遷移は呼び出し元(page.tsx)が行う。
export async function prepareAuthorization(): Promise<string> {
  const verifier = generateCodeVerifier()
  const state = generateState()
  const challenge = await deriveCodeChallenge(verifier)

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier)
  sessionStorage.setItem(PKCE_STATE_KEY, state)

  return buildAuthorizeUrl({ redirectUri: getRedirectUri(), codeChallenge: challenge, state })
}

// -------------------- 認可コードからのトークン交換 --------------------

function clearPkceParams(): void {
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)
  sessionStorage.removeItem(PKCE_STATE_KEY)
}

// URLのクエリから認可コード帰還の種別を判定する(design.md#spotifyでログインする処理 手順5・10)。
// 拒否・state不一致のときは、この時点で一時保存したcode_verifier・stateを削除する。
export function readCallback(searchParams: URLSearchParams): CallbackResult {
  const error = searchParams.get('error')
  const code = searchParams.get('code')
  const returnedState = searchParams.get('state')

  if (error) {
    clearPkceParams()
    // 想定内の拒否(access_denied)は通常のキャンセル扱いのためログに残さない。
    // それ以外の値は原因調査のため記録しておく(design.md#ログ「ログイン失敗はconsole.error」、PIIは含まない)
    if (error !== 'access_denied') {
      // eslint-disable-next-line no-console -- 想定外の認可エラー値の記録
      console.error('[spotify-playlist] 想定外の認可エラーを受け取りました', error)
    }
    return { kind: 'denied' }
  }
  if (!code) {
    return { kind: 'none' }
  }

  const savedState = sessionStorage.getItem(PKCE_STATE_KEY)
  if (!savedState || savedState !== returnedState) {
    clearPkceParams()
    return { kind: 'invalid_state' }
  }
  return { kind: 'code', code }
}

type TokenEndpointResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
}

async function requestToken(body: URLSearchParams): Promise<StoredTokens> {
  let response: Response
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
  } catch (cause) {
    throw new SpotifyAuthError('トークン発行の通信に失敗しました', cause)
  }
  if (!response.ok) {
    throw new SpotifyAuthError('トークン発行に失敗しました', { status: response.status })
  }
  const data = (await response.json()) as TokenEndpointResponse
  return {
    accessToken: data.access_token,
    // リフレッシュ応答にrefresh_tokenが含まれないことがあるため、呼び出し元で既存値をフォールバックさせる
    refreshToken: data.refresh_token ?? '',
    expiresAt: Date.now() + data.expires_in * 1000,
  }
}

// 認可コードとsessionStorage上のcode_verifierでトークンを発行する(design.md#spotifyでログインする処理 手順6)。
// 成功・失敗いずれの場合もcode_verifier・stateを削除する(失敗時も認可コードをURLに残さないための後始末は呼び出し元)。
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<StoredTokens> {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
  if (!verifier) {
    clearPkceParams()
    throw new SpotifyAuthError('認可の一時情報が見つかりませんでした')
  }
  try {
    return await requestToken(
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: SPOTIFY_CLIENT_ID,
        code_verifier: verifier,
      })
    )
  } finally {
    clearPkceParams()
  }
}

// -------------------- トークンの保存・復元・破棄 --------------------

export function saveTokens(tokens: StoredTokens): void {
  localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens))
}

export function loadTokens(): StoredTokens | null {
  const raw = localStorage.getItem(TOKENS_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredTokens
    if (!parsed.accessToken || !parsed.refreshToken || typeof parsed.expiresAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

// ログアウト・セッション失効時にブラウザ上の保存情報のみを破棄する(design.md#ログアウトする処理)。
export function clearTokens(): void {
  localStorage.removeItem(TOKENS_STORAGE_KEY)
  clearPkceParams()
  pendingRefresh = null
}

// -------------------- アクセストークンの自動リフレッシュ --------------------

// 進行中のリフレッシュ。バッチ検索など複数呼び出しが同時に期限切れを検知しても、
// Spotifyへのリフレッシュリクエストは1回だけにする(design.md#アクセストークンを自動更新する処理)。
let pendingRefresh: Promise<string> | null = null

async function refreshTokens(current: StoredTokens): Promise<string> {
  let refreshed: StoredTokens
  try {
    refreshed = await requestToken(
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: current.refreshToken,
        client_id: SPOTIFY_CLIENT_ID,
      })
    )
  } catch (cause) {
    // 失効・取り消し済みなど。保存内容を破棄し、呼び出し元は再ログインを促す
    clearTokens()
    throw cause instanceof SpotifyAuthError ? cause : new SpotifyAuthError('トークンの再発行に失敗しました', cause)
  }
  const next: StoredTokens = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken || current.refreshToken,
    expiresAt: refreshed.expiresAt,
  }
  saveTokens(next)
  // eslint-disable-next-line no-console -- リフレッシュ成功の記録(design.md#ログ)
  console.log('[spotify-playlist] アクセストークンをリフレッシュしました')
  return next.accessToken
}

// Spotify Web APIを呼ぶ直前に使う。期限に余裕があればそのまま、なければリフレッシュしてから返す
// (design.md#アクセストークンを自動更新する処理)。保存トークンが無い/リフレッシュ失敗時はエラーを投げる。
export async function getFreshAccessToken(): Promise<string> {
  const tokens = loadTokens()
  if (!tokens) throw new SpotifyAuthError('ログイン情報がありません')

  if (tokens.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return tokens.accessToken
  }
  if (!pendingRefresh) {
    pendingRefresh = refreshTokens(tokens).finally(() => {
      pendingRefresh = null
    })
  }
  return pendingRefresh
}

// -------------------- 自ユーザー情報の取得 --------------------

type SpotifyMeResponse = {
  id: string
  display_name: string | null
  images?: { url: string }[]
}

// GET /v1/me で表示用のユーザー情報を得る(design.md#spotifyでログインする処理 手順7)。
export async function fetchSpotifyUser(accessToken: string): Promise<SpotifyUser> {
  let response: Response
  try {
    response = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (cause) {
    throw new SpotifyAuthError('ユーザー情報の取得に失敗しました', cause)
  }
  if (!response.ok) {
    throw new SpotifyAuthError('ユーザー情報の取得に失敗しました', { status: response.status })
  }
  const data = (await response.json()) as SpotifyMeResponse
  return {
    id: data.id,
    displayName: data.display_name ?? data.id,
    imageUrl: data.images?.[0]?.url ?? null,
  }
}

// -------------------- ログイン状態の初期化 --------------------

export type AuthState =
  | { status: 'checking' }
  | { status: 'loggedOut' }
  | { status: 'loggedIn'; user: SpotifyUser }

// URLから認可コード・state・errorのクエリパラメータを取り除く(ブラウザ履歴に認可コードを残さない、design.md#セキュリティ)。
function stripAuthParamsFromUrl(): void {
  const url = new URL(window.location.href)
  let changed = false
  for (const key of ['code', 'state', 'error']) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (changed) {
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  }
}

// マウント直後に1回呼ぶ。URLの認可コード帰還 → 保存トークンでの復元 → 未ログイン、の順で判定する
// (design.md#ログイン状態を復元する処理、design.md#画面設計「初期化中」)。
export async function initializeSession(): Promise<AuthState> {
  const searchParams = new URLSearchParams(window.location.search)
  const callback = readCallback(searchParams)

  if (callback.kind !== 'none') {
    try {
      if (callback.kind === 'denied' || callback.kind === 'invalid_state') {
        // ここでは表示をゲート画面に戻すだけで、保存済みのリフレッシュトークンは意図的に破棄しない
        // (design.md上はゲート表示への切り替えのみが要求で、有効なセッションを持つ利用者はリロードすれば
        // 「ログイン状態を復元する処理」で再ログインされる。異常なstateだけを理由に強制ログアウトはしない)
        return { status: 'loggedOut' }
      }
      const tokens = await exchangeCodeForTokens(callback.code, getRedirectUri())
      // 認可コードフローではrefresh_tokenが必ず返る想定
      const user = await fetchSpotifyUser(tokens.accessToken)
      saveTokens(tokens)
      // eslint-disable-next-line no-console -- ログイン成功の記録(design.md#ログ)
      console.log('[spotify-playlist] ログインしました')
      return { status: 'loggedIn', user }
    } catch (error) {
      // eslint-disable-next-line no-console -- ログイン失敗の記録。技術情報のみ(design.md#ログ)
      console.error('[spotify-playlist] ログインに失敗しました', errorDetail(error))
      clearTokens()
      return { status: 'loggedOut' }
    } finally {
      stripAuthParamsFromUrl()
    }
  }

  const tokens = loadTokens()
  if (!tokens) return { status: 'loggedOut' }

  try {
    const accessToken = await getFreshAccessToken()
    const user = await fetchSpotifyUser(accessToken)
    return { status: 'loggedIn', user }
  } catch (error) {
    // eslint-disable-next-line no-console -- 復元失敗の記録。技術情報のみ(design.md#ログ)
    console.error('[spotify-playlist] ログイン状態の復元に失敗しました', errorDetail(error))
    clearTokens()
    return { status: 'loggedOut' }
  }
}

// ログには技術情報のみ出す(トークン・PIIを出さない、design.md#ログ)
function errorDetail(error: unknown): unknown {
  if (error instanceof SpotifyAuthError) return error.detail ?? error.message
  return error instanceof Error ? error.message : error
}
