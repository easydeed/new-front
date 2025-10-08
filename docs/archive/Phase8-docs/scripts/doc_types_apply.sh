#!/usr/bin/env bash
set -euo pipefail
TARGET="${1:-all}"

apply() {
  local patch="$1"
  echo "Applying $patch"
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git apply --reject --whitespace=fix "$patch" || true
  else
    echo "Not a git repo; copy files from snippets/ manually."
  fi
}

if [[ "$TARGET" == "backend" || "$TARGET" == "all" ]]; then
  apply patches/backend/2001-add-deeds-extra-router.patch
  apply patches/backend/2002-register-doc-types.patch
fi

if [[ "$TARGET" == "frontend" || "$TARGET" == "all" ]]; then
  apply patches/frontend/2001-add-create-deed-routes.patch || true
fi

echo "Done. If any *.rej appeared, open snippets/ and copy those files into place."
