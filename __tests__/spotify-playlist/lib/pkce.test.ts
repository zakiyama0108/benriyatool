import { describe, it, expect } from 'vitest'
import { generateCodeVerifier, generateState, deriveCodeChallenge } from '@/app/spotify-playlist/lib/pkce'

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-1
describe('Spotifyログインの認可準備 - PKCE用の値を暗号学的乱数で用意する', () => {
  it('code_verifierはRFC7636が定める43〜128文字のunreserved文字のみで構成されること', () => {
    const verifier = generateCodeVerifier()
    expect(verifier.length).toBeGreaterThanOrEqual(43)
    expect(verifier.length).toBeLessThanOrEqual(128)
    // unreserved文字(英数字と - . _ ~)以外が混ざっていない
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/)
  })

  it('code_verifierは呼び出すたびに異なる値になること(固定値・低エントロピーでないこと)', () => {
    const values = new Set(Array.from({ length: 20 }, () => generateCodeVerifier()))
    expect(values.size).toBe(20)
  })

  it('CSRF対策用のstateも呼び出すたびに異なるランダム文字列になること', () => {
    const values = new Set(Array.from({ length: 20 }, () => generateState()))
    expect(values.size).toBe(20)
    expect(generateState()).toMatch(/^[A-Za-z0-9\-._~]+$/)
  })

  it('code_challengeはcode_verifierをSHA-256でハッシュ化しbase64url化したS256方式の値になること', async () => {
    // RFC7636 付録Bの既知のテストベクタ(verifier → challenge)で検証する
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const challenge = await deriveCodeChallenge(verifier)
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
    // パディング(=)や+ /が残っていないこと
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/)
  })
})
