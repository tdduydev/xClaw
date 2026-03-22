#!/usr/bin/env bash
# ============================================================
# xClaw — Secret Detection Script
# Usage: ./deploy/scripts/secret-scan.sh [mode]
#   mode: quick | deep | pre-commit
#   Default: quick (scan working tree only)
# ============================================================
set -euo pipefail

MODE="${1:-quick}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

FINDINGS=0

log()  { echo -e "${GREEN}[secret-scan]${NC} $*"; }
warn() { echo -e "${YELLOW}[secret-scan]${NC} $*"; }
fail() { echo -e "${RED}[secret-scan]${NC} $*"; FINDINGS=$((FINDINGS + 1)); }

cd "$ROOT_DIR"

echo ""
echo -e "${CYAN}═══ xClaw Secret Detection ($MODE) ═══${NC}"
echo ""

# ─── Pattern Definitions ──────────────────────────────────
# High-confidence patterns that indicate real secrets
PATTERNS=(
  'AKIA[0-9A-Z]{16}'                           # AWS Access Key
  'AIza[0-9A-Za-z_-]{35}'                      # Google API Key
  'sk-[0-9a-zA-Z]{48}'                         # OpenAI API Key
  'sk-ant-api[0-9a-zA-Z_-]{90,}'              # Anthropic API Key
  'ghp_[0-9a-zA-Z]{36}'                        # GitHub PAT
  'gho_[0-9a-zA-Z]{36}'                        # GitHub OAuth
  'github_pat_[0-9a-zA-Z_]{82}'               # GitHub Fine-Grained PAT
  'xoxb-[0-9]{11,13}-[0-9]{11,13}-[a-zA-Z0-9]{24}'  # Slack Bot Token
  'xoxp-[0-9]{11,13}-[0-9]{11,13}-[a-zA-Z0-9]{24}'  # Slack User Token
  'SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}'  # SendGrid API Key
  'sk_live_[0-9a-zA-Z]{24,}'                   # Stripe Live Key
  'rk_live_[0-9a-zA-Z]{24,}'                   # Stripe Restricted Key
  'mongodb(\+srv)?://[^:]+:[^@]+@'             # MongoDB connection string with password
  'postgres(ql)?://[^:]+:[^@]+@'               # PostgreSQL connection string with password
  'redis://[^:]*:[^@]+@'                       # Redis connection string with password
)

# Exclusion patterns (test data, examples, comments)
EXCLUDE_DIRS="node_modules|dist|.git|coverage|.next|build"
EXCLUDE_FILES=".example|.md|.test.|.spec.|__test__|__mock__|secret-scan.sh"

# ─── Quick Scan (working tree) ────────────────────────────
scan_quick() {
  log "Scanning working tree for high-confidence secret patterns..."

  for pattern in "${PATTERNS[@]}"; do
    MATCHES=$(grep -rn \
      --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
      --exclude-dir=coverage --exclude-dir=.next --exclude-dir=build \
      --include='*.ts' --include='*.js' --include='*.json' \
      --include='*.yml' --include='*.yaml' --include='*.env' --include='*.sh' \
      --include='*.toml' --include='*.cfg' \
      -E "$pattern" . 2>/dev/null \
      | grep -vE "$EXCLUDE_FILES" \
      || true)

    if [[ -n "$MATCHES" ]]; then
      fail "Pattern match ($pattern):"
      echo "$MATCHES" | head -5
      echo ""
    fi
  done

  # Check for .env files with actual secrets
  log "Checking for committed .env files..."
  ENV_FILES=$(git ls-files 2>/dev/null | grep -E '\.env$|\.env\.' | grep -v '.example' || true)
  if [[ -n "$ENV_FILES" ]]; then
    fail "Environment files tracked by git:"
    echo "$ENV_FILES"
  fi

  # Check for private key files
  log "Checking for private key files..."
  KEY_FILES=$(find . -type f \( -name '*.pem' -o -name '*.key' -o -name '*.p12' -o -name '*.pfx' \) \
    -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' 2>/dev/null || true)
  if [[ -n "$KEY_FILES" ]]; then
    fail "Private key files found:"
    echo "$KEY_FILES"
  fi
}

# ─── Deep Scan (git history) ──────────────────────────────
scan_deep() {
  log "Scanning git history for secrets..."

  if command -v gitleaks &>/dev/null; then
    IGNORE_FILE=""
    if [[ -f ".gitleaksignore" ]]; then
      IGNORE_FILE="--gitleaks-ignore-path .gitleaksignore"
    fi

    log "Running gitleaks (full git history)..."
    if gitleaks detect --no-banner $IGNORE_FILE 2>&1; then
      log "✅ gitleaks: no secrets found in git history"
    else
      fail "gitleaks found secrets in git history"
      echo "  Run 'gitleaks detect -v' for details"
    fi
  else
    warn "gitleaks not installed — falling back to git log grep"
    echo "  Install: brew install gitleaks"

    # Fallback: scan recent commits
    log "Scanning last 100 commits for secrets..."
    for pattern in "${PATTERNS[@]}"; do
      MATCHES=$(git log -100 --all -p 2>/dev/null | grep -E "$pattern" || true)
      if [[ -n "$MATCHES" ]]; then
        fail "Pattern found in git history ($pattern):"
        echo "$MATCHES" | head -3
        echo ""
      fi
    done
  fi
}

# ─── Pre-commit Scan (staged files) ──────────────────────
scan_precommit() {
  log "Scanning staged files for secrets..."

  STAGED=$(git diff --cached --name-only 2>/dev/null || true)
  if [[ -z "$STAGED" ]]; then
    log "No staged files to scan"
    return
  fi

  while IFS= read -r file; do
    if [[ ! -f "$file" ]]; then
      continue
    fi

    for pattern in "${PATTERNS[@]}"; do
      MATCH=$(grep -nE "$pattern" "$file" 2>/dev/null || true)
      if [[ -n "$MATCH" ]]; then
        fail "Secret in staged file $file:"
        echo "  $MATCH"
      fi
    done
  done <<< "$STAGED"
}

# ─── Main ─────────────────────────────────────────────────
case "$MODE" in
  quick)
    scan_quick
    ;;
  deep)
    scan_quick
    scan_deep
    ;;
  pre-commit)
    scan_precommit
    ;;
  *)
    echo "Usage: $0 [quick|deep|pre-commit]"
    exit 1
    ;;
esac

# ─── Summary ──────────────────────────────────────────────
echo ""
if [[ "$FINDINGS" -gt 0 ]]; then
  echo -e "${RED}❌ Secret scan found $FINDINGS issue(s) — review and remediate${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Secret scan clean — no secrets detected${NC}"
  exit 0
fi
