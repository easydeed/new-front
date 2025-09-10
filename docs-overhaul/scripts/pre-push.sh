#!/bin/bash
set -e

echo "Checking before push..."
git status --porcelain | [ -z "$(cat)" ] || { echo "Uncommitted changes!"; exit 1; }
cd frontend && npm install && npm run test || exit 1
cd ../backend && pip install -r requirements.txt && pytest || exit 1
echo "PDF check: Ensure WeasyPrint uses US Letter 8.5x11, 1in top/bottom, 0.5in sides margins (or county-specific)."
echo "OK to push!"