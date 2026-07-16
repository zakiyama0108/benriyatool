#!/bin/bash
# SessionStartフック: origin/mainをfetchし、ローカルmainが遅れていたら警告をコンテキストに注入する。
# 別セッション・別worktreeでマージされた成果物に気づかず、古いローカル状態を前提に
# 重複作業を始めるのを防ぐ(発端: specs/ikukyu/admin の設計を2セッションで二重実施した事例)。
# ネットワーク不通・低速時はセッション開始を妨げないよう、fetchが終わらなければ静かに諦める。

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

# テスト用に比較対象を差し替えられるようにする(通常は main と origin/main)
local_ref="${FRESHNESS_LOCAL_REF:-main}"
remote_ref="${FRESHNESS_REMOTE_REF:-origin/main}"

# fetchをバックグラウンド実行し、最大8秒で見切る(macOSにはtimeoutコマンドが無いため自前で待つ)
git fetch origin main --quiet 2>/dev/null &
fetch_pid=$!
for _ in $(seq 1 16); do
  kill -0 "$fetch_pid" 2>/dev/null || break
  sleep 0.5
done
if kill -0 "$fetch_pid" 2>/dev/null; then
  kill "$fetch_pid" 2>/dev/null
  exit 0 # fetch未完了の時は判定しない(古い情報にもとづく誤警告を避ける)
fi
wait "$fetch_pid" 2>/dev/null

behind=$(git rev-list --count "${local_ref}..${remote_ref}" 2>/dev/null)
if [ -z "$behind" ] || [ "$behind" -eq 0 ]; then
  exit 0
fi

recent=$(git log --oneline -5 "${local_ref}..${remote_ref}" 2>/dev/null)

context=$(cat <<EOF
【mainの鮮度警告】ローカルmainはorigin/mainより ${behind} コミット遅れています。未取り込みのコミット(最新5件):
${recent}
別セッションでマージされた作業と重複しないよう、工程Skill(要件定義・設計・実装・修正)に着手する前に main を最新化し(git pull)、これから行う作業が上記コミットで既に対応済みでないか確認すること。
EOF
)

jq -n --arg ctx "$context" '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}'
