#!/usr/bin/env bash
set -euo pipefail

apply() {
  local patch="$1"
  echo "Applying $patch"
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git apply --reject --whitespace=fix "$patch" || true
  else
    echo "Not a git repo; copy files from snippets/ manually."
  fi
}

apply patches/backend/1105-server-side-preview.patch

echo "Server-side preview is optional. It stays disabled unless you mount the router and set SERVER_SIDE_PREVIEW_ENABLED=true."
