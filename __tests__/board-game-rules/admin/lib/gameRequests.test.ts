import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  selectMock,
  orderMock,
  order2Mock,
  updateMock,
  updateEqMock,
  deleteMock,
  deleteEqMock,
  insertMock,
  insertSelectMock,
  insertSingleMock,
  fromMock,
} = vi.hoisted(() => {
  const order2Mock = vi.fn()
  const orderMock = vi.fn(() => ({ order: order2Mock }))
  const selectMock = vi.fn(() => ({ order: orderMock }))
  const updateEqMock = vi.fn()
  const updateMock = vi.fn(() => ({ eq: updateEqMock }))
  const deleteEqMock = vi.fn()
  const deleteMock = vi.fn(() => ({ eq: deleteEqMock }))
  const insertSingleMock = vi.fn()
  const insertSelectMock = vi.fn(() => ({ single: insertSingleMock }))
  const insertMock = vi.fn(() => ({ select: insertSelectMock }))
  const fromMock = vi.fn(() => ({
    select: selectMock,
    update: updateMock,
    delete: deleteMock,
    insert: insertMock,
  }))
  return {
    selectMock,
    orderMock,
    order2Mock,
    updateMock,
    updateEqMock,
    deleteMock,
    deleteEqMock,
    insertMock,
    insertSelectMock,
    insertSingleMock,
    fromMock,
  }
})
vi.mock('../../../../app/lib/supabaseClient', () => ({ supabase: { from: fromMock } }))

import {
  fetchGameRequests,
  markGameRequestProcessed,
  deleteGameRequest,
  triggerRegistration,
  requestRevision,
  publishDraft,
  type GameRequest,
} from '../../../../app/board-game-rules/admin/lib/gameRequests'

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req-1',
    photo_paths: ['req-1/0.jpg'],
    intro_photo_paths: [],
    name: 'カタン',
    min_players: 3,
    max_players: 4,
    min_minutes: 60,
    max_minutes: 90,
    genres: ['対戦'],
    min_age: null,
    difficulty: null,
    publisher: null,
    author: null,
    has_japanese_rules: null,
    awards: null,
    release_year: null,
    created_at: '2026-08-01T00:00:00.000Z',
    processed_at: null,
    status: 'pending',
    draft_content: null,
    revision_note: null,
    revision_round: 0,
    revision_history: [],
    error_message: null,
    published_game_id: null,
    ...overrides,
  }
}

// 下書き(GameRegistrationInput同形)の最小データ
function makeDraft(overrides: Record<string, unknown> = {}) {
  return {
    name: 'カタン',
    minPlayers: 3,
    maxPlayers: 4,
    minMinutes: 60,
    maxMinutes: 90,
    genres: ['対戦'],
    rulesSimple: 'かんたんなルール',
    rulesDetailed: [{ key: 'overview', body: '概要' }],
    ...overrides,
  }
}

// publishDraftへ渡すGameRequest(camelCase)を組み立てる
function makeGameRequest(overrides: Partial<GameRequest> = {}): GameRequest {
  return {
    id: 'req-1',
    photoPaths: ['upload-uuid/0.jpg'],
    introPhotoPaths: ['intro-uuid/0.jpg'],
    name: 'カタン',
    minPlayers: 3,
    maxPlayers: 4,
    minMinutes: 60,
    maxMinutes: 90,
    genres: ['対戦'],
    minAge: null,
    difficulty: null,
    publisher: null,
    author: null,
    hasJapaneseRules: null,
    awards: null,
    releaseYear: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    processedAt: null,
    status: 'draft',
    draftContent: makeDraft(),
    revisionNote: null,
    revisionRound: 1,
    revisionHistory: [],
    errorMessage: null,
    publishedGameId: null,
    ...overrides,
  }
}

