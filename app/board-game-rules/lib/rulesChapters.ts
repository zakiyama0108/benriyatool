// 詳しい版ルール本文の共通章立て(仕様: game-registration/design.md「共通の章立て(詳しい版の構造)」、
// requirements.md#LLMによる解析・生成-5)。章キー(英語識別子)は将来の章単位の横断分析のためにDB側で
// 固定し、表示見出し(日本語)は画面側で対応づける。各章は空でもよい(該当ルールがないゲームがあるため)。
export const RULE_CHAPTERS = [
  { key: 'overview', heading: '概要' },
  { key: 'setup', heading: '準備' },
  { key: 'turn_flow', heading: '手番の流れ' },
  { key: 'victory', heading: '勝利条件' },
  { key: 'scoring', heading: '得点計算' },
  { key: 'special', heading: '特殊ルール・例外' },
] as const

// 章キーの型(overview/setup/turn_flow/victory/scoring/special)
export type ChapterKey = (typeof RULE_CHAPTERS)[number]['key']

// 章キーの一覧(生成・保存時に並べる順序の正)
export const CHAPTER_KEYS: ChapterKey[] = RULE_CHAPTERS.map((c) => c.key)

// 章キーから表示見出し(日本語)を引く。共通章立てにないキーは undefined(表示側で無視できる)
export function chapterHeading(key: string): string | undefined {
  return RULE_CHAPTERS.find((c) => c.key === key)?.heading
}
