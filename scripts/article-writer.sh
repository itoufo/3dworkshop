#!/usr/bin/env bash
set -euo pipefail

# === 設定 ===
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$HOME/Library/Logs/3dworkshop"
LOG_FILE="$LOG_DIR/article-writer.log"
MAX_BUDGET_USD=5

# Supabase REST API
BASE="https://vvmrivgbofwktbhwyewy.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2bXJpdmdib2Z3a3RiaHd5ZXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5MjMwNiwiZXhwIjoyMDY5ODY4MzA2fQ.82khBYSyremx-u8DDaOB2xLOMHv3MLXgyamxgKfup8A"

# Claude CLI パス（PATH から自動検出）
CLAUDE_BIN="$(command -v claude || echo "$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node/" 2>/dev/null | tail -1)/bin/claude")"
if [ ! -x "$CLAUDE_BIN" ]; then
  echo "ERROR: claude CLI が見つかりません。" >&2
  exit 1
fi

# === ヘルパー関数 ===
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# REST API で GET
api_get() {
  curl -s "${BASE}/rest/v1/$1" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}"
}

# REST API で PATCH
api_patch() {
  local endpoint="$1"
  local data="$2"
  curl -s -X PATCH "${BASE}/rest/v1/${endpoint}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$data"
}

# UUID検証関数
is_valid_uuid() {
  [[ "$1" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]
}

# === 引数パース ===
# --type=standard|affiliate : 取得するキューのタイプを限定
TYPE_FILTER=""
for arg in "$@"; do
  case "$arg" in
    --type=*) TYPE_FILTER="${arg#--type=}" ;;
  esac
done

# === メイン処理 ===
mkdir -p "$LOG_DIR"
log "=== article-writer 開始 (type=${TYPE_FILTER:-any}) ==="

# キューから pending の最優先1件を取得
# --type 指定がある場合、そのタイプの pending のみ取得。なければスキップ（フォールバックしない）
if [ -n "$TYPE_FILTER" ]; then
  QUEUE_JSON=$(api_get "article_queue?status=eq.pending&article_type=eq.${TYPE_FILTER}&order=priority.desc,created_at.asc&limit=1")
else
  QUEUE_JSON=$(api_get "article_queue?status=eq.pending&order=priority.desc,created_at.asc&limit=1")
fi
QUEUE_ID=$(echo "$QUEUE_JSON" | jq -r '.[0].id // empty' 2>/dev/null || true)

if [ -z "$QUEUE_ID" ]; then
  log "キューに pending のアイテム(${TYPE_FILTER:-any})がありません。終了します。"
  exit 0
fi

QUEUE_TITLE=$(echo "$QUEUE_JSON" | jq -r '.[0].title // empty')
QUEUE_TOPIC=$(echo "$QUEUE_JSON" | jq -r '.[0].topic // empty')
QUEUE_BRIEF=$(echo "$QUEUE_JSON" | jq -r '.[0].brief // empty')
QUEUE_TYPE=$(echo "$QUEUE_JSON" | jq -r '.[0].article_type // "standard"')

log "キュー取得: id=$QUEUE_ID type=$QUEUE_TYPE title=$QUEUE_TITLE topic=$QUEUE_TOPIC"

if ! is_valid_uuid "$QUEUE_ID"; then
  log "ERROR: 不正なキューID: $QUEUE_ID"
  exit 1
fi

# ステータスを in_progress に更新
api_patch "article_queue?id=eq.${QUEUE_ID}" '{"status": "in_progress", "started_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}' > /dev/null
log "ステータスを in_progress に更新"

# trap: 異常終了時にステータスを failed に戻す
cleanup() {
  local exit_code=$?
  if [ $exit_code -ne 0 ] && [ -n "${QUEUE_ID:-}" ] && is_valid_uuid "$QUEUE_ID"; then
    api_patch "article_queue?id=eq.${QUEUE_ID}" '{"status": "failed"}' > /dev/null || true
    log "ERROR: 異常終了のためステータスを failed に更新"
  fi
}
trap cleanup EXIT

