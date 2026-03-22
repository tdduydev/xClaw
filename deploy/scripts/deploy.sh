#!/usr/bin/env bash
# ============================================================
# xClaw — Deploy Helper Script
# Usage: ./deploy/scripts/deploy.sh [environment] [service]
#   environment: dev | staging | production (default: dev)
#   service:     all | xclaw | web (default: all)
# ============================================================
set -euo pipefail

ENV="${1:-dev}"
SERVICE="${2:-all}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $*"; }
err()  { echo -e "${RED}[deploy]${NC} $*" >&2; }

# ─── Validate environment ──────────────────────────────────
case "$ENV" in
  dev|development)
    COMPOSE_CMD="docker compose"
    log "Target: development (local Docker Compose)"
    ;;
  staging)
    COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
    log "Target: staging"
    ;;
  production|prod)
    COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
    log "Target: production"
    read -rp "⚠️  Deploy to PRODUCTION? Type 'yes' to confirm: " CONFIRM
    if [[ "$CONFIRM" != "yes" ]]; then
      err "Aborted."
      exit 1
    fi
    ;;
  *)
    err "Unknown environment: $ENV"
    echo "Usage: $0 [dev|staging|production] [all|xclaw|web]"
    exit 1
    ;;
esac

cd "$ROOT_DIR"

# ─── Pre-deploy checks ────────────────────────────────────
log "Running pre-deploy checks..."

if [[ ! -f "docker-compose.yml" ]]; then
  err "docker-compose.yml not found in $ROOT_DIR"
  exit 1
fi

if [[ "$ENV" != "dev" && ! -f ".env" ]]; then
  warn ".env file not found — using docker-compose defaults"
fi

# ─── Pull or Build ─────────────────────────────────────────
if [[ "$ENV" == "dev" ]]; then
  log "Building images locally..."
  if [[ "$SERVICE" == "all" ]]; then
    $COMPOSE_CMD build
  else
    $COMPOSE_CMD build "$SERVICE"
  fi
else
  log "Pulling latest images..."
  if [[ "$SERVICE" == "all" ]]; then
    $COMPOSE_CMD pull xclaw web 2>/dev/null || warn "Pull failed, using local images"
  else
    $COMPOSE_CMD pull "$SERVICE" 2>/dev/null || warn "Pull failed, using local image"
  fi
fi

# ─── Deploy ────────────────────────────────────────────────
log "Starting services..."
if [[ "$SERVICE" == "all" ]]; then
  $COMPOSE_CMD up -d
else
  $COMPOSE_CMD up -d --no-deps "$SERVICE"
fi

# ─── Post-deploy health check ─────────────────────────────
log "Waiting for health check..."
sleep 5

HEALTH_URL="http://localhost:5001/health/ready"
MAX_RETRIES=12
RETRY=0

while [[ $RETRY -lt $MAX_RETRIES ]]; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
  if [[ "$HTTP_CODE" == "200" ]]; then
    log "✅ Health check passed (HTTP $HTTP_CODE)"
    break
  fi
  RETRY=$((RETRY + 1))
  warn "Health check attempt $RETRY/$MAX_RETRIES (HTTP $HTTP_CODE)..."
  sleep 5
done

if [[ $RETRY -ge $MAX_RETRIES ]]; then
  err "❌ Health check failed after $MAX_RETRIES attempts"
  err "Run: docker compose logs -f xclaw"
  exit 1
fi

# ─── Summary ───────────────────────────────────────────────
log "Deploy complete!"
$COMPOSE_CMD ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
