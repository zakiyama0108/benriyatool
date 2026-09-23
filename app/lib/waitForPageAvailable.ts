// 記事詳細ページが本番サイトで実際に閲覧可能になるまで待つ(仕様: design.md「記事ページの公開を
// 待つ処理」)。mainへのpushでLINE配信ワークフローと本番デプロイが並列に起動し、デプロイの方が
// 後に完了するため、配信前に記事ページへHTTP GETしポーリングすることでデプロイ未完了時の404リンク
// 配信を防ぐ(requirements.md#配信タイミング・方式-8〜9)。
// このファイルはai-dev-digest/news-digest/trend-digestの3配信CLIで共有する(CLAUDE.md「フォルダ
// 構成」のサイト全体に関わるものをapp/直下に置く規約)。
//
// console出力は一切行わない。no-consoleの例外はscripts/配下のみでapp/配下では
// npm run lint(--max-warnings=0)が失敗するため、試行ごとの結果はonAttemptコールバックで
// 呼び出し元(scripts/<app>/broadcast-line.ts)へ渡し、実行ログへの記録は呼び出し元に委ねる

// デプロイ完了からリンク通知までの遅れをこの粒度に抑える(design.md「待機パラメータと根拠」)
const DEFAULT_POLL_INTERVAL_MS = 15_000
// 実測(2026-09-22時点、mainへのpushからデプロイ完了まで約2分7秒)の5倍弱を上限とする
const DEFAULT_TIMEOUT_MS = 600_000

// fetchが例外(ネットワークエラー)を投げた場合のステータス表現。数値のHTTPステータスと
// 混同しないよう専用のリテラル型にする
export type HttpStatusOrNetworkError = number | 'network-error'

export type WaitForPageAvailableAttempt = {
  // その試行の時点での累計経過時間(秒)。onAttemptはこの単位で渡す
  elapsedSeconds: number
  status: HttpStatusOrNetworkError
}

export type WaitForPageAvailableOptions = {
  pollIntervalMs?: number
  timeoutMs?: number
  // テストからの差し替え用(design.md「テストからの注入」)。既定は本番用のグローバルfetch/実際に待つsleep
  fetch?: typeof fetch
  sleep?: (ms: number) => Promise<void>
  // 試行ごとの結果を呼び出し元へ通知する(design.md手順5)
  onAttempt?: (attempt: WaitForPageAvailableAttempt) => void
}

export type WaitForPageAvailableResult =
  | { available: true }
  | {
      available: false
      // 時間切れ時点の累計経過時間(ミリ秒)。onAttemptが渡す経過秒数とは単位が異なる
      elapsedMs: number
      lastStatus: HttpStatusOrNetworkError
    }

async function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 指定URLへGETし、200が返るまでポーリングする。リダイレクト(3xx)はfetch既定の
// redirect: 'follow'のまま追わせ、manualにはしない(design.md手順2。trailingSlash: trueにより
// 本番の正準URLは末尾スラッシュありで3xx経由になるため、manualや厳密なstatus===200判定では
// 公開済みでも200を観測できず必ず時間切れになる)。CDN/HTTPキャッシュを避けるためcache:
// 'no-store'を指定する
export async function waitForPageAvailable(
  url: string,
  options: WaitForPageAvailableOptions = {}
): Promise<WaitForPageAvailableResult> {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const fetchImpl = options.fetch ?? fetch
  const sleep = options.sleep ?? defaultSleep

  // 経過時間はDate.now()等の実時計ではなく、待ったpollIntervalMsの累計で数える
  // (テストがsleepを差し替えて実時間0秒で時間切れケースを再現できるようにするため)
  let elapsedMs = 0

  for (;;) {
    let status: HttpStatusOrNetworkError
    try {
      const response = await fetchImpl(url, { cache: 'no-store' })
      status = response.status
    } catch {
      status = 'network-error'
    }

    options.onAttempt?.({ elapsedSeconds: Math.floor(elapsedMs / 1000), status })

    if (status === 200) {
      return { available: true }
    }

    if (elapsedMs >= timeoutMs) {
      return { available: false, elapsedMs, lastStatus: status }
    }

    await sleep(pollIntervalMs)
    elapsedMs += pollIntervalMs
  }
}
