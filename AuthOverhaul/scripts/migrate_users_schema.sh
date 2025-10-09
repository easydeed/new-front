#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to run migrations (e.g., postgres://...)}"
echo "[db] Applying schema migrations to $DATABASE_URL"
for f in sql/migrations/*.sql; do
  echo "==> $f"
  psql "$DATABASE_URL" -f "$f"
done
echo "[ok] Migrations applied."
