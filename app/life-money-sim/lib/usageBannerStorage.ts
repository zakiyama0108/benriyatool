// 使い方バナーの開閉状態(真偽値1つのみ)をlocalStorageに読み書きする。
// プライベートブラウジング等でlocalStorageが使えない環境でも画面表示を止めないよう、
// 読み書きの失敗は開いた状態へのフォールバック・ログ出力のみで吸収し、呼び出し元へは伝播させない
// (仕様: requirements.md#保存できない環境でのフォールバック-1、design.md#エラーハンドリング、design.md#ログ)

const STORAGE_KEY = 'life-money-sim:usage-banner-open'

// 保存値が無い場合・読み込みに失敗した場合は初期状態(開いた状態)を返す
export function loadUsageBannerOpen(): boolean {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === null) return true
    return value === 'true'
  } catch (e) {
    // eslint-disable-next-line no-console -- 表示補助機能の失敗を握りつぶさず記録する(design.md#ログ)
    console.error('使い方バナー: 開閉状態の読み込みに失敗しました', e)
    return true
  }
}

// 保存に失敗しても画面上の開閉自体は妨げないよう、エラーは外へ投げずログのみ出す
export function saveUsageBannerOpen(isOpen: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(isOpen))
  } catch (e) {
    // eslint-disable-next-line no-console -- 表示補助機能の失敗を握りつぶさず記録する(design.md#ログ)
    console.error('使い方バナー: 開閉状態の保存に失敗しました', e)
  }
}
