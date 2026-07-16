import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSession, signInWithGoogle, signOut, isAuthorizedAdmin } from '../../../../app/ikukyu/admin/lib/auth'

const { auth, fromMock, state } = vi.hoisted(() => {
  const state = {
    session: null as unknown,
    adminEmailsResult: { data: [] as unknown, error: null as unknown },
  }
  const auth = {
    getSession: vi.fn(() => Promise.resolve({ data: { session: state.session }, error: null })),
    signInWithOAuth: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
  }
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}
  builder.select = vi.fn(() => Promise.resolve(state.adminEmailsResult))
  const fromMock = vi.fn(() => builder)
  return { auth, fromMock, state }
})

vi.mock('../../../../app/lib/supabaseClient', () => ({
  supabase: { auth, from: fromMock },
}))

beforeEach(() => {
  auth.getSession.mockClear()
  auth.signInWithOAuth.mockClear()
  auth.signOut.mockClear()
  fromMock.mockClear()
  state.session = null
  state.adminEmailsResult = { data: [], error: null }
})

// 仕様: specs/ikukyu/admin/requirements.md#ログイン・アクセス制御-1
describe('【管理】ログイン状態の取得 - 現在ログインしているかを判定する', () => {
  it('ログインセッションがないとき、nullを返すこと', async () => {
    state.session = null
    expect(await getSession()).toBeNull()
  })

  it('ログインセッションがあるとき、そのセッションを返すこと', async () => {
    state.session = { user: { email: 'owner@example.com' } }
    expect(await getSession()).toEqual({ user: { email: 'owner@example.com' } })
  })
})

// 仕様: specs/ikukyu/admin/requirements.md#ログイン・アクセス制御-2、specs/ikukyu/admin/requirements.md#認証手段とパスキー-2
describe('【管理】Googleでのログイン開始 - Google OIDCで認証を始め、認証後に管理画面へ戻す', () => {
  it('Googleプロバイダで、認証後の戻り先を管理画面URLに指定してログインを開始すること', async () => {
    await signInWithGoogle('https://benriyatool.com/ikukyu/admin/')
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://benriyatool.com/ikukyu/admin/' },
    })
  })
})

// 仕様: specs/ikukyu/admin/requirements.md#ログイン・アクセス制御-4
describe('【管理】ログアウト - ログインセッションを破棄する', () => {
  it('ログアウトを実行すること', async () => {
    await signOut()
    expect(auth.signOut).toHaveBeenCalled()
  })
})

// 仕様: specs/ikukyu/admin/requirements.md#ログイン・アクセス制御-3、specs/ikukyu/admin/requirements.md#アクセス制御・権限-1
describe('【管理】閲覧権限の確認 - ログイン中の本人が許可リストに登録されているかを確認する', () => {
  it('自分のアカウントが許可リストにあるとき、閲覧を許可(true)すること', async () => {
    state.adminEmailsResult = { data: [{ email: 'owner@example.com' }], error: null }
    expect(await isAuthorizedAdmin()).toBe(true)
    expect(fromMock).toHaveBeenCalledWith('admin_emails')
  })

  it('自分のアカウントが許可リストにないとき(0件)、閲覧を許可しない(false)こと', async () => {
    state.adminEmailsResult = { data: [], error: null }
    expect(await isAuthorizedAdmin()).toBe(false)
  })

  it('権限の確認に失敗した(errorが返る)とき、例外を投げること', async () => {
    state.adminEmailsResult = { data: null, error: { message: 'network error' } }
    await expect(isAuthorizedAdmin()).rejects.toThrow()
  })
})
