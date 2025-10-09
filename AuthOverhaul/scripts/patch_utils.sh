#!/usr/bin/env bash
set -euo pipefail
apply_patch() {
  local patch="$1"
  echo "[patch] Applying $patch"
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git apply --reject --whitespace=fix "$patch" || true
  else
    echo "Not a git repo; copy files from snippets/ manually."
  fi
}
