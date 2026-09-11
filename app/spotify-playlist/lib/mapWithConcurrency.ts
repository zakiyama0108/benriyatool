// 配列の各要素に非同期処理を適用する。同時に走らせる数をlimitに絞ることで、
// 曲数が多いときのSpotify APIレート制限(429)を招きにくくする(design.md#パフォーマンス)。
export async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0
  async function runNext(): Promise<void> {
    const current = cursor++
    if (current >= items.length) return
    await worker(items[current], current)
    return runNext()
  }
  const runnerCount = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: runnerCount }, () => runNext()))
}
