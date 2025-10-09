#!/usr/bin/env bash
set -euo pipefail
FRONTEND="${1:-http://localhost:3000}"
npm --prefix e2e ci
npx --yes playwright install --with-deps chromium
node e2e/prequal_smoke.js "$FRONTEND"
