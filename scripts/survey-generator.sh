#!/usr/bin/env bash
set -euo pipefail

# 毎日のアンケート設問を Claude で生成し、surveys テーブルに draft として貯める。
#
# 公開は cron（/api/cron/daily-survey）が draft を1問ずつ live に昇格させて行うので、
# このスクリプトは「在庫を切らさない」ことだけを担当する。
#
# ⚠ Supabase のキーをこのファイルに書かないこと。.env から読む。
#   （article-writer.sh / topic-research.sh は service_role JWT を直に持っており、
#    それが git 管理下にある。同じ穴を広げない）

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$HOME/Library/Logs/3dworkshop"
LOG_FILE="$LOG_DIR/survey-generator.log"
MAX_BUDGET_USD=3

# 在庫がこれを下回っていたら生成する
MIN_STOCK=7
# 1回に作る問数
GENERATE_COUNT=30

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# === 引数 ===
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --count=*) GENERATE_COUNT="${arg#--count=}" ;;
    *) echo "使い方: $0 [--force] [--count=N]" >&2; exit 2 ;;
  esac
done

# === 認証情報 ===
# ⚠ set -a で .env をまるごと環境に入れる。値に # やスペースを含む行があるので
#   grep で切り出さず、シェルに解釈させる
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$PROJECT_DIR/.env"
  set +a
fi

BASE="${NEXT_PUBLIC_SUPABASE_URL:-}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$BASE" ] || [ -z "$SERVICE_KEY" ]; then
  echo "ERROR: .env に NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です" >&2
  exit 1
fi

CLAUDE_BIN="$(command -v claude || true)"
if [ ! -x "$CLAUDE_BIN" ]; then
  echo "ERROR: claude CLI が見つかりません。" >&2
  exit 1
fi

api_get() {
  curl -fsS "${BASE}/rest/v1/$1" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}"
}

api_post() {
  curl -fsS -X POST "${BASE}/rest/v1/$1" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$2"
}

# === メイン ===
mkdir -p "$LOG_DIR"
log "=== survey-generator 開始 ==="

STOCK=$(api_get "surveys?status=eq.draft&publish_date=is.null&select=id" | jq 'length')
log "現在の在庫: ${STOCK}問（下限 ${MIN_STOCK}）"

if [ "$FORCE" -eq 0 ] && [ "$STOCK" -ge "$MIN_STOCK" ]; then
  log "在庫が足りているので生成しません。強制するには --force"
  exit 0
fi

# 既存の設問（重複を避けるため Claude に渡す）
EXISTING=$(api_get "surveys?select=question,slug&order=created_at.desc&limit=400" \
  | jq -r '.[] | "- \(.question)"')
EXISTING_COUNT=$(printf '%s' "$EXISTING" | grep -c '^-' || true)
log "既存の設問: ${EXISTING_COUNT}問（重複回避のため参照）"

# ワークショップのカテゴリ（related_category_slug に使う）
CATEGORIES=$(api_get "workshop_categories?select=slug,name&order=sort_order.asc" \
  | jq -r '.[] | "- \(.slug): \(.name)"')

PROMPT="3DLab（東京・湯島の3Dプリンター教室）が毎日1問ずつ配信している、2択アンケートの設問を ${GENERATE_COUNT} 問つくってください。

## 読み手
3Dプリンターに興味がある一般の人。所有者とは限らず、「気になっているけどまだ触ったことがない」層が中心です。

## 設問の条件
- 正解のあるクイズにしない。意見・好み・実態を聞くアンケートにすること
- 2つの選択肢は、どちらを選ぶ人もそれなりにいる拮抗した組み合わせにする。9対1になる設問はつまらない
- 専門知識がなくても答えられること。専門用語を使うなら選択肢の中で意味が分かるようにする
- 設問文は20文字前後、選択肢は12文字以内。スマホの通知と円グラフの凡例に収まる長さ
- 文体は「です・ます」。設問の末尾は「？」
- ${GENERATE_COUNT}問すべて別のテーマにする。用途・材料・費用・失敗談・購入検討・子どもの学び・仕事での活用・デザインの入手方法など、話題を散らすこと

