// 曲名入力欄(複数行テキストエリア)の文字列を、検索対象の曲名一覧へ変換する。

// Spotifyのプレイリストへの曲追加は1リクエストあたり最大100件のため、検索対象もこの上限に合わせる
// (requirements.md#曲名の入力-2。作成時の分割呼び出しを不要にする)。
export const MAX_SONG_NAMES = 100

// 改行で分割し、各行の前後の空白を除いて空になる行を落とす。重複除去はしない(requirements.md#曲名の入力-3)。
// 100件を超えた分(ignoredCount)は検索対象から外す。
export function parseSongInput(text: string): { names: string[]; ignoredCount: number } {
  const nonEmpty = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  return {
    names: nonEmpty.slice(0, MAX_SONG_NAMES),
    ignoredCount: Math.max(0, nonEmpty.length - MAX_SONG_NAMES),
  }
}

// 「検索する」を有効化してよいか(検索対象の曲名が1件以上あるか)(requirements.md#曲名の入力-1)。
export function hasSearchableSong(text: string): boolean {
  return parseSongInput(text).names.length > 0
}
