#!/usr/bin/env bash
set -euo pipefail
if [ -d backend ]; then (cd backend && uvicorn main:app --reload --port 8000) & BE=$!; fi
if [ -d frontend ]; then (cd frontend && npm run dev) & FE=$!; fi
trap "kill ${BE:-0} ${FE:-0} 2>/dev/null || true" EXIT
wait
