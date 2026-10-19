import type { Article, Genre } from './types'

export type FindingIndexEntry = { heading: string; genre: Genre }

// 全記事から「記事ID:研究ID」→見出し・ジャンルの索引を作る
// (仕様: bookmark/requirements.md#付箋の一覧-10、bookmark/design.md「付箋一覧を表示する処理」手順3)。
// 付箋一覧ページで、保存されたarticleId・findingIdから表示用の見出し・ジャンルを引き当てるために使う。
// 掲載できなかったジャンル(emptyGenres)には対象の研究が存在しないため、索引には含めない。
// 対応する研究が見つからない場合(記事データから消えた等)はキー自体が存在しないため、
// 呼び出し元はundefinedを見てその項目を一覧から除外できる
export function buildFindingIndex(articles: Article[]): Record<string, FindingIndexEntry> {
  const index: Record<string, FindingIndexEntry> = {}
  for (const article of articles) {
    for (const finding of article.findings) {
      index[`${article.id}:${finding.id}`] = { heading: finding.heading, genre: finding.genre }
    }
  }
  return index
}
