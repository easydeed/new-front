#!/usr/bin/env bash
set -euo pipefail

echo "Applying DeedPro SmartReview ➜ ModernEngine fix..."

ROOT="${1:-.}"
BASE="$(cd "$(dirname "$0")/.." && pwd)"

cp "$BASE/files/frontend/src/features/wizard/mode/review/SmartReview.tsx"        "$ROOT/frontend/src/features/wizard/mode/review/SmartReview.tsx"
echo "Wrote review/SmartReview.tsx"

cp "$BASE/files/frontend/src/features/wizard/mode/components/SmartReview.tsx"        "$ROOT/frontend/src/features/wizard/mode/components/SmartReview.tsx"
echo "Wrote components/SmartReview.tsx"

cp "$BASE/files/frontend/src/features/wizard/mode/engines/steps/SmartReview.tsx"        "$ROOT/frontend/src/features/wizard/mode/engines/steps/SmartReview.tsx"
echo "Wrote engines/steps/SmartReview.tsx"

ME="$ROOT/frontend/src/features/wizard/mode/engines/ModernEngine.tsx"
if [[ -f "$ME" ]]; then
  if ! grep -q "useEffect" "$ME"; then
    awk 'NR==1{print; print "import { useEffect } from \"react\";"; next}1' "$ME" > "$ME.tmp" && mv "$ME.tmp" "$ME"
    echo "Inserted import { useEffect } from \"react\";"
  fi

  if ! grep -q "smartreview:confirm" "$ME"; then
    awk '
      /export[[:space:]]+default[[:space:]]+function[[:space:]]+ModernEngine[^{]*\{/ && !p {
        print;
        print "  // Ensure ANY SmartReview variant routes through engine finalization.";
        print "  useEffect(() => {";
        print "    const handler = () => { try { onNext(); } catch (e) { console.error(\"[ModernEngine] onNext failed from smartreview:confirm\", e); } };";
        print "    window.addEventListener(\"smartreview:confirm\", handler);";
        print "    return () => window.removeEventListener(\"smartreview:confirm\", handler);";
        print "  }, []);";
        p=1; next
      }
      { print }
    ' "$ME" > "$ME.tmp" && mv "$ME.tmp" "$ME"
    echo "Patched ModernEngine.tsx listener"
  else
    echo "ModernEngine listener already present"
  fi
else
  echo "WARNING: ModernEngine.tsx not found at $ME"
fi

FD="$ROOT/frontend/src/lib/deeds/finalizeDeed.ts"
if [[ -f "$FD" ]]; then
  if ! grep -q "source: 'modern'" "$FD"; then
    sed -i.bak -e "s/vesting: payload.vesting?.description || null/vesting: payload.vesting?.description || null,\
    \ \ \ \ source: 'modern'/" "$FD" || true
    echo "Tagged finalizeDeed payload with source: 'modern'"
  else
    echo "finalizeDeed.ts already includes source: 'modern'"
  fi
else
  echo "WARNING: finalizeDeed.ts not found at $FD"
fi

echo "Done. Next: npm run typecheck && npm run build"
