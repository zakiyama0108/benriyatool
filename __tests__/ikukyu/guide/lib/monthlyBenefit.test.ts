import { describe, it, expect } from 'vitest'
import { calcMonthlyBenefit, findCapSalaryLine, estimateWorkingNetIncome } from '../../../../app/ikukyu/guide/lib/monthlyBenefit'

// 月額 = 上限適用後の賃金日額 × 給付率(端数切り捨て) × 30日
// 賃金日額 = floor(月給 / 30)

// 仕様: specs/ikukyu/guide/requirements.md#月額給付額の定義-1、specs/ikukyu/guide/requirements.md#月額給付額の定義-2、specs/ikukyu/guide/requirements.md#記事ページ共通-2
describe('ガイド記事の早見表に載せる月額給付額の算出 - 月給から「最初の180日(67%)」「181日以降(50%)」「上乗せ後(80%)」の月額を導出する', () => {
  it('月給30万円の場合、賃金日額1万円をもとに67%月額20万1000円・50%月額15万円・上乗せ後80%月額24万円が算出されること', () => {
    // 賃金日額 = floor(300000/30) = 10000円
    // 67%日額 = floor(10000×67/100) = 6700円 → 月額 6700×30 = 201,000円
    // 50%日額 = floor(10000×50/100) = 5000円 → 月額 5000×30 = 150,000円
    // 13%日額 = floor(10000×13/100) = 1300円 → 80%月額 = (6700+1300)×30 = 240,000円
    const result = calcMonthlyBenefit(300000)
    expect(result.month67).toBe(201000)
    expect(result.month50).toBe(150000)
    expect(result.month80).toBe(240000)
    expect(result.capped).toBe(false)
  })

  it('月給20万円のように賃金日額に端数が出る場合、切り捨て後の日額をもとに月額が算出されること', () => {
    // 賃金日額 = floor(200000/30) = 6666円
    // 67%日額 = floor(6666×67/100) = 4466円 → 月額 133,980円
    // 50%日額 = floor(6666×50/100) = 3333円 → 月額 99,990円
    // 13%日額 = floor(6666×13/100) = 866円 → 80%月額 = (4466+866)×30 = 159,960円
    const result = calcMonthlyBenefit(200000)
    expect(result.month67).toBe(133980)
    expect(result.month50).toBe(99990)
    expect(result.month80).toBe(159960)
    expect(result.capped).toBe(false)
  })

  it('月給50万円のように賃金日額が上限を超える場合、上限額を基準に月額が算出され、上限適用の印が立つこと', () => {
    // 賃金日額 = floor(500000/30) = 16666円 → 上限16,110円にキャップ
    // 67%日額 = floor(16110×67/100) = 10793円 → 月額 323,790円
    // 50%日額 = floor(16110×50/100) = 8055円 → 月額 241,650円
    // 13%日額 = floor(16110×13/100) = 2094円 → 80%月額 = (10793+2094)×30 = 386,610円
    const result = calcMonthlyBenefit(500000)
    expect(result.month67).toBe(323790)
    expect(result.month50).toBe(241650)
    expect(result.month80).toBe(386610)
    expect(result.capped).toBe(true)
  })

  it('早見表の全月給帯(20万〜60万円・5万円刻み)で、上乗せ後80%月額が67%月額と13%上乗せ分の合計に一致すること', () => {
    // 80% = 67% + 13% という制度の構造が、どの月給帯でも端数処理込みで崩れないことを確認する
    for (let salary = 200000; salary <= 600000; salary += 50000) {
      const result = calcMonthlyBenefit(salary)
      expect(result.month80).toBeGreaterThan(result.month67)
      expect((result.month80 - result.month67) % 30).toBe(0)
    }
  })

  it('月給が0円以下の場合、誤った数値のまま記事が公開されるのを防ぐため例外になること', () => {
    // design.mdのビルド失敗ガード: 静的生成時に例外を投げてビルドを止める
    expect(() => calcMonthlyBenefit(0)).toThrow()
    expect(() => calcMonthlyBenefit(-100000)).toThrow()
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#記事1: 手取り10割検証(`/ikukyu/guide/tedori-10wari/`)-3
describe('手取り10割にならない月給ラインの特定 - 上限適用となる最小月給を探索で導出する', () => {
  it('導出した月給ラインでは上限が適用され、その1円下では適用されないこと(境界の性質。定数改定後も成り立つ)', () => {
    const { capSalary } = findCapSalaryLine()
    expect(calcMonthlyBenefit(capSalary).capped).toBe(true)
    expect(calcMonthlyBenefit(capSalary - 1).capped).toBe(false)
  })

  it('現行の制度定数(2025年8月〜2026年7月適用)では、月給48万3330円が上限適用の最小ライン・賃金日額上限が1万6110円になること', () => {
    // 現行定数値のスナップショット検証。毎年8月の定数改定時はこのitの期待値だけを更新する
    const { capSalary, cappedDailyWage } = findCapSalaryLine()
    expect(capSalary).toBe(483330)
    expect(cappedDailyWage).toBe(16110)
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#手取り比較の扱い-1、specs/ikukyu/guide/requirements.md#手取り比較の扱い-2
describe('就労時の手取り概算 - 「手取り10割」比較の基準となる、額面の約8割の概算手取りを算出する', () => {
  it('月給35万円の場合、概算手取りが額面の80%の28万円になること', () => {
    // 社会保険料の本人負担(約14〜15%)+所得税・住民税(約5〜6%)で控除合計約2割、という一般的な目安
    expect(estimateWorkingNetIncome(350000)).toBe(280000)
  })

  it('どの月給でも概算手取りが額面の80%ちょうどになること(概算率が1か所の定数で管理されている前提の確認)', () => {
    for (let salary = 200000; salary <= 600000; salary += 50000) {
      expect(estimateWorkingNetIncome(salary)).toBe(salary * 0.8)
    }
  })

  it('月給が0円以下の場合、例外になること(ビルド失敗ガード)', () => {
    expect(() => estimateWorkingNetIncome(0)).toThrow()
  })
})
