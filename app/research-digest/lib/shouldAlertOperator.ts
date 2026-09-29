import type { GenreResult } from './candidateTypes'

// 選定結果からの運営者への警告判定(仕様: weekly-publish/requirements.md#掲載件数の保証-3、
// content-selection/requirements.md#収集失敗-4、weekly-publish/design.md「1回分の記事を生成する処理」手順2)。
// 全ジャンルが収集失敗(collection-failed)だった回に限り、収集の仕組み自体に問題が起きている
// 可能性があるため運営者への警告が必要と判定する。採用0件でも収集失敗以外のジャンル
// (no-candidate等)が1つでも混在すれば警告しない(採用0件は公開をスキップする理由にならないため)。
// content-selectionのまとめCLI(collect-and-select.ts)から呼ばれる純粋関数
export function shouldAlertOperator(genreResults: GenreResult[]): boolean {
  return genreResults.length > 0 && genreResults.every((g) => g.status === 'collection-failed')
}