# プロンプト組み立て
TYPE_INSTRUCTION=""
if [ "$QUEUE_TYPE" = "affiliate" ]; then
  TYPE_INSTRUCTION="
【記事タイプ: アフィリエイト記事】
- SKILL.md の「アフィリエイト記事モード」セクションに従って執筆すること
- Amazon Associate タグ: 3dlab-22（リンクには必ず ?tag=3dlab-22 を付与）
- 比較表（<table>）必須、3〜5商品を紹介
- 各商品に rel=\"sponsored nofollow noopener\" + target=\"_blank\" を付与
- DB保存時に contains_affiliate: true を必ず指定
- 「Amazon.co.jp のアソシエイトとして、3DLab は適格販売により収入を得ています」を記事内のどこかに必ず含める
- ASIN取得は WebSearch + WebFetch で実商品を特定、不明な場合はキーワード検索URLで代替"
fi

PROMPT="以下のテーマで3DLabブログの記事を執筆してください。/article-writing スキルに従って執筆し、完成した記事をDBに保存してください。

重要:
- 記事の is_published は必ず true に設定してください
- 記事の published_at は現在時刻を ISO 8601 形式で設定してください
- 記事の category は必ず設定してください（SKILL.md のカテゴリ表を参照し、テーマに最も適切なものを選択）
- 記事の tags は関連キーワードを3〜5個の配列で設定してください
- 記事の author_name は '3DLab' に設定してください
- 記事保存後、サムネイル画像を生成して featured_image_url を設定してください（SKILLの手順に従う）
${TYPE_INSTRUCTION}

テーマ: $QUEUE_TOPIC
タイトル案: $QUEUE_TITLE"

if [ -n "$QUEUE_BRIEF" ] && [ "$QUEUE_BRIEF" != "null" ]; then
  PROMPT="$PROMPT
方向性: $QUEUE_BRIEF"
fi

PROMPT="$PROMPT

記事をDBに保存したら、最後に保存した記事のIDを以下の形式で出力してください:
ARTICLE_ID: <uuid>"

# Claude CLI 実行
log "Claude CLI 実行開始..."
cd "$PROJECT_DIR"

CLAUDE_OUTPUT=$("$CLAUDE_BIN" --print \
  --permission-mode bypassPermissions \
  --max-budget-usd "$MAX_BUDGET_USD" \
  "$PROMPT" 2>&1) || {
  log "ERROR: Claude CLI が異常終了しました"
  echo "$CLAUDE_OUTPUT" > "$LOG_DIR/claude-output-${QUEUE_ID}.txt"
  log "Claude 出力を $LOG_DIR/claude-output-${QUEUE_ID}.txt に保存"
  exit 1
}

log "Claude CLI 実行完了"

# Claude 出力をファイルに保存（デバッグ用）
echo "$CLAUDE_OUTPUT" > "$LOG_DIR/claude-output-${QUEUE_ID}.txt"

# 記事IDを抽出
ARTICLE_ID=$(echo "$CLAUDE_OUTPUT" | sed -n 's/.*ARTICLE_ID:[[:space:]]*\([0-9a-f-]\{36\}\).*/\1/p' | tail -1)

NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

if [ -n "$ARTICLE_ID" ] && is_valid_uuid "$ARTICLE_ID"; then
  log "記事ID取得: $ARTICLE_ID"
  api_patch "article_queue?id=eq.${QUEUE_ID}" '{"status": "completed", "completed_at": "'"$NOW"'", "article_id": "'"$ARTICLE_ID"'"}' > /dev/null
  log "ステータスを completed に更新"
else
  log "WARN: 記事IDを抽出できませんでした。出力: $LOG_DIR/claude-output-${QUEUE_ID}.txt"
  api_patch "article_queue?id=eq.${QUEUE_ID}" '{"status": "completed", "completed_at": "'"$NOW"'"}' > /dev/null
  log "ステータスを completed に更新（article_id なし）"
fi

# trap の cleanup が failed に戻さないよう正常終了
log "=== article-writer 完了 ==="
