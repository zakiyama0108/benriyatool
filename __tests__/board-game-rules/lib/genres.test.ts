import { describe, it, expect } from 'vitest'
import { GENRES } from '../../../app/board-game-rules/lib/genres'

// 仕様: specs/board-game-rules/game-registration/requirements.md#分類情報の任意入力-4
describe('【登録依頼・一覧絞り込み】ジャンルの固定選択肢 - 自由記述ではなく固定リストから選ぶ', () => {
  it('固定リストが仕様どおりの項目・順序を持つこと(絞り込みの選択肢を安定させるため)', () => {
    expect(GENRES).toEqual([
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
    ])
  })
})
