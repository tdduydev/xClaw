#!/usr/bin/env bash
# ============================================================
# xClaw — Rollback Script
# Usage: ./deploy/scripts/rollback.sh [service] [image_tag]
#   service:   xclaw | web (default: xclaw)
#   image_tag: Docker image tag to rollback to (e.g. sha-abc1234)
# ============================================================
set -euo pipefail

SERVICE="${1:-xclaw}"
TAG="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[rollback]${NC} $*"; }
warn() { echo -e "${YELLOW}[rollback]${NC} $*"; }
err()  { echo -e "${RED}[rollback]${NC} $*" >&2; }

cd "$ROOT_DIR"

COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

# ─── Determine rollback target ─────────────────────────────
if [[ -z "$TAG" ]]; then
  log "No tag specified. Listing recent images..."
  docker images --filter "reference=ghcr.io/xdev-asia/xclaw-*" --format "{{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | head -10
  echo ""
  read -rp "Enter image tag to rollback to: " TAG
fi

case "$SERVICE" in
  xclaw)
    IMAGE="ghcr.io/xdev-asia/xclaw-server:${TAG}"
    ENV_VAR="XCLAW_SERVER_IMAGE"
    ;;
  web)
    IMAGE="ghcr.io/xdev-asia/xclaw-web:${TAG}"
    ENV_VAR="XCLAW_WEB_IMAGE"
    ;;
  *)
    err "Unknown service: $SERVICE (use 'xclaw' or 'web')"
    exit 1
    ;;
esac

warn "Rolling back $SERVICE → $IMAGE"
read -rp "Confirm rollback? (yes/no): " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  err "Aborted."
  exit 1
fi

# ─── Execute rollback ──────────────────────────────────────
log "Pulling $IMAGE..."
docker pull "$IMAGE"

log "Restarting $SERVICE..."
export "$ENV_VAR=$IMAGE"
$COMPOSE_CMD up -d --no-deps "$SERVICE"

# ─── Verify ────────────────────────────────────────────────
sleep 5
HEALTH_URL="http://localhost:5001/health/ready"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" == "200" ]]; then
  log "✅ Rollback successful — $SERVICE is healthy"
else
  err "⚠️  Health check returned HTTP $HTTP_CODE — check logs"
  err "Run: docker compose logs -f $SERVICE"
fi
