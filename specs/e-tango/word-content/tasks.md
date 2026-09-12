> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## T1: ディストラクター選定ロジック
- 🔴 `__tests__/e-tango/lib/distractors.test.ts`: 同じ品詞の候補があればそれを優先して3件選ぶこと、品詞一致がない場合は他品詞から補うこと、自分自身を候補に含めないことを検証するテストを書く
- 🟢 `scripts/e-tango/lib/distractors.mjs`にディストラクター選定関数を実装する
- 🔵 選定基準(品詞一致優先)を関数内の定数・コメントとして明確化する

## T2: 単語データの型・読み込みモジュール
- 🔴 `__tests__/e-tango/lib/words.test.ts`: `data/e-tango/words.json`(テスト用の最小フィクスチャ)を読み込み、`Word`型の必須フィールドが揃っていることを検証するテストを書く
- 🟢 `app/e-tango/lib/words.ts`に`Word`型定義と`loadWords()`を実装する
- 🔵 型と実装を分離し、`study-session`/`home`/`srs-scheduling`から使いやすい形に整える

## T3: 辞書・頻度データからの土台作成バッチ
- 🔴 `scripts/e-tango/lib/dictSource.test.mjs`: パブリックドメイン辞書データ(テスト用フィクスチャ)から品詞・訳・発音記号を抽出できること、必須項目が欠けている見出し語は除外されることを検証するテストを書く
- 🟢 `scripts/e-tango/lib/dictSource.mjs`を実装する
- 🔵 除外理由のログ出力を整理する

## T4: AI生成呼び出しのラッパー(失敗時のスキップ処理)
- 🔴 `scripts/e-tango/lib/aiGenerate.test.mjs`: 生成APIが失敗した見出し語をスキップし、失敗一覧に積むこと、成功した語は下書きデータに反映されることを検証するテストを書く(APIはモック化する)
- 🟢 `scripts/e-tango/lib/aiGenerate.mjs`を実装する
- 🔵 リトライしない方針・失敗一覧の記録形式を整理する

## T5: バッチ本体の結合
- 🔴 `scripts/e-tango/generate-words.test.mjs`: 土台作成→AI生成→ディストラクター選定の一連の流れで下書きJSONと失敗一覧が出力されることを検証するテストを書く(依存モジュールはモック化)
- 🟢 `scripts/e-tango/generate-words.mjs`を実装する
- 🔵 運営者向けのログ出力(処理件数・成功/失敗数)を整理する
