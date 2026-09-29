// 情報源一覧(運営者専用)ページの表示行の組み立て(仕様: design.md「表示する行を組み立てる処理」
// 「採用基準を日本語にする処理」)。watchlist.json・criteria.jsonの値から表示用の文言を導出する
// 純粋関数のみを持ち、このページ用のデータを別に持たない(requirements.md#機能要件-5)

import type { Edition } from './types'

// 情報源1件分の表示用の値(design.md「コンポーネント設計」)。地域区分は日本語に変換済み
export type SourceDirectorySourceItem = {
  name: string
  url: string
  regionLabel: string // '日本' | '海外'
}

// ジャンル1件分の表示行(design.md「コンポーネント設計」)。固定リストジャンルはsourcesのみ、
// WebSearchジャンルはsearchHintsのみ、併用ジャンルは両方に値が入る(片方しか使わないジャンルは
// もう片方を空配列にする)。表示に使う文言はすべてこの型の時点で確定させ、画面側で加工しない
export type SourceDirectoryRow = {
  genreLabel: string
  editionLabel: string
  methodLabel: string
  criteriaText: string
  sources: SourceDirectorySourceItem[]
  searchHints: string[]
}

// エンタメ編を先・カルチャー・ライフスタイル編を後にする表示順(requirements.md#表示の順序-6)
export const EDITIONS: Edition[] = ['entertainment', 'culture-lifestyle']
