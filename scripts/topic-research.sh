#!/usr/bin/env bash
set -euo pipefail

# === 設定 ===
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$HOME/Library/Logs/3dworkshop"
LOG_FILE="$LOG_DIR/topic-research.log"
MAX_BUDGET_USD=5

# Supabase REST API
BASE="https://vvmrivgbofwktbhwyewy.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2bXJpdmdib2Z3a3RiaHd5ZXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5MjMwNiwiZXhwIjoyMDY5ODY4MzA2fQ.82khBYSyremx-u8DDaOB2xLOMHv3MLXgyamxgKfup8A"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2bXJpdmdib2Z3a3RiaHd5ZXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyOTIzMDYsImV4cCI6MjA2OTg2ODMwNn0.qaygkp1eEYLnxGfqdrPZz6KAv7Yy4zfpqj7HOb98L8o"

# 環境変数読み込み
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env"
  set +a
fi

# X API ヘルパー読み込み
if [ -f "$SCRIPT_DIR/lib/x-api.sh" ]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/lib/x-api.sh"
fi

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
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}"
}

# REST API で POST
api_post() {
  local table="$1"
  local data="$2"
  curl -s -X POST "${BASE}/rest/v1/${table}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "$data"
}

# === メイン処理 ===
mkdir -p "$LOG_DIR"
log "=== topic-research 開始 ==="

# X API からトレンドデータ取得（全カテゴリ横断）
X_TRENDS_TEXT=""
if [ -n "${X_BEARER_TOKEN:-}" ] && type fetch_x_trends &>/dev/null; then
  log "X API: 全カテゴリのトレンドを取得中..."

  for idx in "${!X_QUERIES[@]}"; do
    CATEGORY_NAME="${X_CATEGORY_NAMES[$idx]}"
    QUERY="${X_QUERIES[$idx]}"

    if X_JSON=$(fetch_x_trends "$QUERY"); then
      PARSED=$(parse_x_trends "$X_JSON")
      if [ -n "$PARSED" ]; then
        X_TRENDS_TEXT+=$(format_x_trends_for_prompt "$PARSED" "$CATEGORY_NAME")
        log "X API: ${CATEGORY_NAME} - $(echo "$PARSED" | wc -l | tr -d ' ') 件取得"
      fi
    else
      log "WARN: X API ($CATEGORY_NAME) 失敗。スキップ"
    fi
    sleep 0.5
  done

  if [ -z "$X_TRENDS_TEXT" ]; then
    log "WARN: X API 全カテゴリ失敗。WebSearch のみで継続"
  fi
else
  log "INFO: X_BEARER_TOKEN 未設定。WebSearch のみで調査"
fi

# 既存のキュー・記事タイトルを取得（重複防止用）
EXISTING_QUEUE=$(api_get "article_queue?select=topic&status=in.(pending,in_progress,completed)&order=created_at.desc&limit=50" | jq -r '.[].topic' 2>/dev/null || echo "")
EXISTING_ARTICLES=$(api_get "blog_posts?select=title&order=created_at.desc&limit=50" | jq -r '.[].title' 2>/dev/null || echo "")

# プロンプト組み立て
X_TRENDS_SECTION=""
if [ -n "$X_TRENDS_TEXT" ]; then
  X_TRENDS_SECTION="
=== X (Twitter) リアルタイムトレンド ===
以下は X で現在注目されている3Dプリンティング・ものづくり関連の投稿です（エンゲージメント順）。
これらのトレンドも参考にしてテーマを選定してください。

$X_TRENDS_TEXT
=== X トレンドここまで ===
"
fi

PROMPT="あなたは3DLab（3dlab.jp）のブログライターです。
以下のカテゴリに該当する、最新の3Dプリンティング・ものづくり関連トレンドを調査し、記事テーマを**10件**提案してください。

カテゴリ（各カテゴリから最低1件、バランスよく選定）:
- 3Dプリンター（機種、素材、テクニック）（2件）
- 初心者ガイド（選び方、使い方、トラブル）（2件）
- 業界ニュース（新製品、技術革新）（2件）
- DIY・ものづくり（作品、プロジェクト）（2件）
- ワークショップ（体験、イベント）（2件）

【重要】以下の「検索意図パターン」を参考に、ユーザーが実際に検索するキーワードを狙った記事テーマを選定すること。
10件のうち、できるだけ多くの意図タイプをカバーすること。

