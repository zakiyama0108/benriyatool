import { describe, it, expect } from 'vitest'
import { GENRES, genreDescription } from '../../../app/board-game-rules/lib/genres'

// 仕様: specs/board-game-rules/game-registration/requirements.md#分類情報の任意入力-4
describe('【登録依頼・一覧絞り込み】ジャンルの固定選択肢 - 自由記述ではなく固定リストから複数選ぶ', () => {
  it('固定リストが仕様どおりの項目・順序を持つこと(絞り込みの選択肢を安定させるため)', () => {
    expect(GENRES.map((g) => g.value)).toEqual([
      '協力',
      '対戦',
      '正体隠匿',
      '戦略',
      'パーティー',
      'ファミリー',
      'カードゲーム',
      'すごろく系',
      'ワーカープレイスメント',
      'デッキ構築',
      '推理・デダクション',
      '拡大再生産',
      '陣取り・エリアマジョリティ',
      'タイル配置',
      'ドラフト',
      'セットコレクション',
      'ハンドマネージメント',
      '競り・オークション',
      'ベッティング・予想',
      'トリックテイキング',
      'ダイスロール',
      'ブラフ・心理戦',
      'アブストラクト',
      'アクション',
      '表現・言葉遊び',
      'レガシー',
      'ウォーゲーム',
      'その他',
    ])
  })

  it('各ジャンルに選択画面で表示する説明が設定されていること', () => {
    for (const g of GENRES) {
      expect(g.description.length).toBeGreaterThan(0)
    }
  })

  it('値からジャンルの説明を引けること(選択UIでの表示に使う)', () => {
    expect(genreDescription('協力')).toBe('プレイヤー全員がチームとなり、共通の目標達成を目指す')
  })

  it('固定リストにない値では説明が引けない(undefined)こと', () => {
    expect(genreDescription('未知のジャンル')).toBeUndefined()
  })
})
