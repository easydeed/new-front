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

apply patches/frontend/1101-preview-title-and-finalize.patch
apply patches/frontend/1102-deeds-proxy-route.patch
apply patches/frontend/1103-feature-flags.patch
apply patches/frontend/1104-sitex-prefill-hook.patch

echo "If any *.rej files appear, copy files from snippets/frontend/* to your repo and re-run."
