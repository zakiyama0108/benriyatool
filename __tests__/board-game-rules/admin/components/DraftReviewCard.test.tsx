import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DraftReviewCard from '../../../../app/board-game-rules/admin/components/DraftReviewCard'
import type { GameRequest } from '../../../../app/board-game-rules/admin/lib/gameRequests'

function makeRequest(overrides: Partial<GameRequest> = {}): GameRequest {
  return {
    id: 'req-1',
    photoPaths: ['upload-uuid/0.jpg'],
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
    ...overrides,
  }
}

function makeDraftContent(overrides: Record<string, unknown> = {}) {
  return {
    name: 'カタンの開拓者たち',
    minPlayers: 3,
    maxPlayers: 4,
    minMinutes: 60,
    maxMinutes: 90,
    genres: ['戦略'],
    rulesSimple: '資源を集めて開拓地を広げ、10点を先取したプレイヤーの勝ち。',
    rulesDetailed: [{ key: 'overview', body: '概要' }],
    ...overrides,
  }
}

const okResult = { ok: true as const }

// 仕様: specs/board-game-rules/admin/requirements.md#登録実行・下書きレビュー-17、specs/board-game-rules/admin/design.md#登録実行・下書きレビューの処理
describe('【管理画面】登録依頼の状況表示 - statusごとに操作を出し分ける', () => {
  it('未着手(pending)のとき「登録実行」ボタンだけが出ること', () => {
    render(
      <DraftReviewCard
        request={makeRequest({ status: 'pending' })}
        onTrigger={vi.fn().mockResolvedValue(okResult)}
        onPublish={vi.fn()}
        onRequestRevision={vi.fn()}
      />
    )
    expect(screen.getByText('未着手')).toBeTruthy()
    expect(screen.getByRole('button', { name: '登録実行' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '公開する' })).toBeNull()
  })

  it('処理中(queued/running)のとき操作ボタンを出さず、進行中であることを示すこと', () => {
    render(
      <DraftReviewCard
        request={makeRequest({ status: 'running' })}
        onTrigger={vi.fn()}
        onPublish={vi.fn()}
        onRequestRevision={vi.fn()}
      />
    )
    expect(screen.getByText('処理中')).toBeTruthy()
    expect(screen.getByText(/処理中です/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: '登録実行' })).toBeNull()
    expect(screen.queryByRole('button', { name: '公開する' })).toBeNull()
  })

  it('下書きあり(draft)のとき下書き内容と「公開する」「再調整を依頼」が出ること', () => {
    render(
      <DraftReviewCard
        request={makeRequest({ status: 'draft', draftContent: makeDraftContent() })}
        onTrigger={vi.fn()}
        onPublish={vi.fn().mockResolvedValue(okResult)}
        onRequestRevision={vi.fn().mockResolvedValue(okResult)}
      />
    )
    expect(screen.getByText('下書きあり')).toBeTruthy()
    expect(screen.getByText('カタンの開拓者たち')).toBeTruthy()
    expect(screen.getByText(/資源を集めて開拓地を広げ/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '公開する' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '再調整を依頼' })).toBeTruthy()
  })

  it('公開済み(published)のとき操作ボタンを出さないこと', () => {
    render(
      <DraftReviewCard
        request={makeRequest({ status: 'published', publishedGameId: 'game-1' })}
        onTrigger={vi.fn()}
        onPublish={vi.fn()}
        onRequestRevision={vi.fn()}
      />
    )
    expect(screen.getByText('公開済み')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '登録実行' })).toBeNull()
    expect(screen.queryByRole('button', { name: '公開する' })).toBeNull()
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録実行・下書きレビュー-18
describe('【管理画面】下書きレビューで生成物を全文・分類情報つきで確認する', () => {
  it('簡単版ルールが200字を超えても省略されず全文表示されること', () => {
    // 公開前に生成物の質を判断できるよう、抜粋ではなく全文を見せる
    const longRules = 'このゲームでは' + 'あ'.repeat(300) + '勝利する。'
    render(
      <DraftReviewCard
        request={makeRequest({
          status: 'draft',
          draftContent: makeDraftContent({ rulesSimple: longRules }),
        })}
        onTrigger={vi.fn()}
        onPublish={vi.fn().mockResolvedValue(okResult)}
        onRequestRevision={vi.fn().mockResolvedValue(okResult)}
      />
    )
    expect(screen.getByText(longRules)).toBeTruthy()
    // 省略記号(…)で切られていないこと
    expect(screen.queryByText((content) => content.includes('…'))).toBeNull()
  })

  it('詳しい版タブでは本文のある章だけが見出し付きで表示され、本文が空の章は「未生成の章」として運営者に示されること', () => {
    // 公開後の詳細画面と同じ表示(RuleTabsは本文が空の章を出さない)をプレビューしつつ、
    // 運営者が未生成の章に気づけるよう補助表示を出す
    render(
      <DraftReviewCard
        request={makeRequest({
          status: 'draft',
          draftContent: makeDraftContent({
            rulesDetailed: [
              { key: 'overview', body: '2〜4人で資源を奪い合うゲーム。' },
              { key: 'setup', body: '' },
              { key: 'victory', body: '10点に最初に到達した人の勝ち。' },
            ],
          }),
        })}
        onTrigger={vi.fn()}
        onPublish={vi.fn().mockResolvedValue(okResult)}
        onRequestRevision={vi.fn().mockResolvedValue(okResult)}
      />
    )
    // 本文が空の章(準備・手番の流れ・得点計算・特殊ルール・例外)は「未生成の章」として列挙される
    const ungenerated = screen.getByText(/未生成の章:/)
    expect(ungenerated.textContent).toContain('準備')
    expect(ungenerated.textContent).toContain('特殊ルール・例外')

    // 詳しい版タブへ切り替えると、本文のある章だけが見出し付きで表示される
    fireEvent.click(screen.getByRole('button', { name: '詳しい版' }))
    expect(screen.getByText('概要')).toBeTruthy()
    expect(screen.getByText('2〜4人で資源を奪い合うゲーム。')).toBeTruthy()
    expect(screen.getByText('勝利条件')).toBeTruthy()
    expect(screen.getByText('10点に最初に到達した人の勝ち。')).toBeTruthy()
  })

  it('共通章立てにないキーは公開後の表示に出ないが「公開時に表示されない章キー」として運営者に示されること', () => {
    render(
      <DraftReviewCard
        request={makeRequest({
          status: 'draft',
          draftContent: makeDraftContent({
            rulesDetailed: [
              { key: 'overview', body: '概要の本文。' },
              { key: 'house_rule', body: '公式外の追加ルール。' },
            ],
          }),
        })}
        onTrigger={vi.fn()}
        onPublish={vi.fn().mockResolvedValue(okResult)}
        onRequestRevision={vi.fn().mockResolvedValue(okResult)}
      />
    )
    const unknownKeys = screen.getByText(/公開時に表示されない章キー:/)
    expect(unknownKeys.textContent).toContain('house_rule')

    // 詳しい版タブに切り替えても、共通章立てにないキーの本文は表示されない
    fireEvent.click(screen.getByRole('button', { name: '詳しい版' }))
    expect(screen.queryByText('公式外の追加ルール。')).toBeNull()
  })

  it('分類情報(対象年齢・難易度・出版社・作者・日本語ルール有無・受賞歴・発売年)のうち値があるものがチップ表示されること', () => {
    render(
      <DraftReviewCard
        request={makeRequest({
          status: 'draft',
          draftContent: makeDraftContent({
            minAge: 10,
            difficulty: '中級',
            publisher: 'コスモス',
            author: 'クラウス・トイバー',
            hasJapaneseRules: true,
            awards: 'ドイツ年間ゲーム大賞 1995',
            releaseYear: 1995,
          }),
        })}
        onTrigger={vi.fn()}
        onPublish={vi.fn().mockResolvedValue(okResult)}
        onRequestRevision={vi.fn().mockResolvedValue(okResult)}
      />
    )
    expect(screen.getByText('対象年齢')).toBeTruthy()
    expect(screen.getByText('10歳以上')).toBeTruthy()
    expect(screen.getByText('中級')).toBeTruthy()
    expect(screen.getByText('コスモス')).toBeTruthy()
    expect(screen.getByText('クラウス・トイバー')).toBeTruthy()
    expect(screen.getByText('あり')).toBeTruthy()
    expect(screen.getByText('ドイツ年間ゲーム大賞 1995')).toBeTruthy()
    expect(screen.getByText('1995年')).toBeTruthy()
  })

  it('日本語ルールがない場合は「日本語ルール」チップに「なし」と表示されること', () => {
    render(
      <DraftReviewCard
        request={makeRequest({
          status: 'draft',
          draftContent: makeDraftContent({ hasJapaneseRules: false }),
        })}
        onTrigger={vi.fn()}
        onPublish={vi.fn().mockResolvedValue(okResult)}
        onRequestRevision={vi.fn().mockResolvedValue(okResult)}
      />
    )
    expect(screen.getByText('日本語ルール')).toBeTruthy()
    expect(screen.getByText('なし')).toBeTruthy()
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録実行・下書きレビュー-19、specs/board-game-rules/admin/design.md#エラーハンドリング
describe('【管理画面】このまま公開すると失敗する下書きを、公開前に警告する', () => {
  it('ジャンルが固定リスト外・対応人数が未設定などの下書きは「このまま公開すると失敗します」と問題点が警告表示されること', () => {
    render(
      <DraftReviewCard
        request={makeRequest({
          status: 'draft',
          draftContent: makeDraftContent({ genres: ['パーティ'], minPlayers: 0 }),
        })}
        onTrigger={vi.fn()}
        onPublish={vi.fn().mockResolvedValue(okResult)}
        onRequestRevision={vi.fn().mockResolvedValue(okResult)}
      />
    )
    expect(screen.getByText('このまま公開すると失敗します')).toBeTruthy()
    expect(screen.getByText(/ジャンルに選べない値が含まれています/)).toBeTruthy()
    expect(screen.getByText(/対応人数\(下限\)は1以上の整数/)).toBeTruthy()
    // 警告は出しても「公開する」ボタンは無効化しない(押すとpublishDraftが具体的な失敗を返す)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '公開する' }).disabled).toBe(false)
  })

  it('妥当な下書きでは警告ボックスを出さないこと', () => {
    render(
      <DraftReviewCard
        request={makeRequest({ status: 'draft', draftContent: makeDraftContent() })}
        onTrigger={vi.fn()}
        onPublish={vi.fn().mockResolvedValue(okResult)}
        onRequestRevision={vi.fn().mockResolvedValue(okResult)}
      />
    )
    expect(screen.queryByText('このまま公開すると失敗します')).toBeNull()
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録実行・下書きレビュー-21、specs/board-game-rules/admin/design.md#登録実行・下書きレビューの処理
describe('【管理画面】失敗した登録処理の原因表示と再試行', () => {
  it('失敗(failed)のとき error_message が表示され、「登録実行」で再試行できること', () => {
    const onTrigger = vi.fn().mockResolvedValue(okResult)
    render(
      <DraftReviewCard
        request={makeRequest({ status: 'failed', errorMessage: '写真が読み取れませんでした' })}
        onTrigger={onTrigger}
        onPublish={vi.fn()}
        onRequestRevision={vi.fn()}
      />
    )
    expect(screen.getByText(/写真が読み取れませんでした/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '登録実行' }))
    expect(onTrigger).toHaveBeenCalledWith('req-1', 'failed')
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録実行・下書きレビュー-16、specs/board-game-rules/admin/requirements.md#登録実行・下書きレビュー-19、specs/board-game-rules/admin/requirements.md#登録実行のローカル処理起動-9、specs/board-game-rules/admin/requirements.md#登録実行のローカル処理起動-10、specs/board-game-rules/admin/requirements.md#登録実行のローカル処理起動-11
describe('【管理画面】登録実行・公開・再調整の操作がT2bの関数を呼ぶ', () => {
  it('「登録実行」を押すと onTrigger が対象依頼ID・現在のstatusとともに呼ばれること', () => {
    const onTrigger = vi.fn().mockResolvedValue(okResult)
    render(
      <DraftReviewCard
        request={makeRequest({ status: 'pending' })}
        onTrigger={onTrigger}
        onPublish={vi.fn()}
        onRequestRevision={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '登録実行' }))
    expect(onTrigger).toHaveBeenCalledWith('req-1', 'pending')
  })

  it('「公開する」を押すと onPublish が対象依頼とともに呼ばれること', () => {
    const onPublish = vi.fn().mockResolvedValue(okResult)
    const request = makeRequest({ status: 'draft', draftContent: makeDraftContent() })
    render(
      <DraftReviewCard
        request={request}
        onTrigger={vi.fn()}
        onPublish={onPublish}
        onRequestRevision={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '公開する' }))
    expect(onPublish).toHaveBeenCalledWith(request)
  })

  it('「登録実行」の処理中は二重押下できないこと', async () => {
    let resolveFn: (v: { ok: true }) => void = () => {}
    const onTrigger = vi.fn(() => new Promise<{ ok: true }>((r) => (resolveFn = r)))
    render(
      <DraftReviewCard
        request={makeRequest({ status: 'pending' })}
        onTrigger={onTrigger}
        onPublish={vi.fn()}
        onRequestRevision={vi.fn()}
      />
    )
    const button = screen.getByRole('button', { name: '登録実行' })
    fireEvent.click(button)
    expect((button as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(button)
    expect(onTrigger).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolveFn({ ok: true })
      await Promise.resolve()
    })
  })

  it('公開が文字数上限違反などで失敗したとき、失敗内容が表示されること', async () => {
    const onPublish = vi
      .fn()
      .mockResolvedValue({ ok: false, error: '簡単版ルールが文字数上限(4000字)を超えています。' })
    render(
      <DraftReviewCard
        request={makeRequest({ status: 'draft', draftContent: makeDraftContent() })}
        onTrigger={vi.fn()}
        onPublish={onPublish}
        onRequestRevision={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '公開する' }))
    await waitFor(() => expect(screen.getByText(/簡単版ルールが文字数上限/)).toBeTruthy())
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録実行・下書きレビュー-19、specs/board-game-rules/admin/requirements.md#登録実行のローカル処理起動-12
describe('【管理画面】下書きの再調整を要望テキストとともに依頼する', () => {
  it('要望を入力して「再調整を依頼」を押すと onRequestRevision が要望テキスト・現在のstatusとともに呼ばれること', async () => {
    const onRequestRevision = vi.fn().mockResolvedValue(okResult)
    render(
      <DraftReviewCard
        request={makeRequest({ status: 'draft', draftContent: makeDraftContent() })}
        onTrigger={vi.fn()}
        onPublish={vi.fn()}
        onRequestRevision={onRequestRevision}
      />
    )
    fireEvent.change(screen.getByLabelText('直してほしい点(再調整の要望)'), {
      target: { value: 'プレイ時間を短めに直して' },
    })
    fireEvent.click(screen.getByRole('button', { name: '再調整を依頼' }))
    await waitFor(() =>
      expect(onRequestRevision).toHaveBeenCalledWith('req-1', 'プレイ時間を短めに直して', 'draft')
    )
  })

  it('要望が空のときは「再調整を依頼」を押せないこと', () => {
    const onRequestRevision = vi.fn()
    render(
      <DraftReviewCard
        request={makeRequest({ status: 'draft', draftContent: makeDraftContent() })}
        onTrigger={vi.fn()}
        onPublish={vi.fn()}
        onRequestRevision={onRequestRevision}
      />
    )
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '再調整を依頼' }).disabled).toBe(true)
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録実行・下書きレビュー-20、specs/board-game-rules/admin/design.md#登録実行・下書きレビューの処理
describe('【管理画面】再調整の要望履歴を新しい順に表示する', () => {
  it('revision_history が round の新しい順で並ぶこと', () => {
    render(
      <DraftReviewCard
        request={makeRequest({
          status: 'draft',
          draftContent: makeDraftContent(),
          revisionRound: 3,
          revisionHistory: [
            { round: 1, note: null, created_at: '2026-08-01T00:00:00.000Z' },
            { round: 2, note: 'ジャンルを直して', created_at: '2026-08-02T00:00:00.000Z' },
            { round: 3, note: '人数の表記を直して', created_at: '2026-08-03T00:00:00.000Z' },
          ],
        })}
        onTrigger={vi.fn()}
        onPublish={vi.fn()}
        onRequestRevision={vi.fn()}
      />
    )
    const items = screen.getAllByRole('listitem').map((el) => el.textContent ?? '')
    expect(items[0]).toContain('3回目')
    expect(items[0]).toContain('人数の表記を直して')
    expect(items[1]).toContain('2回目')
    expect(items[2]).toContain('1回目')
    expect(items[2]).toContain('初回生成')
  })
})
