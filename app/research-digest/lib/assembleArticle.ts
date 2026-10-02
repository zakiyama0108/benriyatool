import type { Article, EmptyGenre, Finding, Genre } from './types'
import type { CollectionFailureReason } from './candidateTypes'

// 記事データの組み立て(仕様: weekly-publish/requirements.md#掲載件数の保証-1・2・4、
// weekly-publish/design.md「1回分の記事を生成する処理」手順5)。
// 選定結果(候補なし・収集失敗のジャンル)と生成結果(研究・生成に失敗したジャンル)から、
// article-detail/design.mdのArticleスキーマに従う記事データを組み立てる純粋関数。
// ファイル入出力はscripts/research-digest/write-article.tsが担う。
//
// 入力はscripts側でJSONファイルから読み込んだ値(型検証されていないunknown由来)のため、
// 分類ラベル(collectionFailureReason)の有無をTSの型だけに頼らずここで実行時に検証する
// (収集失敗のジャンルに分類ラベルがない・候補なしや生成失敗のジャンルに分類ラベルがあるものは不正な入力)

// 収集失敗以外(候補なし)のジャンルの入力。分類ラベルを持たない
type PlainGenreInput = { genre: Genre; collectionFailureReason?: unknown }
// 収集失敗のジャンルの入力。分類ラベルを必須で持つ
type CollectionFailedGenreInput = { genre: Genre; collectionFailureReason: unknown }

const COLLECTION_FAILURE_REASONS: CollectionFailureReason[] = ['timeout', 'invalid-format', 'other']

function assertNoCollectionFailureReason(genre: PlainGenreInput, kindLabel: string): void {
  if (genre.collectionFailureReason !== undefined) {
    throw new Error(`${kindLabel}のジャンル(${genre.genre})に分類ラベル(collectionFailureReason)を指定できません`)
  }
}

function assertValidCollectionFailureReason(genre: CollectionFailedGenreInput): CollectionFailureReason {
  if (!COLLECTION_FAILURE_REASONS.includes(genre.collectionFailureReason as CollectionFailureReason)) {
    throw new Error(
      `収集失敗のジャンル(${genre.genre})に分類ラベル(collectionFailureReason)が必要です: ${String(genre.collectionFailureReason)}`,
    )
  }
  return genre.collectionFailureReason as CollectionFailureReason
}

export function assembleArticle(
  date: string,
  activeGenres: Genre[],
  findings: Finding[],
  noCandidateGenres: PlainGenreInput[],
  collectionFailedGenres: CollectionFailedGenreInput[],
  failedGenres: Genre[],
): Article {
  for (const g of noCandidateGenres) assertNoCollectionFailureReason(g, '候補なし')
  // 生成失敗はジャンル名(文字列)だけを受け取る。オブジェクトが紛れ込んだ入力は不正として弾く
  for (const g of failedGenres) {
    if (typeof g !== 'string') {
      throw new Error('生成に失敗したジャンルはジャンルのid(文字列)で指定してください(分類ラベルは指定できません)')
    }
  }

  const emptyGenres: EmptyGenre[] = [
    ...noCandidateGenres.map((g) => ({ genre: g.genre, reason: 'no-candidate' as const })),
    ...collectionFailedGenres.map((g) => ({
      genre: g.genre,
      reason: 'collection-failed' as const,
      collectionFailureReason: assertValidCollectionFailureReason(g),
    })),
    ...failedGenres.map((genre) => ({ genre, reason: 'generation-failed' as const })),
  ]

  // 有効な全ジャンルが過不足なく現れることを検証する
  // (weekly-publish/requirements.md#掲載件数の保証-1・2・4。黙ってジャンルが消える・重複する事故を防ぐ)
  const actual = [...findings.map((f) => f.genre), ...emptyGenres.map((e) => e.genre)]
  if (actual.length !== new Set(actual).size) {
    throw new Error('研究・掲載できなかったジャンルに同じジャンルが重複しています')
  }
  const expected = new Set(activeGenres)
  if (actual.length !== expected.size || actual.some((genre) => !expected.has(genre))) {
    throw new Error('研究と掲載できなかったジャンル(emptyGenres)の合計が、有効な全ジャンルと一致しません')
  }

  return { id: date, date, findings, emptyGenres }
}
