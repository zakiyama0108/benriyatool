import type { Edition, Genre } from './types' // article-detail/design.mdが定義する型を再利用(重複定義しない)
import type { SelectionMethod } from './watchlistTypes'

// 収集した候補・選定結果の型定義(仕様: design.md「候補の型(前提)」)。
// selection.tsの入出力はこの型のみで完結する純粋なデータのため、Supabase・ファイル入出力を
// 持たずvitestで完全にテストできる(design.md「関連するファイル(抜粋)」参照)

export type Candidate = {
  genre: Genre
  title: string // 対象作品・話題そのものの原題(検索・重複判定の主キーとして扱う)
  sourceName: string
  sourceUrl: string
  method: SelectionMethod
  strength: number // 絞り込みの優先順位付けに使う数値。固定リスト: 100-順位(順位が高い=強い)。WebSearch: 独立情報源の言及数
  note?: string // 判定根拠のメモ(新規ランクイン/順位変動/独立情報源数など。ログ・PR本文向け)
}

export type SelectionResult =
  | { status: 'ok'; edition: Edition; topics: Candidate[] } // 絞り込み後、edition内ジャンル順に並んだ最終候補
  | { status: 'skipped'; edition: Edition; reason: string } // 対象9ジャンルすべてで候補が0件の場合のみ
