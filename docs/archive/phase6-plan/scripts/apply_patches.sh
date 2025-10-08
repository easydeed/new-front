#!/usr/bin/env bash
set -euo pipefail
TARGET="${1:-all}"

apply() {
  local patch="$1"
  echo "Applying $patch"
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git apply --reject --whitespace=fix "$patch" || true
  else
    echo "Not a git repo; copy from snippets if needed."
  fi
}

if [[ "$TARGET" == "frontend" || "$TARGET" == "all" ]]; then
  apply patches/frontend/0001-past-deeds-connect-api.patch
  apply patches/frontend/0002-shared-deeds-connect-api.patch
  apply patches/frontend/0003-dashboard-stats-summary.patch
  apply patches/frontend/0009-sidebar-feature-flags.patch
fi

if [[ "$TARGET" == "backend" || "$TARGET" == "all" ]]; then
  apply patches/backend/1001-deeds-summary-endpoint.patch
  apply patches/backend/1002-admin-user-details-real.patch
  apply patches/backend/1003-system-metrics-endpoint.patch
  apply patches/backend/1004-wizard-drafts-persistence.patch
fi

echo "Done. Resolve any .rej hunks, or use files in snippets/"