■ 比較・検討系（Commercial Investigation）
  - 3Dプリンター おすすめ / 比較 / ランキング
  - 3Dプリンター 家庭用 / 業務用 / 安い
  - フィラメント おすすめ / PLA vs ABS / PETG 比較
  - 3Dプリンター 5万円以下 / 10万円以下 / コスパ
  - レジン vs FDM どっち / 光造形 おすすめ

■ 入門・知識系（Informational）
  - 3Dプリンター とは / 仕組み / 種類 / できること
  - 3Dプリンター 始め方 / 必要なもの / 初期費用
  - フィラメント 種類 / 特徴 / 選び方
  - 3Dモデリング 初心者 / 無料ソフト / 始め方
  - STLファイル とは / 作り方 / ダウンロード

■ トラブルシューティング系（Problem-solving）
  - 3Dプリンター 反り / 剥がれ / 定着しない
  - 3Dプリンター 糸引き / ノズル詰まり / フィラメント詰まり
  - 3Dプリンター 積層痕 / 表面 きれい / 仕上げ
  - 3Dプリンター 失敗 原因 / うまくいかない
  - レジン 洗浄 / 二次硬化 / 匂い対策

■ 活用・制作アイデア系（How-to / Use Case）
  - 3Dプリンター フィギュア / ミニチュア / プラモデル
  - 3Dプリンター アクセサリー / スマホケース / キーホルダー
  - 3Dプリンター 建築模型 / 治具 / 自作パーツ
  - 3Dプリンター 副業 / ビジネス / 販売
  - 3Dプリンター 教育 / 子ども / STEAM

■ ソフト・データ系（Technical How-to）
  - スライサー 設定 / Cura 使い方 / OrcaSlicer
  - Thingiverse / Printables 使い方 / 無料データ
  - Fusion 360 / TinkerCAD / Blender 3Dプリンター
  - 3Dスキャン やり方 / スマホ / 無料アプリ

■ 体験・地域系（Local / Experiential）
  - 3Dプリンター 体験 東京 / ワークショップ 東京
  - 3Dプリンター レンタル / 出力サービス / 代行
  - ファブラボ / メイカースペース 東京
  - 3Dプリンター 教室 / スクール / 講座
$X_TRENDS_SECTION
調査手順:
1. 上記のXトレンドデータを優先的に参考にする
2. WebSearch で補完的に最新ニュースを調査
3. 3DLabの読者（3Dプリンター初心者〜中級者、ものづくり愛好家）に有益なテーマを選定
4. 全5カテゴリから均等に選出すること

以下のテーマは既にキューまたは執筆済みなので避けてください:
--- 既存キュー ---
$EXISTING_QUEUE
--- 既存記事 ---
$EXISTING_ARTICLES
---

出力形式（必ずこの形式で10件出力、マークダウン記号は使わない）:
TOPIC_1_TITLE: タイトル
TOPIC_1_KEYWORD: キーワード（2-3語）
TOPIC_1_BRIEF: 方向性の簡潔な説明（1-2文）
TOPIC_1_PRIORITY: 優先度（0-10、高いほど優先）

TOPIC_2_TITLE: ...
TOPIC_2_KEYWORD: ...
TOPIC_2_BRIEF: ...
TOPIC_2_PRIORITY: ...

（TOPIC_3〜TOPIC_10も同様に出力）"

# Claude CLI 実行
log "Claude CLI でトレンド調査実行中..."
cd "$PROJECT_DIR"

CLAUDE_OUTPUT=$(echo "$PROMPT" | "$CLAUDE_BIN" --print \
  --permission-mode bypassPermissions \
  --max-budget-usd "$MAX_BUDGET_USD" \
  --allowed-tools "WebSearch WebFetch" \
  2>&1) || {
  log "ERROR: Claude CLI が異常終了しました"
  log "出力: $CLAUDE_OUTPUT"
  exit 1
}

log "Claude CLI 実行完了"

# 出力からテーマをパースしてDBに挿入
trim() { sed 's/^[[:space:]]*//;s/[[:space:]]*$//'; }
clean() { sed 's/^\*\*\s*//' | sed 's/\*\*$//' | trim; }

