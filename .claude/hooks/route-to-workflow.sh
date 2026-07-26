#!/bin/bash
# UserPromptSubmitフック: 開発作業らしいユーザー入力に「該当する工程Skillを
# 起動してから作業する」というルーティング指示をコンテキストとして注入する。
# どの工程かという厳密な分類はスクリプトの語彙マッチではなくメインスレッドの
# モデルに任せる(日本語の自由入力をスクリプトで分類するのは脆いため)。
# ここで行うのはコストの安い足切りのみ:
#   - 開発ワードを含む入力は判定をモデルに委ねて必ず注入する
#   - 含まない場合に、挨拶・雑談・単純な質問/調査依頼など明らかに非開発な
#     入力だけを注入対象から外し、それ以外(判断が曖昧な入力)はfail-openで注入する
# 注入文自体は要点のみとし、詳細は .claude/skills/README.md に委ねて重複を避ける。

prompt=$(jq -r '.prompt // empty')

# /で始まる入力はユーザーが工程Skillを明示的に選んでいるため注入しない
case "$prompt" in
  /*) exit 0 ;;
esac

# 開発作業を示す語彙があれば、足切りをスキップして必ず注入する(判定はモデルに委ねる)
dev_pattern='実装|修正|バグ|エラー|直し|直して|直す|追加|変更|更新|削除|消して|リファクタ|テスト|PR|プルリク|レビュー|指摘|デプロイ|リリース|仕様|要件|設計|コード|ファイル|関数|コンポーネント|機能|画面|UI|フック|Skill|API|コミット|ブランチ|マージ|開発|作って|作成|npm|git|ビルド'

if ! echo "$prompt" | grep -qE "$dev_pattern"; then
  # 挨拶・お礼などの雑談のみの短い入力
  chat_only_pattern='^(こんにちは|おはよう(ございます)?|こんばんは|お疲れ様(です)?|お疲れさまです|ありがとう(ございます)?|よろしく(お願いします)?|了解(です)?|OK|オーケー)[!!。、,.\ ]*$'
  # 単純な質問・調査依頼(「〜とは」「教えて」「調べて」など)
  question_pattern='とは(何|なに)?[??]?$|って(何|なに)[??]?$|について教えて|を教えて|教えてください|知りたい|ですか[??]?$|でしょうか[??]?$|調べて|調査して'

  if echo "$prompt" | grep -qE "$chat_only_pattern"; then
    exit 0
  fi
  if echo "$prompt" | grep -qE "$question_pattern"; then
    exit 0
  fi
fi

context='【ワークフロー・ルーティング】開発作業(機能追加・修正・仕様作成・レビュー・PR作成・リリース確認)なら、着手前に.claude/skills/README.mdの該当工程Skillを起動する(入口: 新機能→/requirement、バグ修正・小規模改修→/fix、方針の壁打ち→/consult)。詳細・前提条件はREADME.md参照。'

jq -n --arg ctx "$context" '{hookSpecificOutput: {hookEventName: "UserPromptSubmit", additionalContext: $ctx}}'
