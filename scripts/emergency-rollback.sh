#!/usr/bin/env bash

set -euo pipefail

# Emergency rollback helper for Vercel (frontend) and Render (backend)
#
# Usage examples:
#   ./scripts/emergency-rollback.sh vercel            # re-alias to previous deployment
#   ./scripts/emergency-rollback.sh vercel 2          # re-alias to Nth previous deployment (default 1)
#   ./scripts/emergency-rollback.sh render <deployId> # redeploy a specific previous deployId
#
# Prereqs:
# - Vercel: env VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID; vercel CLI optional
# - Render: env RENDER_API_KEY, RENDER_SERVICE_ID

PLATFORM="${1:-}"
ARG="${2:-}"

yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
red() { printf "\033[31m%s\033[0m\n" "$*"; }

require() {
  local name="$1"; shift
  if [ -z "${!name:-}" ]; then
    red "Missing required env: $name"
    exit 1
  fi
}

if [ -z "$PLATFORM" ]; then
  red "Usage: $0 <vercel|render> [arg]"
  exit 1
fi

case "$PLATFORM" in
  vercel)
    require VERCEL_TOKEN
    require VERCEL_ORG_ID
    require VERCEL_PROJECT_ID

    PREV_INDEX="${ARG:-1}"
    yellow "Fetching last deployments from Vercel (index to rollback: $PREV_INDEX) …"
    DEPLOYMENTS_JSON=$(curl -sfS \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&limit=10")

    # Extract target deployment: 0 = current, 1 = previous, etc.
    TARGET_URL=$(echo "$DEPLOYMENTS_JSON" | \
      python - <<'PY'
import sys, json, os
data=json.load(sys.stdin)
idx=int(os.environ.get('PREV_INDEX','1'))
items=data.get('deployments',[])
if idx>=len(items):
  print("")
else:
  print(items[idx].get('url',''))
PY
    )

    if [ -z "$TARGET_URL" ]; then
      red "Could not find the requested previous deployment (index $PREV_INDEX)."
      echo "Recent deployments:" && echo "$DEPLOYMENTS_JSON" | jq -r '.deployments[] | "- " + .uid + "  " + .url + "  " + .state'
      exit 1
    fi

    FULL_URL="https://${TARGET_URL}"
    yellow "Previous deployment resolved to: $FULL_URL"

    # Attempt to set production alias to previous deployment
    # If your project uses a custom domain, set PROD_DOMAIN env var to that domain.
    PROD_DOMAIN="${PROD_DOMAIN:-deedpro-frontend-new.vercel.app}"
    yellow "Re-aliasing production domain ($PROD_DOMAIN) to $FULL_URL …"

    # Use Vercel API to add alias (production domain -> previous deployment)
    curl -sfS -X POST \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"target\": \"production\", \"alias\": \"$PROD_DOMAIN\"}" \
      "https://api.vercel.com/v2/deployments/${TARGET_URL}/aliases" >/dev/null || true

    green "Rollback initiated. Verify production now points to: $FULL_URL"
    ;;

  render)
    require RENDER_API_KEY
    require RENDER_SERVICE_ID

    if [ -z "$ARG" ]; then
      yellow "No deployId provided. Listing recent deploys (copy a deployId to rollback to):"
      curl -sfS -H "Authorization: Bearer $RENDER_API_KEY" \
        "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys?limit=10" | \
        jq -r '.[] | "- deployId: " + .id + " | commit: " + (.commitId // "unknown") + " | createdAt: " + .createdAt + " | status: " + .status'
      yellow "Usage: $0 render <deployId>"
      exit 1
    fi

    DEPLOY_ID="$ARG"
    yellow "Triggering rollback to previous deployId: $DEPLOY_ID …"
    # Render API currently supports creating a new deploy from latest commit.
    # For rollback to a specific deployId, we can use the "rerun" endpoint if available; otherwise instruct manual.
    RERUN=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "Authorization: Bearer $RENDER_API_KEY" \
      "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys/$DEPLOY_ID/rerun")

    if [ "$RERUN" != "201" ] && [ "$RERUN" != "200" ]; then
      red "Automatic rerun failed (HTTP $RERUN)."
      yellow "Open dashboard to manually rollback: https://dashboard.render.com/web/$RENDER_SERVICE_ID"
      exit 1
    fi

    green "Rollback deploy triggered for deployId: $DEPLOY_ID"
    ;;

  *)
    red "Unknown platform: $PLATFORM (expected: vercel|render)"
    exit 1
    ;;
esac


