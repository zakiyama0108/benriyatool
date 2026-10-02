import type { Article } from './types'

// 次の回数の決定(仕様: content-selection/requirements.md#時間軸の切り替え-1〜2、
// content-selection/design.md「その回の時間軸2区分を決める処理」)。
// 公開済みの記事のうち最も大きい回数に1を足して今回の回数とする。利用上限への到達で
// 打ち切られた回は記事ファイルがないため、この方法で自然に回数から除外される。
// 今回の時間軸2区分はtypes.tsのhorizonsForIssue(issueNumber)で別途求める
export function nextIssueNumber(articles: Article[]): number {
  if (articles.length === 0) return 1
  return Math.max(...articles.map((a) => a.issueNumber)) + 1
}
