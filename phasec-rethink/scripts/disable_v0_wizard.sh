#!/usr/bin/env bash
set -euo pipefail
FILE="frontend/src/config/featureFlags.ts"
if grep -q "NEW_WIZARD_MODERN_V0: true" "$FILE"; then
  sed -i.bak 's/NEW_WIZARD_MODERN_V0: true/NEW_WIZARD_MODERN_V0: false/' "$FILE"
  echo "Disabled NEW_WIZARD_MODERN_V0"
else
  echo "Flag already false or file changed; verify manually."
fi
