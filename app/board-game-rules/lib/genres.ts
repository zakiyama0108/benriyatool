// ジャンルの固定選択肢(仕様: game-registration/design.md「ジャンルの選択肢」)。
// 一覧の絞り込み(game-list)で選択肢を安定させるため、自由記述ではなく固定リストとする。
// DB側もCHECK制約でこの一覧に固定する(supabase/migrations参照)。
export const GENRES = [
  '戦略',
  'パーティー',
  '協力',
  '推理・デダクション',
  'カードゲーム',
  'ダイスゲーム',
  'ワーカープレイスメント',
  'デッキ構築',
  'エリアマジョリティ',
  'ファミリー',
  'その他',
] as const

export type Genre = (typeof GENRES)[number]
