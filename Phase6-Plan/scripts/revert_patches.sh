#!/usr/bin/env bash
set -euo pipefail
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Reverting uncommitted changes..."
  git restore .
  git clean -fd
else
  echo "Not a git repo; manual revert required."
fi
