#!/usr/bin/env bash
#
# Netlify に入っている本番の環境変数を、Vercel の同じプロジェクトへ移す。
#
# 使い方:
#   ./scripts/vercel-env-sync.sh            # 何をするか表示するだけ（値は書き込まない）
#   ./scripts/vercel-env-sync.sh --apply    # 実際に Vercel へ書き込む
#
# 前提:
#   - netlify CLI がこのリポジトリにリンク済み（.netlify/state.json がある）
#   - vercel CLI がこのリポジトリにリンク済み（.vercel/project.json がある）
#
# ⚠ 値は一切画面に出さない。出るのは「キー名・文字数・結果」だけ。
#
# ⚠ Netlify が「シークレット」に指定した変数は、CLI からは伏字（*****）でしか読めない。
#   この種の変数はスキップして最後に一覧で知らせる。Netlify の管理画面か発行元
#   （Stripe ダッシュボード等）から取って、手で入れること。
#
# ⚠ Netlify 専用の変数（NEXT_USE_NETLIFY_EDGE / SECRETS_SCAN_ENABLED）は移さない。
#
# ⚠ 値の末尾に改行を付けないこと。`echo` ではなく `printf '%s'` を使う。
#   改行が混ざると、鍵や URL の末尾に \n が焼き込まれて原因の分かりにくい失敗になる。

set -euo pipefail

APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

# 移さない変数（Netlify のビルド設定であって、アプリの設定ではない）
SKIP_KEYS="NEXT_USE_NETLIFY_EDGE SECRETS_SCAN_ENABLED"

# 書き込む対象環境
TARGETS="production preview"

command -v netlify >/dev/null || { echo "netlify CLI が見つからない"; exit 1; }
command -v vercel  >/dev/null || { echo "vercel CLI が見つからない"; exit 1; }
[ -f .vercel/project.json ] || { echo ".vercel/project.json が無い。先に \`vercel link\` を実行すること"; exit 1; }

TMPDIR_ENV="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_ENV"' EXIT

netlify env:list --json > "$TMPDIR_ENV/netlify-env.json"

# キーごとに「値の入ったファイル」を作る（値を引数や画面に出さないため）
python3 - "$TMPDIR_ENV" <<'PY'
import json, os, sys
outdir = sys.argv[1]
data = json.load(open(os.path.join(outdir, "netlify-env.json")))
index = []
for key, value in sorted(data.items()):
    value = value or ""
    masked = "*" in value
    path = os.path.join(outdir, f"val_{key}")
    with open(path, "w") as f:
        f.write(value)
    index.append(f"{key}\t{len(value)}\t{int(masked)}")
open(os.path.join(outdir, "index.tsv"), "w").write("\n".join(index) + "\n")
PY

echo "=== Netlify → Vercel 環境変数の移送 ($([ $APPLY -eq 1 ] && echo '本番書き込み' || echo '確認のみ')) ==="
printf '%-38s %6s  %s\n' "KEY" "文字数" "扱い"

MASKED_KEYS=""
EMPTY_KEYS=""

while IFS=$'\t' read -r KEY LEN MASKED; do
  [ -z "$KEY" ] && continue

  case " $SKIP_KEYS " in
    *" $KEY "*) printf '%-38s %6s  %s\n' "$KEY" "$LEN" "スキップ（Netlify 専用）"; continue ;;
  esac

  if [ "$LEN" = "0" ]; then
    printf '%-38s %6s  %s\n' "$KEY" "$LEN" "スキップ（空）"
    EMPTY_KEYS="$EMPTY_KEYS $KEY"
    continue
  fi

  if [ "$MASKED" = "1" ]; then
    printf '%-38s %6s  %s\n' "$KEY" "$LEN" "★ 手で入れる（Netlify が伏字で返した）"
    MASKED_KEYS="$MASKED_KEYS $KEY"
    continue
  fi

  if [ $APPLY -eq 0 ]; then
    printf '%-38s %6s  %s\n' "$KEY" "$LEN" "移送する（--apply で実行）"
    continue
  fi

  for TARGET in $TARGETS; do
    vercel env rm "$KEY" "$TARGET" --yes >/dev/null 2>&1 || true
    # ⚠ printf '%s'。末尾に改行を入れない
    printf '%s' "$(cat "$TMPDIR_ENV/val_$KEY")" | vercel env add "$KEY" "$TARGET" >/dev/null 2>&1
  done
  printf '%-38s %6s  %s\n' "$KEY" "$LEN" "移送した（${TARGETS}）"
done < "$TMPDIR_ENV/index.tsv"

echo
if [ -n "$MASKED_KEYS" ]; then
  echo "手で入れる必要があるもの（Netlify がシークレット指定していて CLI から読めない）:"
  for K in $MASKED_KEYS; do echo "  - $K"; done
  echo "  → Netlify 管理画面か発行元から値を取り、次のように入れる（末尾に改行を入れないこと）:"
  echo "      printf '%s' '<値>' | vercel env add <KEY> production"
  echo "      printf '%s' '<値>' | vercel env add <KEY> preview"
fi
if [ -n "$EMPTY_KEYS" ]; then
  echo "Netlify 側で空だったもの（そのまま空でよいか確認する）:"
  for K in $EMPTY_KEYS; do echo "  - $K"; done
fi
