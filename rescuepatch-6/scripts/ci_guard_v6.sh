#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-.}"
echo "[ci-guard v6] Checking SmartReview side effects..."
if git -C "$ROOT" grep -nE "fetch\(.*api/deeds|window\.location\.href.*deeds" -- frontend/src/features/wizard/mode >/dev/null 2>&1; then
  echo "❌ Found forbidden SmartReview side effects. Fix before commit."
  git -C "$ROOT" grep -nE "fetch\(.*api/deeds|window\.location\.href.*deeds" -- frontend/src/features/wizard/mode || true
  exit 1
fi
echo "✅ SmartReview side-effect checks passed."

echo "[ci-guard v6] finalizeDeed guard..."
FD="$ROOT/frontend/src/lib/deeds/finalizeDeed.ts"
if [[ -f "$FD" ]]; then
  grep -q "finalizeDeed v6" "$FD" || { echo "❌ finalizeDeed.ts not at v6"; exit 1; }
  grep -q "source: 'modern-canonical'" "$FD" || { echo "❌ finalizeDeed.ts missing source tag"; exit 1; }
  grep -q "x-client-flow" "$FD" || { echo "❌ finalizeDeed.ts missing trace headers"; exit 1; }
  echo "✅ finalizeDeed guard present."
else
  echo "⚠️  finalizeDeed.ts not found; skipping."
fi

echo "[ci-guard v6] ModernEngine wiring..."
ME="$ROOT/frontend/src/features/wizard/mode/engines/ModernEngine.tsx"
if [[ -f "$ME" ]]; then
  grep -q "\.\./review/SmartReview" "$ME" || { echo "❌ ModernEngine must import from ../review/SmartReview"; exit 1; }
  grep -q "onConfirm={onNext}" "$ME" || { echo "❌ SmartReview must receive onConfirm={onNext}"; exit 1; }
  grep -q "smartreview:confirm" "$ME" || { echo "❌ Missing smartreview:confirm fallback listener"; exit 1; }
  grep -q "@/lib/canonical/toCanonicalFor" "$ME" || { echo "❌ Missing toCanonicalFor import"; exit 1; }
  echo "✅ ModernEngine wiring good."
else
  echo "⚠️  ModernEngine.tsx not found; skipping."
fi

echo "[ci-guard v6] All checks passed."
