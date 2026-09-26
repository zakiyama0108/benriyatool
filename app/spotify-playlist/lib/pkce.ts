// Authorization Code with PKCE(design.md#spotifyでログインする処理)で使う補助関数群。
// 乱数はすべてWeb Crypto API(crypto.getRandomValues)で生成し、Math.random()等の
// 非暗号論的乱数は使わない(design.md#セキュリティ: 推測可能な値だとCSRF・PKCE迂回のリスクになるため)。

// バイト列をbase64url(パディングなし)へエンコードする。base64urlの文字集合
// [A-Za-z0-9-_] はRFC7636のcode_verifierに使えるunreserved文字の部分集合のため、
// この出力はそのままcode_verifier・stateとして使える(文字ごとのmod演算による偏りも生じない)。
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// 指定バイト数の暗号学的乱数を生成し、base64url文字列で返す。
function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

// PKCEのcode_verifier。48バイト → base64urlで64文字となり、RFC7636が定める
// 43〜128文字の範囲に収まる(Spotify公式ドキュメントの例と同じ長さ)。
export function generateCodeVerifier(): string {
  return randomBase64Url(48)
}

// CSRF対策用のstate値。推測不可能でありさえすればよいため、24バイト(32文字)とする。
export function generateState(): string {
  return randomBase64Url(24)
}

// code_verifierをSHA-256でハッシュ化し、base64urlへエンコードしたcode_challenge(S256方式)を導出する。
export async function deriveCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64UrlEncode(new Uint8Array(digest))
}
