#!/usr/bin/env bash
set -euo pipefail
FRONTEND="${1:-http://localhost:3000}"
API="${2:-http://localhost:8000}"
export FRONTEND_BASE_URL="$FRONTEND"
export API_BASE_URL="$API"

node e2e/run_smoke.js "$FRONTEND" "$API"
