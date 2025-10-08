#!/usr/bin/env bash
set -euo pipefail
# Start backend (port 8000) and frontend (port 3000) in parallel if folders exist
if [ -d backend ]; then
  (cd backend && uvicorn main:app --reload --port 8000) &
  BE_PID=$!
fi
if [ -d frontend ]; then
  (cd frontend && npm run dev) &
  FE_PID=$!
fi
trap "kill ${BE_PID:-0} ${FE_PID:-0} 2>/dev/null || true" EXIT
wait
