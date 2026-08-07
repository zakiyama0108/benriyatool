// ジャンルの固定選択肢(仕様: game-registration/design.md「ジャンルの選択肢」)。
// 一覧の絞り込み(game-list)で選択肢を安定させるため、自由記述ではなく固定リストとする。
// 1ゲームにつき複数選択できる(DBは genres text[])。選択画面では説明を併記する。
// 投稿者の依頼はあくまで参考情報で、最終的な値は運営者のローカル登録ツール(AI判断)が
// 写真・ルール内容から決めるため、投稿者が正確に選びきる必要はない。そのため選択肢数を
// 絞らず、認知度の高いジャンルを広めに用意している(2026-08、ユーザーとの議論での判断)。
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
  { value: '拡大再生産', description: '資源を投資して資産をどんどん増やしていく' },
  { value: '陣取り・エリアマジョリティ', description: 'ボード上のエリアを取り合う' },
  { value: 'タイル配置', description: 'タイルを場に並べて盤面を作っていく' },
  { value: 'ドラフト', description: '手元に回ってきたカードやタイルから選び取る' },
  { value: 'セットコレクション', description: '特定の組み合わせを集めて得点する' },
  { value: 'ハンドマネージメント', description: '手札をやりくりして最適なプレイを選ぶ' },
  { value: '競り・オークション', description: '品物を巡って入札し合う' },
  { value: 'ベッティング・予想', description: '結果を予想して賭ける' },
  { value: 'トリックテイキング', description: '手札を出し合って勝敗を競うカード技法' },
  { value: 'ダイスロール', description: 'サイコロの出目でゲームが進行する' },
  { value: 'ブラフ・心理戦', description: '嘘や駆け引きで相手を欺く' },
  { value: 'アブストラクト', description: '運要素なしの純粋な実力勝負' },
  { value: 'アクション', description: 'バランス・スピードなど身体動作を伴う' },
  { value: '表現・言葉遊び', description: 'お題を言葉や絵で伝える(ジェスチャー・お絵描き系)' },
  { value: 'レガシー', description: 'キャンペーン形式でシナリオが進行・変化していく' },
  { value: 'ウォーゲーム', description: '戦争・軍事をテーマにした重量級ゲーム' },
  { value: 'その他', description: '上記に当てはまらないゲーム' },
] as const

export type Genre = (typeof GENRES)[number]['value']

// 章立て(rulesChapters.ts)のchapterHeadingと同じ考え方: 値から説明を引く
export function genreDescription(value: string): string | undefined {
  return GENRES.find((g) => g.value === value)?.description
}