beforeEach(() => {
  fromMock.mockClear()
  selectMock.mockClear()
  orderMock.mockClear()
  order2Mock.mockReset().mockResolvedValue({ data: [], error: null })
  updateMock.mockClear()
  updateEqMock.mockReset().mockResolvedValue({ data: null, error: null })
  deleteMock.mockClear()
  deleteEqMock.mockReset().mockResolvedValue({ data: null, error: null })
  insertMock.mockClear()
  insertSelectMock.mockClear()
  insertSingleMock.mockReset().mockResolvedValue({ data: { id: 'game-1' }, error: null })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録依頼の確認-8、specs/board-game-rules/admin/design.md#登録依頼を確認する処理
describe('【管理画面】登録依頼一覧を取得する - 未処理を優先し、次いで新しい順に並べる', () => {
  it('未処理優先(processed_atがNULL優先)・次いで新しい順で取得すること', async () => {
    await fetchGameRequests()

    expect(fromMock).toHaveBeenCalledWith('board_game_rules_game_requests')
    expect(orderMock).toHaveBeenCalledWith('processed_at', { ascending: true, nullsFirst: true })
    expect(order2Mock).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('取得した行がcamelCaseに変換されて返ること', async () => {
    order2Mock.mockResolvedValue({ data: [makeRow()], error: null })

    const requests = await fetchGameRequests()

    expect(requests).toEqual([
      {
        id: 'req-1',
        photoPaths: ['req-1/0.jpg'],
        introPhotoPaths: [],
        name: 'カタン',
        minPlayers: 3,
        maxPlayers: 4,
        minMinutes: 60,
        maxMinutes: 90,
        genres: ['対戦'],
        minAge: null,
        difficulty: null,
        publisher: null,
        author: null,
        hasJapaneseRules: null,
        awards: null,
        releaseYear: null,
        createdAt: '2026-08-01T00:00:00.000Z',
        processedAt: null,
        status: 'pending',
        draftContent: null,
        revisionNote: null,
        revisionRound: 0,
        revisionHistory: [],
        errorMessage: null,
        publishedGameId: null,
      },
    ])
  })

  it('取得に失敗した場合、例外を投げて呼び出し元(画面)でエラー表示できるようにすること', async () => {
    order2Mock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    await expect(fetchGameRequests()).rejects.toThrow()
  })

  it('ゲーム紹介画像の並び順配列(intro_photo_paths)がintroPhotoPathsとして引き継がれること', async () => {
    order2Mock.mockResolvedValue({
      data: [makeRow({ intro_photo_paths: ['req-1/0.jpg', 'req-1/1.jpg'] })],
      error: null,
    })

    const requests = await fetchGameRequests()

    expect(requests[0].introPhotoPaths).toEqual(['req-1/0.jpg', 'req-1/1.jpg'])
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録依頼の確認-22、specs/board-game-rules/admin/design.md#登録依頼を処理済みにする処理 / 削除する処理
describe('【管理画面】登録依頼を処理済みにする', () => {
  it('processed_atに現在時刻をセットするUPDATEが実行されtrueが返ること', async () => {
    const result = await markGameRequestProcessed('req-1')

    expect(result).toBe(true)
    expect(fromMock).toHaveBeenCalledWith('board_game_rules_game_requests')
    const arg = updateMock.mock.calls[0][0] as { processed_at: string }
    expect(typeof arg.processed_at).toBe('string')
    expect(updateEqMock).toHaveBeenCalledWith('id', 'req-1')
  })

  it('UPDATEに失敗した場合、falseが返ること', async () => {
    updateEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const result = await markGameRequestProcessed('req-1')

    expect(result).toBe(false)
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録実行・下書きレビュー-16、specs/board-game-rules/admin/requirements.md#登録実行・下書きレビュー-21、specs/board-game-rules/admin/requirements.md#登録実行のローカル処理起動-9、specs/board-game-rules/admin/requirements.md#登録実行のローカル処理起動-10、specs/board-game-rules/admin/design.md#登録実行・下書きレビューの処理
describe('【管理画面】「登録実行」でローカル処理の起動を待つ状態(queued)にする', () => {
  it('未着手(pending)の依頼で登録実行すると、statusをqueuedにするUPDATEだけが行われること(写真解析はローカルで走る)', async () => {
    const result = await triggerRegistration('req-1', 'pending')

    expect(result.ok).toBe(true)
    expect(fromMock).toHaveBeenCalledWith('board_game_rules_game_requests')
    expect(updateMock).toHaveBeenCalledWith({ status: 'queued' })
    expect(updateEqMock).toHaveBeenCalledWith('id', 'req-1')
  })

  it('失敗(failed)の依頼で登録実行を再度押すと、再試行としてstatusをqueuedに戻すこと', async () => {
    const result = await triggerRegistration('req-1', 'failed')

    expect(result.ok).toBe(true)
    expect(updateMock).toHaveBeenCalledWith({ status: 'queued' })
  })

  it('処理中(running)など pending/failed 以外の状態からは登録実行できず、UPDATEを行わないこと', async () => {
    const result = await triggerRegistration('req-1', 'running')

    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('公開済み(published)の依頼からは登録実行できないこと', async () => {
    const result = await triggerRegistration('req-1', 'published')

    expect(result.ok).toBe(false)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('UPDATEに失敗した場合、失敗が分かる結果を返すこと', async () => {
    updateEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const result = await triggerRegistration('req-1', 'pending')

    expect(result.ok).toBe(false)
    expect(result.error).toContain('permission denied')
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録実行・下書きレビュー-19、specs/board-game-rules/admin/requirements.md#登録実行のローカル処理起動-12、specs/board-game-rules/admin/design.md#登録実行・下書きレビューの処理
describe('【管理画面】「再調整を依頼」で要望を残してローカル再生成の起動待ちにする', () => {
  it('下書きあり(draft)の依頼で要望を送信すると、revision_noteに要望・statusをqueuedにするUPDATEが行われ、draft_contentは触らないこと', async () => {
    const result = await requestRevision('req-1', 'プレイ時間の表記を直して', 'draft')

    expect(result.ok).toBe(true)
    expect(updateMock).toHaveBeenCalledWith({
      revision_note: 'プレイ時間の表記を直して',
      status: 'queued',
    })
    // draft_content・revision_round・revision_history はここでは更新しない(ローカル処理が完了後に更新する)
    expect(updateMock.mock.calls[0][0]).not.toHaveProperty('draft_content')
    expect(updateMock.mock.calls[0][0]).not.toHaveProperty('revision_history')
    expect(updateEqMock).toHaveBeenCalledWith('id', 'req-1')
  })

  it('下書きがない状態(pending等)からは再調整を依頼できず、UPDATEを行わないこと', async () => {
    const result = await requestRevision('req-1', 'なおして', 'pending')

    expect(result.ok).toBe(false)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('UPDATEに失敗した場合、失敗が分かる結果を返すこと', async () => {
    updateEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const result = await requestRevision('req-1', 'なおして', 'draft')

    expect(result.ok).toBe(false)
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録実行・下書きレビュー-19、specs/board-game-rules/admin/requirements.md#登録実行のローカル処理起動-11、specs/board-game-rules/admin/design.md#登録実行・下書きレビューの処理
describe('【管理画面】「公開する」で下書き内容をゲームとして登録し依頼を公開済みにする', () => {
  it('下書きの分類情報・ルール本文に、依頼行の元写真パス・紹介画像パスを合わせてゲームをINSERTすること', async () => {
    await publishDraft(makeGameRequest())

    expect(fromMock).toHaveBeenCalledWith('board_game_rules_games')
    const insertArg = insertMock.mock.calls[0][0] as Record<string, unknown>
    expect(insertArg.name).toBe('カタン')
    expect(insertArg.rules_simple).toBe('かんたんなルール')
    expect(insertArg.rules_detailed).toEqual([{ key: 'overview', body: '概要' }])
    // draft_contentにはphoto_paths・intro_photo_pathsが含まれないため、依頼行の値を合わせる
    expect(insertArg.photo_paths).toEqual(['upload-uuid/0.jpg'])
    expect(insertArg.intro_photo_paths).toEqual(['intro-uuid/0.jpg'])
  })

  it('INSERT成功後、まずpublished_game_idだけを単独UPDATEで永続化し、続けてprocessed_at・status=publishedをUPDATEすること', async () => {
    const result = await publishDraft(makeGameRequest())

    expect(result.ok).toBe(true)
    expect(fromMock).toHaveBeenCalledWith('board_game_rules_game_requests')
    // 1回目: published_game_id のみを先に永続化(後段UPDATE失敗時の重複INSERT防止の判定材料を残す)
    expect(updateMock.mock.calls[0][0]).toEqual({ published_game_id: 'game-1' })
    // 2回目: 依頼を公開済みにする
    const finalArg = updateMock.mock.calls[1][0] as Record<string, unknown>
    expect(typeof finalArg.processed_at).toBe('string')
    expect(finalArg.status).toBe('published')
    expect(updateEqMock).toHaveBeenCalledWith('id', 'req-1')
  })

  it('ゲームのINSERTに失敗した場合、依頼のUPDATEを行わず失敗を返すこと', async () => {
    insertSingleMock.mockResolvedValue({ data: null, error: { message: 'insert failed' } })

    const result = await publishDraft(makeGameRequest())

    expect(result.ok).toBe(false)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('簡単版ルールの文字数上限CHECK違反のときは、どの項目が長すぎるかが分かる文言を返すこと', async () => {
    insertSingleMock.mockResolvedValue({
      data: null,
      error: { message: 'new row violates check constraint "board_game_rules_games_rules_simple_check"' },
    })

    const result = await publishDraft(makeGameRequest())

    expect(result.ok).toBe(false)
    expect(result.error).toContain('簡単版ルール')
  })

  it('依頼にpublished_game_idが既にある(INSERT後のUPDATEが失敗して再度押された)場合、再INSERTせず後段UPDATEのみを冪等に再実行すること', async () => {
    const result = await publishDraft(makeGameRequest({ publishedGameId: 'game-1' }))

    expect(result.ok).toBe(true)
    expect(insertMock).not.toHaveBeenCalled()
    // published_game_id は既に永続化済みなので単独UPDATEはスキップし、公開済み化UPDATEのみ実行する
    expect(updateMock).toHaveBeenCalledTimes(1)
    const updateArg = updateMock.mock.calls[0][0] as Record<string, unknown>
    expect(updateArg.published_game_id).toBe('game-1')
    expect(updateArg.status).toBe('published')
  })

  it('後段の依頼UPDATEに失敗した場合、失敗を返すこと(次回押下時に冪等再実行できる)', async () => {
    updateEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const result = await publishDraft(makeGameRequest())

    expect(result.ok).toBe(false)
  })

  it('INSERT成功 → published_game_id永続化成功 → 後段UPDATE失敗 のあと、再押下では再INSERTせず後段UPDATEのみ実行して公開済みにできること', async () => {
    // 1回目: published_game_id の永続化は成功、続く公開済み化UPDATEが失敗
    updateEqMock
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } })

    const first = await publishDraft(makeGameRequest())

    expect(first.ok).toBe(false)
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(updateMock.mock.calls[0][0]).toEqual({ published_game_id: 'game-1' })

    insertMock.mockClear()
    updateMock.mockClear()
    updateEqMock.mockReset().mockResolvedValue({ data: null, error: null })

    // 2回目: 依頼行に published_game_id が設定された状態で再押下(DB永続化されている前提)
    const second = await publishDraft(makeGameRequest({ publishedGameId: 'game-1' }))

    expect(second.ok).toBe(true)
    expect(insertMock).not.toHaveBeenCalled()
    expect(updateMock).toHaveBeenCalledTimes(1)
    const finalArg = updateMock.mock.calls[0][0] as Record<string, unknown>
    expect(finalArg.status).toBe('published')
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録依頼の確認-10
describe('【管理画面】不要な登録依頼を削除する', () => {
  it('対象依頼のDELETEが実行されtrueが返ること', async () => {
    const result = await deleteGameRequest('req-1')

    expect(result).toBe(true)
    expect(deleteEqMock).toHaveBeenCalledWith('id', 'req-1')
  })

  it('DELETEに失敗した場合、falseが返ること', async () => {
    deleteEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const result = await deleteGameRequest('req-1')

    expect(result).toBe(false)
  })
})