INSERTED=0
for i in {1..10}; do
  TITLE=$(echo "$CLAUDE_OUTPUT" | grep -E "^[*-]*\s*TOPIC_${i}_TITLE:" | sed 's/^[*-]*\s*TOPIC_[0-9]*_TITLE:[[:space:]]*//' | clean | head -1 || true)
  KEYWORD=$(echo "$CLAUDE_OUTPUT" | grep -E "^[*-]*\s*TOPIC_${i}_KEYWORD:" | sed 's/^[*-]*\s*TOPIC_[0-9]*_KEYWORD:[[:space:]]*//' | clean | head -1 || true)
  BRIEF=$(echo "$CLAUDE_OUTPUT" | grep -E "^[*-]*\s*TOPIC_${i}_BRIEF:" | sed 's/^[*-]*\s*TOPIC_[0-9]*_BRIEF:[[:space:]]*//' | clean | head -1 || true)
  PRIORITY=$(echo "$CLAUDE_OUTPUT" | grep -E "^[*-]*\s*TOPIC_${i}_PRIORITY:" | sed 's/^[*-]*\s*TOPIC_[0-9]*_PRIORITY:[[:space:]]*//' | clean | grep -oE '^[0-9]+' | head -1 || true)
  PRIORITY=${PRIORITY:-0}

  if [ -z "$TITLE" ] || [ -z "$KEYWORD" ]; then
    log "WARN: TOPIC_$i のパースに失敗。スキップ。"
    continue
  fi

  # 重複チェック（REST API で既存チェック）
  EXISTING=$(api_get "article_queue?topic=eq.$(printf '%s' "$KEYWORD" | jq -sRr @uri)&status=neq.failed&select=id&limit=1" | jq -r 'length' 2>/dev/null || echo "0")

  if [ "$EXISTING" != "0" ]; then
    log "SKIP: 重複テーマ: $KEYWORD"
    continue
  fi

  # JSON を構築して INSERT
  JSON_PAYLOAD=$(jq -n \
    --arg title "$TITLE" \
    --arg topic "$KEYWORD" \
    --arg brief "$BRIEF" \
    --argjson priority "$PRIORITY" \
    '{title: $title, topic: $topic, brief: $brief, priority: $priority, status: "pending", article_type: "standard"}')

  RESULT=$(api_post "article_queue" "$JSON_PAYLOAD")
  RESULT_ID=$(echo "$RESULT" | jq -r '.[0].id // .id // empty' 2>/dev/null || true)

  if [ -n "$RESULT_ID" ]; then
    log "INSERT成功: [$PRIORITY] $TITLE ($KEYWORD)"
    INSERTED=$((INSERTED + 1))
  else
    log "WARN: INSERT失敗: $TITLE - $RESULT"
  fi
done

log "通常記事 $INSERTED 件をキューに追加"

# ===================================================================
# アフィリエイト記事のトピック生成（週5件）
# Amazon Associate（タグ: 3dlab-22）を使った収益化記事の企画
# ===================================================================
log "=== アフィリエイト企画の生成開始 ==="

# 既存のアフィリエイト記事タイトルを取得（重複防止）
EXISTING_AFFILIATE=$(api_get "article_queue?article_type=eq.affiliate&select=topic,title&status=in.(pending,in_progress,completed)&order=created_at.desc&limit=30" | jq -r '.[] | "\(.title) (\(.topic))"' 2>/dev/null || echo "")

AFF_PROMPT="あなたは3DLab（3dlab.jp）のアフィリエイトマーケターです。
Amazon Associate プログラム（タグ: 3dlab-22）で収益化できる「商品比較・レビュー記事」のテーマを**5件**提案してください。

【記事の方向性】
- Amazonで実際に販売されている3Dプリンター関連商品を扱う
- 比較記事・おすすめランキング・選び方ガイドが中心
- 読者の購入意思決定を助ける実用的な内容（誇大表現NG）
- 想定読者: 3Dプリンター初心者〜中級者、購入検討中のユーザー

【商品ジャンル例】
- 3Dプリンター本体（FDM/光造形、価格帯別: 3万円以下、5万円以下、10万円以下、20万円以下）
- フィラメント（PLA/PETG/ABS/TPU、メーカー別: SUNLU/eSUN/Polymaker/PolyTerra/Bambu Lab）
- レジン（標準/水洗い/ABSライク/タフ）
- 周辺機器（防音ボックス、フィラメント乾燥機、UV硬化機、洗浄機、レベリングツール）
- 工具・ツール（ノズル交換、スクレーパー、ノギス、サンドペーパー、塗装用品）
- ソフト・書籍（Fusion 360、Blender、3DCAD入門書）
- 安全用品（防毒マスク、手袋、換気ファン）

【検索意図のターゲット】
- 「3Dプリンター おすすめ」「3Dプリンター 5万円以下」「PLA フィラメント 比較」等の比較・選定系キーワード
- 商品名で検索する人向け: 「Anycubic Kobra レビュー」「Bambu Lab A1 mini 比較」等

