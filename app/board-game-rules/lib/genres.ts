// ジャンルの固定選択肢(仕様: game-registration/design.md「ジャンルの選択肢」)。
// 一覧の絞り込み(game-list)で選択肢を安定させるため、自由記述ではなく固定リストとする。
// 1ゲームにつき複数選択できる(DBは genres text[])。選択画面では説明を併記する。
// DB側もCHECK制約でこの一覧に固定する(supabase/migrations参照)。
export const GENRES = [
  { value: '協力', description: 'プレイヤー全員がチームとなり、共通の目標達成を目指す' },
  { value: '対戦', description: 'プレイヤー同士が競い合い、勝敗を決める' },
  { value: '正体隠匿', description: '自分の役職・陣営を隠しながら、味方を探したり相手を見破ったりする(人狼系)' },
  { value: '戦略', description: '運要素が少なく、長期的な計画・判断力が問われる重量級のゲーム' },
  { value: 'パーティー', description: '大人数でわいわい盛り上がる、ルールが簡単なゲーム' },
  { value: 'ファミリー', description: '子供から大人まで気軽に遊べる、軽いルールのゲーム' },
  { value: 'カードゲーム', description: 'カードを中心に進行するゲーム' },
  { value: 'すごろく系', description: 'サイコロを振ってマスを進み、指示に従って進行する(人生ゲーム的)' },
  { value: 'ワーカープレイスメント', description: '手持ちのコマをマスに配置してアクションを実行する' },
  { value: 'デッキ構築', description: 'プレイしながら自分のカード山を強化していく' },
  { value: '推理・デダクション', description: '手がかりから答えを論理的に導き出す' },
  { value: 'その他', description: '上記に当てはまらないゲーム' },
] as const

export type Genre = (typeof GENRES)[number]['value']

// 章立て(rulesChapters.ts)のchapterHeadingと同じ考え方: 値から説明を引く
export function genreDescription(value: string): string | undefined {
  return GENRES.find((g) => g.value === value)?.description
}
