#!/usr/bin/env bash
# ============================================================
# xClaw — Security Scan Script
# Usage: ./deploy/scripts/security-scan.sh [scan_type]
#   scan_type: full | deps | secrets | container | sast | config | ai
#   Default: full (runs all scans)
# ============================================================
set -euo pipefail

SCAN_TYPE="${1:-full}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
WARN=0
FAIL=0
TOTAL=0

log()    { echo -e "${GREEN}[security]${NC} $*"; }
warn()   { echo -e "${YELLOW}[security]${NC} $*"; WARN=$((WARN + 1)); }
fail()   { echo -e "${RED}[security]${NC} $*"; FAIL=$((FAIL + 1)); }
pass()   { echo -e "${GREEN}[security]${NC} ✅ $*"; PASS=$((PASS + 1)); }
section(){ echo -e "\n${CYAN}═══ $* ═══${NC}"; }

cd "$ROOT_DIR"

# ─── Dependency Vulnerability Scan ─────────────────────────
scan_deps() {
  section "DEPENDENCY VULNERABILITY SCAN"
  TOTAL=$((TOTAL + 1))

  log "Running npm audit (production dependencies, HIGH+ severity)..."
  if npm audit --omit=dev --audit-level=high 2>/dev/null; then
    pass "No HIGH or CRITICAL dependency vulnerabilities found"
  else
    AUDIT_JSON=$(npm audit --omit=dev --json 2>/dev/null || true)
    CRITICAL=$(echo "$AUDIT_JSON" | jq '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "?")
    HIGH=$(echo "$AUDIT_JSON" | jq '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "?")
    fail "Dependency vulnerabilities found: CRITICAL=$CRITICAL, HIGH=$HIGH"
    echo "  Run 'npm audit' for details"
  fi
}

# ─── Secret Detection ──────────────────────────────────────
scan_secrets() {
  section "SECRET DETECTION"
  TOTAL=$((TOTAL + 1))

  log "Scanning for hardcoded secrets..."

  # Pattern-based secret detection
  SECRETS_FOUND=0

  # Check for hardcoded passwords/keys in source files
  MATCHES=$(grep -rn --include='*.ts' --include='*.js' --include='*.yml' --include='*.yaml' \
    -E "(password|secret|api_?key|auth_?token|private_?key)\s*[:=]\s*[\"'][^$\{\}\"']{8,}" \
    . 2>/dev/null \
    | grep -v node_modules | grep -v dist | grep -v '.example' | grep -v '.md' \
    | grep -v 'password123' | grep -v 'test' | grep -v '// ' | grep -v '* ' \
    || true)

  if [[ -n "$MATCHES" ]]; then
    fail "Potential hardcoded secrets found:"
    echo "$MATCHES" | head -10
    SECRETS_FOUND=1
  fi

  # Check for .env files committed
  ENV_FILES=$(git ls-files '*.env' '.env.*' 2>/dev/null | grep -v '.example' | grep -v '.md' || true)
  if [[ -n "$ENV_FILES" ]]; then
    fail "Environment files tracked by git:"
    echo "$ENV_FILES"
    SECRETS_FOUND=1
  fi

  # Check for private keys
  KEYS=$(grep -rn --include='*.ts' --include='*.js' --include='*.pem' --include='*.key' \
    -l "BEGIN.*PRIVATE KEY" . 2>/dev/null \
    | grep -v node_modules | grep -v dist || true)
  if [[ -n "$KEYS" ]]; then
    fail "Private key files found: $KEYS"
    SECRETS_FOUND=1
  fi

  if [[ "$SECRETS_FOUND" -eq 0 ]]; then
    pass "No hardcoded secrets detected"
  fi

  # Check if gitleaks is available for deep scan
  if command -v gitleaks &>/dev/null; then
    log "Running gitleaks (deep git history scan)..."
    if gitleaks detect --no-banner --no-color -v 2>/dev/null; then
      pass "gitleaks: no secrets in git history"
    else
      warn "gitleaks found potential secrets in git history"
    fi
  else
    warn "gitleaks not installed — skipping deep git history scan"
    echo "  Install: brew install gitleaks (macOS) or go install github.com/gitleaks/gitleaks/v8@latest"
  fi
}

# ─── Container Image Scan ─────────────────────────────────
scan_container() {
  section "CONTAINER IMAGE SCAN"
  TOTAL=$((TOTAL + 1))

  if ! command -v trivy &>/dev/null; then
    warn "Trivy not installed — skipping container scan"
    echo "  Install: brew install trivy (macOS) or see https://trivy.dev"
    return
  fi

  # Scan running images
  IMAGES=$(docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -E 'xclaw|xdev' | grep -v '<none>' || true)

  if [[ -z "$IMAGES" ]]; then
    warn "No xClaw Docker images found locally"
    return
  fi

  CONTAINER_FAIL=0
  while IFS= read -r image; do
    log "Scanning image: $image"
    if trivy image "$image" --severity HIGH,CRITICAL --exit-code 1 --quiet 2>/dev/null; then
      pass "Image $image — no HIGH/CRITICAL vulnerabilities"
    else
      fail "Image $image — vulnerabilities found"
      CONTAINER_FAIL=1
    fi
  done <<< "$IMAGES"

  # Scan Dockerfiles for misconfigurations
  log "Scanning Dockerfiles for misconfigurations..."
  for dockerfile in Dockerfile packages/web/Dockerfile; do
    if [[ -f "$dockerfile" ]]; then
      if trivy config "$dockerfile" --exit-code 0 --quiet 2>/dev/null; then
        pass "Dockerfile $dockerfile — config OK"
      else
        warn "Dockerfile $dockerfile — misconfigurations found"
      fi
    fi
  done
}

# ─── Static Analysis (SAST) ──────────────────────────────
scan_sast() {
  section "STATIC ANALYSIS (SAST)"
  TOTAL=$((TOTAL + 1))

  SAST_ISSUES=0

  # Check for common security patterns
  log "Checking for SQL injection vectors..."
  SQL_INJECTION=$(grep -rn --include='*.ts' \
    -E '\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)' \
    packages/ 2>/dev/null | grep -v node_modules | grep -v dist | grep -v '.test.' || true)
  if [[ -n "$SQL_INJECTION" ]]; then
    fail "Potential SQL injection (template literals in queries):"
    echo "$SQL_INJECTION" | head -5
    SAST_ISSUES=1
  else
    pass "No SQL injection patterns detected"
  fi

  log "Checking for eval() usage..."
  EVAL_USAGE=$(grep -rn --include='*.ts' --include='*.js' \
    -E '\beval\s*\(' packages/ 2>/dev/null \
    | grep -v node_modules | grep -v dist || true)
  if [[ -n "$EVAL_USAGE" ]]; then
    fail "eval() usage found (code injection risk):"
    echo "$EVAL_USAGE" | head -5
    SAST_ISSUES=1
  else
    pass "No eval() usage detected"
  fi

  log "Checking for unsafe innerHTML assignments..."
  INNER_HTML=$(grep -rn --include='*.ts' --include='*.tsx' \
    'dangerouslySetInnerHTML' packages/ 2>/dev/null \
    | grep -v node_modules | grep -v dist || true)
  if [[ -n "$INNER_HTML" ]]; then
    warn "dangerouslySetInnerHTML usage found (XSS risk):"
    echo "$INNER_HTML" | head -5
  else
    pass "No dangerouslySetInnerHTML usage detected"
  fi

  log "Checking for command injection vectors..."
  CMD_INJECTION=$(grep -rn --include='*.ts' \
    -E '(child_process|exec|execSync|spawn)\s*\(' packages/ 2>/dev/null \
    | grep -v node_modules | grep -v dist || true)
  if [[ -n "$CMD_INJECTION" ]]; then
    warn "child_process/exec usage found — verify inputs are sanitized:"
    echo "$CMD_INJECTION" | head -5
  else
    pass "No command injection vectors detected"
  fi

  if [[ "$SAST_ISSUES" -eq 0 ]]; then
    pass "SAST checks passed"
  fi

  # Run semgrep if available
  if command -v semgrep &>/dev/null; then
    log "Running Semgrep (OWASP rules)..."
    semgrep --config=p/owasp-top-ten --config=p/nodejs packages/ \
      --exclude='node_modules' --exclude='dist' \
      --quiet --no-git-ignore 2>/dev/null || warn "Semgrep found issues"
  else
    warn "Semgrep not installed — skipping advanced SAST"
    echo "  Install: pip install semgrep"
  fi
}

# ─── Configuration Audit ──────────────────────────────────
scan_config() {
  section "CONFIGURATION AUDIT"
  TOTAL=$((TOTAL + 1))

  CONFIG_ISSUES=0

  # Check Dockerfile runs as non-root
  log "Checking Dockerfile user..."
  if grep -q 'USER xclaw' Dockerfile 2>/dev/null; then
    pass "Server Dockerfile uses non-root user (xclaw)"
  else
    fail "Server Dockerfile does NOT use non-root user"
    CONFIG_ISSUES=1
  fi

  # Check production compose hides DB ports
  log "Checking production DB port exposure..."
  if [[ -f "docker-compose.prod.yml" ]]; then
    PG_PORTS=$(grep -A2 'postgres:' docker-compose.prod.yml | grep 'ports: \[\]' || true)
    MONGO_PORTS=$(grep -A2 'mongodb:' docker-compose.prod.yml | grep 'ports: \[\]' || true)
    REDIS_PORTS=$(grep -A2 'redis:' docker-compose.prod.yml | grep 'ports: \[\]' || true)

    if [[ -n "$PG_PORTS" && -n "$MONGO_PORTS" && -n "$REDIS_PORTS" ]]; then
      pass "Production compose hides all database ports"
    else
      fail "Production compose may expose database ports"
      CONFIG_ISSUES=1
    fi

    # Check resource limits
    if grep -q 'resources:' docker-compose.prod.yml 2>/dev/null; then
      pass "Production compose has resource limits"
    else
      fail "Production compose missing resource limits"
      CONFIG_ISSUES=1
    fi
  else
    fail "docker-compose.prod.yml not found"
    CONFIG_ISSUES=1
  fi

  # Check .env.example exists (not actual .env)
  if [[ -f ".env.example" ]]; then
    pass ".env.example template exists"
  else
    warn ".env.example not found"
  fi

  # Check CORS configuration
  log "Checking CORS configuration..."
  CORS_WILDCARD=$(grep -rn 'CORS_ORIGINS.*\*' .env* 2>/dev/null | grep -v '.example' || true)
  if [[ -n "$CORS_WILDCARD" ]]; then
    fail "CORS allows wildcard (*) origin — restrict in production"
    CONFIG_ISSUES=1
  else
    pass "CORS not using wildcard origin"
  fi

  # Check health endpoints exist
  log "Checking health endpoints..."
  if grep -rq '/health/deep' packages/gateway/src/ 2>/dev/null; then
    pass "Health endpoints configured"
  else
    warn "Health endpoints not found in gateway"
  fi

  # Check .gitignore includes sensitive files
  log "Checking .gitignore..."
  for pattern in ".env" "*.pem" "*.key" "*.p12"; do
    if grep -q "$pattern" .gitignore 2>/dev/null; then
      pass ".gitignore includes $pattern"
    else
      warn ".gitignore missing pattern: $pattern"
    fi
  done

  if [[ "$CONFIG_ISSUES" -eq 0 ]]; then
    pass "Configuration audit passed"
  fi
}

# ─── AI/LLM Security Verification ────────────────────────
scan_ai() {
  section "AI/LLM SECURITY VERIFICATION"
  TOTAL=$((TOTAL + 1))

  AI_ISSUES=0

  # Check guardrail pipeline exists
  log "Checking guardrail pipeline..."
  if [[ -f "packages/core/src/guardrails/guardrail-pipeline.ts" ]]; then
    pass "GuardrailPipeline exists"
  else
    fail "GuardrailPipeline not found"
    AI_ISSUES=1
  fi

  # Check guardrails are integrated in chat endpoint
  log "Checking guardrail integration in chat endpoint..."
  if grep -q 'guardrails.checkInput' packages/gateway/src/chat.ts 2>/dev/null; then
    pass "Input guardrails integrated in chat endpoint"
  else
    fail "Input guardrails NOT integrated in chat endpoint"
    AI_ISSUES=1
  fi

  if grep -q 'guardrails.checkOutput\|checkOutput' packages/gateway/src/chat.ts 2>/dev/null; then
    pass "Output guardrails integrated in chat endpoint"
  else
    fail "Output guardrails NOT integrated in chat endpoint"
    AI_ISSUES=1
  fi

  # Check prompt injection detector
  log "Checking prompt injection detector..."
  if [[ -f "packages/core/src/guardrails/prompt-injection-detector.ts" ]]; then
    PATTERN_COUNT=$(grep -c 'new RegExp\|/.*/' packages/core/src/guardrails/prompt-injection-detector.ts 2>/dev/null || echo "0")
    if [[ "$PATTERN_COUNT" -ge 5 ]]; then
      pass "Prompt injection detector has $PATTERN_COUNT patterns"
    else
      warn "Prompt injection detector has only $PATTERN_COUNT patterns (recommend 10+)"
    fi
  else
    fail "Prompt injection detector not found"
    AI_ISSUES=1
  fi

  # Check output sanitizer
  log "Checking output sanitizer..."
  if [[ -f "packages/core/src/guardrails/output-sanitizer.ts" ]]; then
    pass "Output sanitizer exists"
  else
    fail "Output sanitizer not found"
    AI_ISSUES=1
  fi

  # Check rate limiter
  log "Checking rate limiter..."
  if grep -q 'LLMRateLimiter\|RateLimiter' packages/gateway/src/chat.ts 2>/dev/null; then
    pass "Rate limiter integrated in chat endpoint"
  else
    fail "Rate limiter NOT found in chat endpoint"
    AI_ISSUES=1
  fi

  # Check RAG tenant isolation
  log "Checking RAG tenant isolation..."
  TENANT_IN_RAG=$(grep -c 'tenantId' packages/core/src/rag/rag-engine.ts 2>/dev/null || echo "0")
  if [[ "$TENANT_IN_RAG" -ge 5 ]]; then
    pass "RAG engine has tenant isolation ($TENANT_IN_RAG references)"
  else
    fail "RAG engine lacks tenant isolation (only $TENANT_IN_RAG references)"
    AI_ISSUES=1
  fi

  # Check session cross-tenant protection
  log "Checking session cross-tenant protection..."
  if grep -q 'session.*tenantId\|tenantId.*session' packages/gateway/src/chat.ts 2>/dev/null; then
    pass "Session cross-tenant protection exists"
  else
    fail "Session cross-tenant protection NOT found"
    AI_ISSUES=1
  fi

  # Check streaming guardrails
  log "Checking streaming guardrails..."
  if grep -q 'security-warning\|guardCtx\|accumulatedContent' packages/gateway/src/chat.ts 2>/dev/null; then
    pass "Streaming guardrails implemented"
  else
    warn "Streaming guardrails may not be implemented"
  fi

  if [[ "$AI_ISSUES" -eq 0 ]]; then
    pass "AI/LLM security checks all passed"
  fi
}

# ─── Main ─────────────────────────────────────────────────
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      xClaw Security Scan — $(date +%Y-%m-%d)          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"

case "$SCAN_TYPE" in
  full)
    scan_deps
    scan_secrets
    scan_container
    scan_sast
    scan_config
    scan_ai
    ;;
  deps)      scan_deps ;;
  secrets)   scan_secrets ;;
  container) scan_container ;;
  sast)      scan_sast ;;
  config)    scan_config ;;
  ai)        scan_ai ;;
  *)
    echo "Usage: $0 [full|deps|secrets|container|sast|config|ai]"
    exit 1
    ;;
esac

# ─── Summary ──────────────────────────────────────────────
section "SCAN SUMMARY"
echo -e "  ${GREEN}Passed:  $PASS${NC}"
echo -e "  ${YELLOW}Warnings: $WARN${NC}"
echo -e "  ${RED}Failed:  $FAIL${NC}"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  echo -e "${RED}❌ Security scan FAILED — $FAIL issue(s) require attention${NC}"
  exit 1
elif [[ "$WARN" -gt 0 ]]; then
  echo -e "${YELLOW}⚠️  Security scan PASSED with $WARN warning(s)${NC}"
  exit 0
else
  echo -e "${GREEN}✅ Security scan PASSED — all checks clean${NC}"
  exit 0
fi