## 出力形式
JSON配列だけを出力してください。説明文やコードフェンスは付けないこと。各要素は次の形です。

{
  \"slug\": \"英小文字とハイフンのみ、3〜5語、内容が分かるもの\",
  \"question\": \"設問文\",
  \"description\": \"設問の補足を1文（40文字程度）\",
  \"option_a\": \"選択肢A\",
  \"option_b\": \"選択肢B\",
  \"result_comment\": \"結果ページに出す解説を2文。どちらの回答も否定せず、3Dプリンターの知識が1つ増える内容にする\",
  \"related_category_slug\": \"下のカテゴリ一覧から最も関係が近いものの slug。該当が無ければ null\"
}

## slug の注意
- \"archive\" は使わない（ページのURLと衝突します）
- 下の既存の設問と内容が重ならないようにすること

## ワークショップのカテゴリ一覧
${CATEGORIES}

## 既存の設問（これらと重複させない）
${EXISTING}"

log "Claude CLI 実行開始（${GENERATE_COUNT}問）..."
RAW=$("$CLAUDE_BIN" --print --max-budget-usd "$MAX_BUDGET_USD" "$PROMPT" 2>&1) || {
  log "ERROR: Claude CLI が異常終了しました"
  echo "$RAW" > "$LOG_DIR/survey-generator-output.txt"
  exit 1
}
echo "$RAW" > "$LOG_DIR/survey-generator-output.txt"

# コードフェンスが付いてきても拾えるように、最初の [ から最後の ] までを取る
JSON=$(printf '%s' "$RAW" | sed -n '/\[/,/\]$/p')
if ! printf '%s' "$JSON" | jq -e 'type == "array" and length > 0' >/dev/null 2>&1; then
  log "ERROR: JSON配列として読めませんでした。$LOG_DIR/survey-generator-output.txt を確認してください"
  exit 1
fi

# 形式の検証。⚠ 1問でも欠けた行を入れると、公開当日に選択肢の無い設問が出る
VALID=$(printf '%s' "$JSON" | jq '[.[]
  | select(
      (.slug | type == "string") and (.slug | test("^[a-z0-9-]{3,60}$")) and .slug != "archive"
      and (.question | type == "string") and (.question | length > 0)
      and (.option_a | type == "string") and (.option_a | length > 0)
      and (.option_b | type == "string") and (.option_b | length > 0)
    )
  | {slug, question, description, option_a, option_b, result_comment, related_category_slug,
     status: "draft"}]')

VALID_COUNT=$(printf '%s' "$VALID" | jq 'length')
log "検証を通った設問: ${VALID_COUNT}問 / ${GENERATE_COUNT}問"

if [ "$VALID_COUNT" -eq 0 ]; then
  log "ERROR: 投入できる設問がありませんでした"
  exit 1
fi

# slug は UNIQUE。既存と衝突した行があると配列ごと弾かれるので、1問ずつ入れる。
# ⚠ まとめて POST しない。29問が正しくても1問の衝突で全部落ちる
INSERTED=0
SKIPPED=0
for i in $(seq 0 $((VALID_COUNT - 1))); do
  ROW=$(printf '%s' "$VALID" | jq -c ".[$i]")
  SLUG=$(printf '%s' "$ROW" | jq -r '.slug')
  if api_post "surveys" "$ROW" >/dev/null 2>&1; then
    INSERTED=$((INSERTED + 1))
  else
    SKIPPED=$((SKIPPED + 1))
    log "スキップ（slug 重複か検証エラー）: $SLUG"
  fi
done

log "投入: ${INSERTED}問 / スキップ: ${SKIPPED}問"
NEW_STOCK=$(api_get "surveys?status=eq.draft&publish_date=is.null&select=id" | jq 'length')
log "=== survey-generator 完了（在庫 ${NEW_STOCK}問） ==="
