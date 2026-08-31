#!/usr/bin/env bash
# X (Twitter) API v2 ヘルパー関数
# Recent Search API を使用して3Dプリンティング関連トレンドを取得

# === 定数 ===
X_API_BASE="https://api.twitter.com/2"
X_MAX_RESULTS=20
X_TIMEOUT=30

# 検索クエリ（カテゴリ別）
X_QUERIES=(
  '(#3Dprinting OR #3Dprinter OR #additivemanufacturing) lang:en -is:retweet -is:reply'
  '(#3Dプリンター OR #3Dプリント OR 3Dプリンター) lang:ja -is:retweet -is:reply'
  '(#maker OR #DIY OR #fabrication OR #CNC) lang:en -is:retweet -is:reply'
  '(#ワークショップ OR #ものづくり OR #fablab) lang:ja -is:retweet -is:reply'
  '(#Creality OR #Bambulab OR #Prusa OR #filament OR #resin3d) lang:en -is:retweet -is:reply'
)

X_CATEGORY_NAMES=(
  "3Dプリンティング（海外）"
  "3Dプリンティング（国内）"
  "メイカー・DIY"
  "ワークショップ・ものづくり"
  "3Dプリンター機種・素材"
)

# === 関数 ===

# X API Recent Search を呼び出し
# 引数: $1 = 検索クエリ
# 戻り値: 成功時は JSON を stdout に出力、失敗時は return 1
fetch_x_trends() {
  local query="$1"
  local encoded_query
  local response
  local http_code

  if [ -z "$X_BEARER_TOKEN" ]; then
    echo "WARN: X_BEARER_TOKEN が設定されていません" >&2
    return 1
  fi

  # URL エンコード
  encoded_query=$(printf '%s' "$query" | jq -sRr @uri)

  # API 呼び出し（リトライ1回）
  local attempt=0
  while [ $attempt -lt 2 ]; do
    response=$(curl -s -w "\n%{http_code}" \
      --max-time "$X_TIMEOUT" \
      -H "Authorization: Bearer $X_BEARER_TOKEN" \
      "${X_API_BASE}/tweets/search/recent?query=${encoded_query}&max_results=${X_MAX_RESULTS}&tweet.fields=public_metrics,created_at,author_id&expansions=author_id&user.fields=username,name" \
      2>/dev/null) || {
      echo "WARN: X API 接続タイムアウト (attempt $((attempt + 1)))" >&2
      attempt=$((attempt + 1))
      continue
    }

    http_code=$(echo "$response" | tail -1)
    response=$(echo "$response" | sed '$d')

    case "$http_code" in
      200)
        echo "$response"
        return 0
        ;;
      401)
        echo "ERROR: X API 認証エラー (401)" >&2
        return 1
        ;;
      429)
        echo "WARN: X API レート制限 (429)" >&2
        return 1
        ;;
      5*)
        echo "WARN: X API サーバーエラー ($http_code) (attempt $((attempt + 1)))" >&2
        attempt=$((attempt + 1))
        sleep 2
        continue
        ;;
      *)
        echo "WARN: X API 予期しないエラー ($http_code)" >&2
        return 1
        ;;
    esac
  done

  return 1
}

# JSON レスポンスをパースしてエンゲージメント順にソート
# 引数: $1 = JSON レスポンス
# 出力: "engagement_score|username|text" 形式で上位10件
parse_x_trends() {
  local json="$1"

  echo "$json" | jq -r '
    (.includes.users // []) as $users |
    [.data // [] | .[] |
      (.author_id as $aid | ($users | map(select(.id == $aid)) | .[0].username // "unknown")) as $username |
      {
        text: .text,
        username: $username,
        retweets: (.public_metrics.retweet_count // 0),
        likes: (.public_metrics.like_count // 0),
        replies: (.public_metrics.reply_count // 0),
        engagement: ((.public_metrics.retweet_count // 0) * 2 + (.public_metrics.like_count // 0) + (.public_metrics.reply_count // 0))
      }
    ] |
    sort_by(-.engagement) |
    .[:10] |
    .[] |
    "\(.engagement)|\(.username)|\(.text | gsub("\n"; " ") | .[0:200])"
  ' 2>/dev/null || echo ""
}

# トレンドデータを整形してプロンプト用テキストを生成
# 引数: $1 = parse_x_trends の出力, $2 = カテゴリ名
format_x_trends_for_prompt() {
  local parsed="$1"
  local category="$2"

  if [ -z "$parsed" ]; then
    return
  fi

  echo "【$category の X トレンド（エンゲージメント上位）】"
  echo "$parsed" | while IFS='|' read -r engagement username text; do
    echo "- @${username} (engagement: ${engagement}): ${text}"
  done
  echo ""
}
