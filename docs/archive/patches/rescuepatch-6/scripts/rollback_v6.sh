#!/usr/bin/env bash
set -euo pipefail
echo "[rollback v6] Restoring last commit"
git restore --source=HEAD~1 -SW :/
echo "[rollback v6] Done."
