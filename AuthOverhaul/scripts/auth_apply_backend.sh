#!/usr/bin/env bash
set -euo pipefail
source scripts/patch_utils.sh

# Copy source-of-truth snippets first (safe additive)
mkdir -p backend/routers backend/utils backend/models
cp -f snippets/backend/routers/auth_extra.py backend/routers/auth_extra.py
cp -f snippets/backend/utils/email.py backend/utils/email.py
cp -f snippets/backend/utils/roles.py backend/utils/roles.py

# Best-effort patches
apply_patch patches/backend/2101_fix_deeds_user_id.patch
apply_patch patches/backend/2104_enforce_jwt_secret.patch

echo "[ok] Backend snippets copied. Remember to mount the router in backend/main.py:"
echo "from routers import auth_extra"
echo "app.include_router(auth_extra.router, prefix="")"
