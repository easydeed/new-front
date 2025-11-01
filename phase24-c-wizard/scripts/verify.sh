#!/usr/bin/env bash
set -euo pipefail
echo "🔎 Verifying expected files and markers..."
req=(
  "src/app/(v0-wizard)/layout.tsx"
  "src/lib/analytics/wizardEvents.ts"
)
for f in "${req[@]}"; do
  if [ ! -f "$f" ]; then
    echo "❌ Missing $f"
    exit 1
  fi
done
echo "✅ Basic files present."
