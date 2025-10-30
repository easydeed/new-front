#!/usr/bin/env bash
set -euo pipefail
export $(grep -v '^#' .env | xargs -d '\n' -r)
uvicorn external_api.app:app --host "${EXTERNAL_API_HOST:-0.0.0.0}" --port "${EXTERNAL_API_PORT:-8001}" --reload
