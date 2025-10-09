#!/usr/bin/env bash
set -euo pipefail

mkdir -p frontend/src/app/reset-password frontend/src/app/verify-email frontend/src/utils frontend/src/hooks

cp -f snippets/frontend/src/app/reset-password/page.tsx frontend/src/app/reset-password/page.tsx
cp -f snippets/frontend/src/app/verify-email/page.tsx frontend/src/app/verify-email/page.tsx
cp -f snippets/frontend/src/utils/authToken.ts frontend/src/utils/authToken.ts
cp -f snippets/frontend/src/hooks/useSilentRefresh.ts frontend/src/hooks/useSilentRefresh.ts

echo "[ok] Frontend snippets copied."
echo "Action required: Replace ad-hoc token access with utils/authToken.ts helpers."
