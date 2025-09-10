#!/bin/bash
set -e

echo "Reverting last commit..."
git revert HEAD
git push origin main
echo "Rollback complete—check prod."