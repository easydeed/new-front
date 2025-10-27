#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"

echo "[verify] Checking SmartReview components for direct network/redirects..."
if git -C "$ROOT" grep -nE "fetch\(.*api/deeds|window\.location\.href.*deeds" -- frontend/src/features/wizard/mode >/dev/null 2>&1; then
  git -C "$ROOT" grep -nE "fetch\(.*api/deeds|window\.location\.href.*deeds" -- frontend/src/features/wizard/mode
  echo "❌ Found forbidden patterns in SmartReview. Remove them."
  exit 1
else
  echo "✅ SmartReview components are presentational."
fi

echo "[verify] Checking ModernEngine listener..."
if ! grep -q "smartreview:confirm" "$ROOT/frontend/src/features/wizard/mode/engines/ModernEngine.tsx"; then
  echo "❌ ModernEngine.tsx missing smartreview:confirm listener."
  exit 1
else
  echo "✅ ModernEngine listener present."
fi

echo "[verify] Checking finalizeDeed.ts source tag..."
if ! grep -q "source: 'modern'" "$ROOT/frontend/src/lib/deeds/finalizeDeed.ts"; then
  echo "❌ finalizeDeed.ts missing source: 'modern'"
  exit 1
else
  echo "✅ finalizeDeed.ts is tagged with source: 'modern'"
fi

echo "[verify] All checks passed."
