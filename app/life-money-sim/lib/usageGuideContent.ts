// コンテキストヘルプ・使い方バナー・用語集で表示する文言をまとめて定義する。
// すべて静的な日本語文字列(利用者入力・APIレスポンスを含まない)。初版はrequirements.md
// 「ビジネスルール・制約」の各表(仕様: requirements.md#コンテキストヘルプの文言、
// requirements.md#使い方バナーの文言、requirements.md#用語集の文言)

// コンテキストヘルプを表示する9枚のカードのID。requirements.mdの呼び名(世帯按分)と
// 画面表示上の呼び名(家計支出=HouseholdShareInput.tsx)が異なる点はdesign.md#処理フロー参照
export type HelpCardId =
  | 'income'
  | 'personalExpense'
  | 'household'
  | 'balanceSummary'
  | 'startingAsset'
  | 'familyProfile'
  | 'investmentMode'
  | 'eventBonus'
  | 'assetProjection'

export const CONTEXT_HELP_TEXT: Record<HelpCardId, string> = {
  income:
    '手取り月収と、年間の賞与回数・1回あたりの金額を入力します。ボーナス月だけ金額を変えたい場合は「賞与・イベント」で個別に上書きできます。',
  personalExpense:
    '家賃や通信費など自分だけの支出を、年額/月額に分けて登録します。円グラフで支出の内訳がひと目で分かります。',
  household: '配偶者がいる場合、家賃や光熱費など世帯共通費を按分(分担)した自分の負担額を入力します。',
  balanceSummary:
    '収入から支出を差し引いた「毎月の余剰資金」を表示します。この金額が資産推移の元手として毎月積み上がっていきます。',
  startingAsset: 'シミュレーションの元本となる、今の資産額と開始年月を入力します。',
  familyProfile:
    '配偶者・子どもの生年月を入力すると、資産推移の各時点での年齢を一緒に確認できます(未入力でも計算は行われます)。',
  investmentMode: '「資産運用」モードでは想定利回り(年率)を設定でき、複利で運用した場合の資産推移を計算します。',
  eventBonus: '特定の月だけ賞与額を上書きしたり、結婚・出産などの一時的な支出を登録して資産推移に反映します。',
  assetProjection:
    '入力した収支・前提条件をもとに、資産額の推移をグラフと表で確認できます。月次/年次の表示切り替えにも連動します。',
}

export const USAGE_BANNER_STEPS: { title: string; text: string }[] = [
  { title: '① 収支を入力する', text: '収入と支出を入れると、毎月の余剰資金が自動で計算されます。' },
  { title: '② 前提条件を設定する', text: '今の資産額・家族構成・貯蓄/運用モードを選びます。' },
  { title: '③ 資産推移を確認する', text: 'グラフとテーブルで将来の資産を確認。賞与やイベントも追加できます。' },
]

export const GLOSSARY_TERMS: { term: string; text: string }[] = [
  { term: '差引後余剰', text: '毎月の余剰資金に、賞与や一時的な支出(イベント)を反映した後、実際に資産へ積み上がる金額です。' },
  { term: '貯蓄のみモード', text: '運用による増減を考慮せず、元本と余剰資金の積み上げだけで資産推移を計算する表示モードです。' },
  { term: '資産運用モード', text: '設定した想定利回り(年率)で複利運用した場合の資産推移を計算する表示モードです。' },
  { term: 'マイシナリオ', text: 'ログインした利用者が、入力値一式に名前を付けて保存・呼び出しできる機能です。' },
]
