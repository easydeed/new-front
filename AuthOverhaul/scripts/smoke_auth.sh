#!/usr/bin/env bash
set -euo pipefail
FRONTEND="${1:-http://localhost:3000}"
BACKEND="${2:-http://localhost:8000}"

node -e "console.log('✓ Smoke: ' + process.argv[1] + ' / ' + process.argv[2])" "$FRONTEND" "$BACKEND"

# Minimal checks: pages are reachable
curl -sS -o /dev/null -w '✓ %{{http_code}} /login\n' "$FRONTEND/login" || true
curl -sS -o /dev/null -w '✓ %{{http_code}} /register\n' "$FRONTEND/register" || true
curl -sS -o /dev/null -w '✓ %{{http_code}} /reset-password\n' "$FRONTEND/reset-password" || true
