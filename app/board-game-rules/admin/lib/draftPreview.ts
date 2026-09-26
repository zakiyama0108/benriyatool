import { GENRES, type Genre } from '../../lib/genres'
import type { Game, RuleChapter } from '../../lib/games'
import type { GameDraftContent, GameRequest } from './gameRequests'

// 下書き(draft_content)の公開前検証と、詳細画面と同じ形へのプレビュー変換。
// どちらも Supabase に触れない純粋関数なので、DBクライアントを読み込む gameRequests.ts とは分け、
// 表示コンポーネント(DraftReviewCard)から直接使えるようにする(GameDraftContent 等の型のみ type import する)。

// GENRESのvalueの集合(公開前検証で「固定リスト外のジャンル」を弾くための照合用)
const ALLOWED_GENRE_VALUES = new Set<string>(GENRES.map((g) => g.value))

// 下書き(draft_content)を公開する前に、games テーブルのCHECK制約・ジャンル固定リストに
// 引っかかる箇所がないかを検証し、運営者向けの日本語の問題点リストを返す(問題なしなら空配列)。
// 対応人数・プレイ時間は根拠(写真・Web検索)が得られた場合のみ埋める方針のため未登録(NULL)を許容し
// (games テーブルのNOT NULL制約は撤廃済み。仕様: admin/requirements.md#登録実行のローカル処理起動-13)、
// 値が入っている場合だけ「壊れた数値ではないか」を検証する。ジャンルが固定リスト外の場合
// ("パーティ"・"運要素"など)は、そのままINSERTすると制約違反で失敗して原因が画面から分からないため、
// 公開前に軽く検証する(仕様: admin/requirements.md#登録実行・下書きレビュー-19、admin/design.md「エラーハンドリング」)。
export function validateDraftForPublish(draft: GameDraftContent): string[] {
  const problems: string[] = []
  // claude -p が genres キーごと省略することがある(parseDraft は name/rulesSimple/rulesDetailed のみ
  // 存在チェックする)。undefined のまま .length/.filter すると描画・公開処理が例外化するため空配列に倒す
  const genres = Array.isArray(draft.genres) ? draft.genres : []

  if (!draft.name || draft.name.trim() === '') {
    problems.push('ゲーム名が入力されていません')
  }

  // 対応人数・プレイ時間は未登録(null/undefined)を許容する。値がある場合のみ、
  // 1以上の整数になっているか(0以下・小数など壊れた値でないか)を検証する
  const numericFields: { value: number | null | undefined; label: string }[] = [
    { value: draft.minPlayers, label: '対応人数(下限)' },
    { value: draft.maxPlayers, label: '対応人数(上限)' },
    { value: draft.minMinutes, label: 'プレイ時間(下限)' },
    { value: draft.maxMinutes, label: 'プレイ時間(上限)' },
  ]
  for (const { value, label } of numericFields) {
    if (value != null && (!Number.isInteger(value) || value <= 0)) {
      problems.push(`${label}は1以上の整数で指定してください`)
    }
  }

  // 両端が値を持つときだけ下限>上限を判定する(片方が未登録・壊れている場合は上の個別メッセージで足りる)
  if (
    Number.isInteger(draft.minPlayers) &&
    Number.isInteger(draft.maxPlayers) &&
    (draft.minPlayers as number) > (draft.maxPlayers as number)
  ) {
    problems.push('対応人数の下限が上限を上回っています')
  }
  if (
    Number.isInteger(draft.minMinutes) &&
    Number.isInteger(draft.maxMinutes) &&
    (draft.minMinutes as number) > (draft.maxMinutes as number)
  ) {
    problems.push('プレイ時間の下限が上限を上回っています')
  }

  // ジャンルは0個でも公開できる(DB側にも非空を求めるCHECKはない)。固定リスト外の値だけを弾く
  const invalidGenres = genres.filter((g) => !ALLOWED_GENRE_VALUES.has(g))
  if (invalidGenres.length > 0) {
    problems.push(`ジャンルに選べない値が含まれています: ${invalidGenres.join('、')}`)
  }

  // games テーブルの CHECK(char_length(rules_simple) <= 4000 / rules_detailed::text <= 40000)。
  // 下書き側には上限CHECKがないため公開時に初めて顕在化する。
  // JSON.stringify は Postgres の rules_detailed::text より空白ぶん短く出る(実DBより軽めの見積り)ため、
  // 上限ぎりぎりの下書きはここを通過して INSERT で落ちうるが、その場合も describePublishError が
  // 文字数超過の日本語を返す
  if (draft.rulesSimple.length > 4000) {
    problems.push(`簡単版ルールが文字数上限(4000字)を超えています(現在${draft.rulesSimple.length}字)`)
  }
  if (JSON.stringify(draft.rulesDetailed).length > 40000) {
    problems.push('詳しい版ルールが文字数上限(40000字)を超えています')
  }

  return problems
}

// 下書き(draft_content)を、公開後の詳細画面(game-detail)と同じ表示コンポーネント(GameInfo・RuleTabs)へ
// 渡せる Game 型へ組み立てる。id・作成日時・紹介画像は依頼行の値を、それ以外は下書きの値を使う
// (仕様: admin/design.md「登録実行・下書きレビューの処理」手順3。運営者が「訪問者にこう見える」を確認できるようにする)。
export function draftToPreviewGame(draft: GameDraftContent, request: GameRequest): Game {
  return {
    id: request.id,
    name: draft.name,
    minPlayers: draft.minPlayers ?? null,
    maxPlayers: draft.maxPlayers ?? null,
    minMinutes: draft.minMinutes ?? null,
    maxMinutes: draft.maxMinutes ?? null,
    // 検証前の値のため固定リスト外が混じりうるが、GameInfo は join するだけ・RuleTabs は RULE_CHAPTERS で
    // 絞り込むため描画は壊れない(問題は警告表示・補助表示で運営者に伝える)。undefined は空配列に倒す
    genres: (Array.isArray(draft.genres) ? draft.genres : []) as Genre[],
    minAge: draft.minAge ?? null,
    difficulty: draft.difficulty ?? null,
    publisher: draft.publisher ?? null,
    author: draft.author ?? null,
    hasJapaneseRules: draft.hasJapaneseRules ?? null,
    awards: draft.awards ?? null,
    releaseYear: draft.releaseYear ?? null,
    rulesSimple: draft.rulesSimple,
    rulesDetailed: draft.rulesDetailed as RuleChapter[],
    introPhotoPaths: request.introPhotoPaths,
    createdAt: request.createdAt,
  }
}
