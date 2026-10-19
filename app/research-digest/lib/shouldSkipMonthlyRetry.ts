// 月次見直しの再実行cronの冪等チェック(仕様: source-review/requirements.md#利用上限への到達時の再実行-7、
// source-review/design.md「実行環境の前提」)。
// hasSuccessfulRunはその月の同ワークフローの成功実行(本番または前回の再実行)があるかどうか、
// reviewPrExistsはその月の見直しブランチ(research-digest/source-review/<年-月>)からのPR
// (オープン・マージ済み・クローズ済みのいずれでもよい)が既にあるかどうかを表す
// (いずれもワークフロー側でghコマンドを使って調べ、この関数にはその結果だけを渡す)。
// 材料がなくPRを作らなかった月は本番の実行自体が正常終了しているため、hasSuccessfulRunがtrueになり
// 再実行は走らない
export function shouldSkipMonthlyRetry(hasSuccessfulRun: boolean, reviewPrExists: boolean): boolean {
  return hasSuccessfulRun || reviewPrExists
}
