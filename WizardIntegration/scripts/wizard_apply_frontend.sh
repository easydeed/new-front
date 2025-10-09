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

apply patches/frontend/3001-add-wizard-flows.patch
apply patches/frontend/3002-add-wizard-steps.patch
apply patches/frontend/3003-add-feature-flags.patch

echo "If any *.rej files appear, open snippets/frontend/* and copy files into your repo paths."
