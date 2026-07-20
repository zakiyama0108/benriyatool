// 入力金額の単位は万円で統一する(仕様: requirements.md#ビジネスルール・制約-2)。
// 画面表示・計算・保存(save-result)まで一貫して万円のまま扱う

// 名称+金額のペアの内訳項目。年額固定費・月額固定費・家計支出項目で共通利用する
export type ExpenseItem = {
  name: string
  amount: number // 万円。負数・NaN等の不正値は計算時に0として扱う(design.md#バリデーション)
}

// 収入の入力(手取り月給・手取りボーナス)
export type IncomeInput = {
  monthlySalary: number // 手取り月給・万円
  bonusCount: number // 手取りボーナスの年間回数
  bonusAmountPerTime: number // 手取りボーナス1回あたりの金額・万円
}

// 個人支出の入力(年額固定費・月額固定費)
export type PersonalExpenseInput = {
  annualItems: ExpenseItem[] // 年に1回程度発生する個人の支出
  monthlyItems: ExpenseItem[] // 毎月発生する個人の支出
}

// 家計支出の入力(配偶者ありの場合のみ意味を持つ)
export type HouseholdExpenseInput = {
  hasSpouse: boolean
  items: ExpenseItem[] // 毎月の家計支出項目(配偶者ありの場合のみ入力)
  myShare: number // 家計支出全体に対する自分の毎月の負担額・万円
}
