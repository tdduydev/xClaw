#!/usr/bin/env bash
# ============================================================
# xClaw — Health Check Script
# Usage: ./deploy/scripts/health-check.sh [base_url]
# Checks: liveness → readiness → deep health
# ============================================================
set -euo pipefail

BASE_URL="${1:-http://localhost:5001}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  HTTP_CODE=$(curl -s -o /tmp/health_response -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  BODY=$(cat /tmp/health_response 2>/dev/null || echo "")

  if [[ "$HTTP_CODE" == "$expected_status" ]]; then
    echo -e "${GREEN}✅ $name${NC} — HTTP $HTTP_CODE"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌ $name${NC} — HTTP $HTTP_CODE (expected $expected_status)"
    if [[ -n "$BODY" ]]; then
      echo "   Response: $BODY"
    fi
    FAIL=$((FAIL + 1))
  fi
}

echo "═══════════════════════════════════════════"
echo " xClaw Health Check — $BASE_URL"
echo "═══════════════════════════════════════════"
echo ""

check "Liveness  (/health)"       "$BASE_URL/health"
check "Readiness (/health/ready)" "$BASE_URL/health/ready"
check "Deep      (/health/deep)"  "$BASE_URL/health/deep"
check "Root      (/)"             "$BASE_URL/"

echo ""
echo "─── Web Frontend ──────────────────────────"
WEB_URL="${WEB_URL:-http://localhost:3000}"
check "Web frontend" "$WEB_URL/"

echo ""
echo "═══════════════════════════════════════════"
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════"

# ─── Deep health details ───────────────────────────────────
echo ""
echo "─── Deep Health Details ─────────────────────"
curl -s "$BASE_URL/health/deep" 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "(could not parse response)"

exit $FAIL
