#!/usr/bin/env bash
set -euo pipefail
FILE="frontend/src/config/featureFlags.ts"
if grep -q "NEW_WIZARD_MODERN_V0: false" "$FILE"; then
  sed -i.bak 's/NEW_WIZARD_MODERN_V0: false/NEW_WIZARD_MODERN_V0: true/' "$FILE"
  echo "Enabled NEW_WIZARD_MODERN_V0"
else
  echo "Flag already true or file changed; verify manually."
fi
