#!/usr/bin/env bash
# Builds inkwell/index.html (standalone page) from src/shell.html + src/js/*.js
set -euo pipefail
cd "$(dirname "$0")"
js=$(cat src/js/*.js)
body=$(python3 -c 'import sys; s=open("src/shell.html").read(); j=open(sys.argv[1]).read(); print(s.replace("/*__JS__*/", j))' <(echo "$js"))
{
  echo '<!doctype html>'
  echo '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>'
  echo "$body"
  echo '</body></html>'
} > index.html
if [ -n "${ARTIFACT_OUT:-}" ]; then echo "$body" > "$ARTIFACT_OUT"; fi
echo "built index.html ($(wc -c < index.html) bytes)"
