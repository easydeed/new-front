#!/usr/bin/env bash
set -euo pipefail
FR="${1:-http://localhost:3000}"
API="${2:-http://localhost:8000}"
echo "Frontend: $FR  API: $API"
npm --prefix e2e ci
npx --yes playwright install --with-deps chromium
node e2e/run_smoke.js "$FR" "$API"
