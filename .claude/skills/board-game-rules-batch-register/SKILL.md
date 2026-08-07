---
name: board-game-rules-batch-register
description: ボードゲームのルールブック写真(ローカルフォルダ、または利用者からの登録依頼)を解析し、ゲーム情報・ルール本文を生成してSupabaseへ登録するときに使う。実データの公開書き込みを伴うため自律起動しない。
disable-model-invocation: true
---

> ワークフロー上の位置: ユーティリティSkill(開発フローから独立)。運営者が「ボードゲームを登録して」「登録依頼を処理して」と明示的に依頼したときに使う。対象アプリの仕様は[specs/board-game-rules/admin/design.md](../../../specs/board-game-rules/admin/design.md)「登録依頼からゲームを登録するローカルツール」を参照

# 前提

- このSkillは`board_game_rules_games`への実INSERT(即座に一般公開される)と、依頼由来の場合は`board_game_rules_game_requests.processed_at`のUPDATEを行う。取り消しは運営者が[管理画面](../../../specs/board-game-rules/admin/design.md)から個別に削除・編集する必要があるため、**Step4の書き込み前に必ずユーザーの明示的な確認を取る**
- 書き込みは`scripts/board-game-rules/registerGame.ts`が`SUPABASE_SERVICE_ROLE_KEY`(RLSをバイパスするservice_role鍵)で行う。この値はユーザーが把握しているものとし、Claudeが値を推測・生成しない。未設定なら、ここでユーザーに確認して設定してもらう
- 初回のみ `cd scripts/board-game-rules && npm install` が必要
- ルール本文の生成は[game-registration/requirements.md#ルール本文の著作権への配慮](../../../specs/board-game-rules/game-registration/requirements.md)に従う: 説明書原文の言い回しをそのまま転載せず独自の言い回しで再構成する。ただし「詳しい版」は数値・勝利条件・例外処理などルールの実質的な内容を一切省略・改変しない精密な言い換えとする(意訳・大意のみの要約にしない)

# Step1 入力元を確認する

ユーザーの依頼から、次のどちらかを特定する。曖昧な場合はユーザーに確認する。

- **ローカル写真フォルダ**: ユーザーが指定したフォルダパス(表紙・目次・各ページなどの写真が入っている)
- **登録依頼**: `board_game_rules_game_requests`の未処理(`processed_at is null`)の依頼から選ぶ。一覧は運営者が[管理画面](https://benriyatool.com/board-game-rules/admin)で確認済みの前提だが、依頼IDが分からない場合はSupabaseダッシュボードのTable Editorで確認してもらう

# Step2 写真を解析してゲーム情報・ルール本文を生成する

- 対象フォルダ内の写真、または依頼に添付された写真(登録依頼由来の場合は運営者に元写真を管理画面からダウンロードしてローカルに用意してもらう。このSkill自身はService Roleでの写真ダウンロードを行わない)をReadツールで読み込み、内容を解析する
- 次を判断・生成する(すべて[game-registration/design.md](../../../specs/board-game-rules/game-registration/design.md)「ジャンルの選択肢」「共通の章立て」に従う):
  - 分類情報: ゲーム名、対応人数(下限・上限)、プレイ時間(下限・上限)、ジャンル(`app/board-game-rules/lib/genres.ts`の固定リストから、依頼側の選択を鵜呑みにせず写真の内容から当てはまるものを判断)、対象年齢、難易度、メーカー/出版社、作者、言語依存度、受賞歴、発売年(不明な項目はnull/省略でよい)
  - ルール本文・簡単版(`rulesSimple`): 4000字以内
  - ルール本文・詳しい版(`rulesDetailed`): `app/board-game-rules/lib/rulesChapters.ts`の共通章立て(overview/setup/turn_flow/victory/scoring/special)ごとに本文を作る(該当ルールがない章は空文字でよい)。合計40000字以内(jsonb化した全体の文字数)
- 対応人数・プレイ時間は下限≤上限で判断する(下限>上限はDBのCHECK制約で拒否される)

# Step3 入力JSONを組み立てる

`GameRegistrationInput`形式(`scripts/board-game-rules/registerGame.ts`参照)でJSONファイルを作成する(例: `/tmp/board-game-rules-register.json`。scratchpadディレクトリがあればそちらを使う)。

```json
{
  "requestId": "登録依頼由来の場合のみ、依頼のUUID",
  "photosDir": "ローカル写真フォルダの場合のみ、そのパス",
  "name": "ゲーム名",
  "minPlayers": 2,
  "maxPlayers": 4,
  "minMinutes": 30,
  "maxMinutes": 60,
  "genres": ["対戦", "戦略"],
  "minAge": 8,
  "difficulty": "中級",
  "publisher": "出版社名",
  "author": "作者名",
  "hasJapaneseRules": true,
  "awards": "受賞歴",
  "releaseYear": 2020,
  "rulesSimple": "簡単版ルール本文",
  "rulesDetailed": [
    { "key": "overview", "body": "概要の本文" },
    { "key": "setup", "body": "準備の本文" },
    { "key": "turn_flow", "body": "手番の流れの本文" },
    { "key": "victory", "body": "勝利条件の本文" },
    { "key": "scoring", "body": "得点計算の本文" },
    { "key": "special", "body": "特殊ルール・例外の本文" }
  ]
}
```

`requestId`と`photosDir`はどちらか一方のみ指定する(両方省略するとスクリプトがエラーで終了する)。

# Step4 書き込み前に必ず確認する(取り消しづらい公開書き込みのため)

**このSkillの中核はここ。** `disable-model-invocation: true`は「会話の流れで勝手に起動しない」ためのゲートであり、Skill起動後の誤登録は別問題として防ぐ必要がある。`registerGame.ts`を実行する前に、必ず生成したJSONの要点をそのままユーザーに提示し、明示的な「OK」「登録して」等の肯定応答を得てから実行する。

```
以下の内容でボードゲームを登録します。よろしいですか?
ゲーム名: <name>
対応人数: <minPlayers>〜<maxPlayers>人 / プレイ時間: <minMinutes>〜<maxMinutes>分
ジャンル: <genres>
簡単版ルール(冒頭200字程度): <rulesSimple の抜粋>
写真の由来: <登録依頼(id: xxx) または ローカルフォルダ(path)>
```

曖昧な返答(既読無視・話題転換など)は肯定応答として扱わない。

# Step5 登録する

確認が取れたら実行する。

```bash
SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/board-game-rules/registerGame.ts /tmp/board-game-rules-register.json
```

- `NEXT_PUBLIC_SUPABASE_URL`は`.env.local`から自動で読み込まれる(dotenv)
- 成功時はターミナルに`登録しました: <ゲームID>`(依頼由来の場合はあわせて`登録依頼を処理済みにしました: <依頼ID>`)と出力される。これをユーザーに報告する
- 失敗時(DBのCHECK制約違反・写真アップロード失敗など)はエラーメッセージがそのまま出力されるので、内容を確認し原因(文字数超過・ジャンルが固定リスト外・下限>上限など)をユーザーに伝える

# 完了時の次ステップ案内

登録結果(成功/失敗、ゲームID)をユーザーに報告して完了。後続の工程Skillには接続しない(単発のデータ登録操作のため)。複数件まとめて処理する場合は、Step1〜Step5を依頼ごとに繰り返す。