【既存のアフィリエイト記事（避ける）】
$EXISTING_AFFILIATE

【出力形式（必ずこの形式で5件出力、マークダウン記号は使わない）】
AFF_1_TITLE: タイトル（例: 5万円以下のおすすめ3Dプリンター7選｜初心者でも失敗しない選び方）
AFF_1_KEYWORD: 検索キーワード（2-3語、例: 3Dプリンター 5万円以下 おすすめ）
AFF_1_BRIEF: 紹介する商品ジャンル・価格帯・対象読者を1-2文で（例: Amazon上位の5万円以下FDM機を5機種ピックアップして比較。初心者・学生・趣味層向けに価格・造形品質・サポートを比較表で整理）
AFF_1_PRIORITY: 優先度（0-10、検索ボリュームが大きいテーマほど高く）

AFF_2_TITLE: ...
AFF_2_KEYWORD: ...
AFF_2_BRIEF: ...
AFF_2_PRIORITY: ...

（AFF_3〜AFF_5も同様に出力）"

AFF_OUTPUT=$(echo "$AFF_PROMPT" | "$CLAUDE_BIN" --print \
  --permission-mode bypassPermissions \
  --max-budget-usd "$MAX_BUDGET_USD" \
  --allowed-tools "WebSearch WebFetch" \
  2>&1) || {
  log "WARN: アフィリエイト企画生成が失敗。スキップ。"
  AFF_OUTPUT=""
}

AFF_INSERTED=0
if [ -n "$AFF_OUTPUT" ]; then
  for i in {1..5}; do
    TITLE=$(echo "$AFF_OUTPUT" | grep -E "^[*-]*\s*AFF_${i}_TITLE:" | sed 's/^[*-]*\s*AFF_[0-9]*_TITLE:[[:space:]]*//' | clean | head -1 || true)
    KEYWORD=$(echo "$AFF_OUTPUT" | grep -E "^[*-]*\s*AFF_${i}_KEYWORD:" | sed 's/^[*-]*\s*AFF_[0-9]*_KEYWORD:[[:space:]]*//' | clean | head -1 || true)
    BRIEF=$(echo "$AFF_OUTPUT" | grep -E "^[*-]*\s*AFF_${i}_BRIEF:" | sed 's/^[*-]*\s*AFF_[0-9]*_BRIEF:[[:space:]]*//' | clean | head -1 || true)
    PRIORITY=$(echo "$AFF_OUTPUT" | grep -E "^[*-]*\s*AFF_${i}_PRIORITY:" | sed 's/^[*-]*\s*AFF_[0-9]*_PRIORITY:[[:space:]]*//' | clean | grep -oE '^[0-9]+' | head -1 || true)
    PRIORITY=${PRIORITY:-5}

    if [ -z "$TITLE" ] || [ -z "$KEYWORD" ]; then
      log "WARN: AFF_$i のパースに失敗。スキップ。"
      continue
    fi

    # 重複チェック
    EXISTING=$(api_get "article_queue?topic=eq.$(printf '%s' "$KEYWORD" | jq -sRr @uri)&status=neq.failed&select=id&limit=1" | jq -r 'length' 2>/dev/null || echo "0")
    if [ "$EXISTING" != "0" ]; then
      log "SKIP: 重複アフィテーマ: $KEYWORD"
      continue
    fi

    JSON_PAYLOAD=$(jq -n \
      --arg title "$TITLE" \
      --arg topic "$KEYWORD" \
      --arg brief "$BRIEF" \
      --argjson priority "$PRIORITY" \
      '{title: $title, topic: $topic, brief: $brief, priority: $priority, status: "pending", article_type: "affiliate"}')

    RESULT=$(api_post "article_queue" "$JSON_PAYLOAD")
    RESULT_ID=$(echo "$RESULT" | jq -r '.[0].id // .id // empty' 2>/dev/null || true)

    if [ -n "$RESULT_ID" ]; then
      log "INSERT成功 [AFF P$PRIORITY]: $TITLE ($KEYWORD)"
      AFF_INSERTED=$((AFF_INSERTED + 1))
    else
      log "WARN: アフィ INSERT失敗: $TITLE - $RESULT"
    fi
  done
fi

log "アフィリエイト記事 $AFF_INSERTED 件をキューに追加"
log "合計 $((INSERTED + AFF_INSERTED)) 件（通常 $INSERTED / アフィ $AFF_INSERTED）"
log "=== topic-research 完了 ==="
