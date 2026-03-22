---
name: devsecops
description: >-
  Use when performing security audits, vulnerability scanning, SAST/DAST, secret detection,
  dependency auditing, container hardening, compliance checks, AI/LLM security (OWASP Top 10 for LLM),
  guardrail configuration, and security incident response in xClaw.
  DO NOT USE FOR: general application features, frontend UI, database schema design.
---

# DevSecOps Skill — xClaw Platform

## Overview

xClaw requires security at every layer: infrastructure, CI/CD pipeline, application code,
AI guardrails, and multi-tenant data isolation. This skill covers all security operations.

## Security Architecture

```
┌─────────────────────────────────────────────────────┐
│                    NETWORK LAYER                     │
│  Nginx reverse proxy · CORS · TLS · Rate limiting   │
├─────────────────────────────────────────────────────┤
│                  CONTAINER LAYER                     │
│  Non-root user · Trivy scan · Minimal base image    │
│  No DB ports exposed (prod) · Resource limits       │
├─────────────────────────────────────────────────────┤
│                 APPLICATION LAYER                    │
│  JWT auth (HS256) · RBAC · Tenant middleware         │
│  Input validation · OWASP Top 10 protections         │
├─────────────────────────────────────────────────────┤
│                   AI/LLM LAYER                       │
│  Prompt Injection Detector · Output Sanitizer        │
│  Topic Scope Guard · Rate Limiter (per-tenant)       │
│  Streaming guardrails · PII detection                │
├─────────────────────────────────────────────────────┤
│                    DATA LAYER                        │
│  Tenant-isolated RAG · Session cross-tenant check    │
│  Encrypted connections · Parameterized queries       │
│  Audit logging · Memory entry isolation              │
└─────────────────────────────────────────────────────┘
```

## Directory Layout

```
xClaw/
├── packages/core/src/guardrails/
│   ├── types.ts                    # GuardrailResult, GuardrailContext
│   ├── guardrail-pipeline.ts       # Pipeline orchestrator (fail-fast)
│   ├── prompt-injection-detector.ts # 14 regex patterns, heuristic scoring
│   ├── output-sanitizer.ts         # System prompt leak + XSS removal
│   ├── topic-scope-guard.ts        # Domain-scoped topic enforcement
│   └── rate-limiter.ts             # Sliding-window per-tenant limiter
├── packages/gateway/src/
│   ├── auth.ts                     # JWT auth middleware, password hashing
│   ├── tenant.ts                   # Tenant isolation middleware
│   └── chat.ts                     # Guardrail integration point
├── deploy/
│   ├── scripts/
│   │   ├── security-scan.sh        # Comprehensive security scanner
│   │   └── secret-scan.sh          # Secret detection in repo
│   └── runbooks/
│       └── security-incident.md    # Security incident response
├── .github/
│   ├── workflows/ci.yml            # Security audit & Trivy scan jobs
│   └── dependabot.yml              # Auto dependency updates
└── .trivyignore                    # Accepted vulnerability exceptions
```

## Procedure: Full Security Audit

Run a comprehensive security audit across all layers:

```bash
./deploy/scripts/security-scan.sh full
```

Individual scan types:
```bash
./deploy/scripts/security-scan.sh deps      # npm audit
./deploy/scripts/security-scan.sh secrets    # Secret detection
./deploy/scripts/security-scan.sh container  # Trivy image scan
./deploy/scripts/security-scan.sh sast       # Static analysis
./deploy/scripts/security-scan.sh config     # Docker/compose config audit
./deploy/scripts/security-scan.sh ai         # AI guardrail verification
```

## Procedure: Dependency Vulnerability Management

1. Check current vulnerabilities: `npm audit --omit=dev`
2. Review Dependabot PRs weekly
3. For CRITICAL: patch within 24 hours
4. For HIGH: patch within 7 days
5. For MEDIUM: patch in next sprint
6. Document exceptions in `.trivyignore` with justification

## Procedure: Container Hardening Checklist

| Check | How to Verify | Expected |
|-------|---------------|----------|
| Non-root user | `grep 'USER xclaw' Dockerfile` | Present |
| Minimal base image | `grep 'FROM.*alpine' Dockerfile` | Alpine-based |
| No secrets in image | `docker history xclaw-server:latest` | No env secrets |
| DB ports hidden (prod) | `grep 'ports: \[\]' docker-compose.prod.yml` | All DBs have `[]` |
| Resource limits | Check `deploy.resources.limits` in prod compose | Memory + CPU set |
| Health checks | `docker inspect --format='{{.State.Health}}' xclaw` | healthy |
| Read-only rootfs | Optional: `read_only: true` in compose | Recommended |
| No new privileges | Optional: `security_opt: [no-new-privileges:true]` | Recommended |

## Procedure: AI/LLM Security Audit

### Input Security
1. Verify `GuardrailPipeline` is initialized in chat.ts
2. Confirm `checkInput()` runs before every LLM call
3. Review `PromptInjectionDetector` patterns for coverage
4. Check `TopicScopeGuard` domain configuration
5. Verify `LLMRateLimiter` is enforced per-tenant

### Output Security
1. Verify `checkOutput()` runs after LLM response
2. Check `OutputSanitizer` for system prompt leak patterns
3. Verify XSS patterns are stripped from output
4. Confirm streaming guardrails (post-stream check + security-warning event)

### Data Isolation
1. RAG `retrieve()` must filter by tenantId
2. `ingestText()` / `ingestUrl()` must tag documents with tenantId
3. `getOrCreateSession()` must verify tenant ownership
4. GET/PUT/DELETE `/conversations/:id` must enforce tenantId
5. All knowledge routes must pass tenantId to RAG engine

## Procedure: Secret Rotation

### JWT Secret Rotation
1. Generate new secret: `openssl rand -hex 64`
2. Update `.env`: `JWT_SECRET=<new-secret>`
3. Deploy with rolling restart (users re-auth within 24h)
4. Old tokens expire naturally (24h TTL)

### Database Password Rotation
1. Generate new password: `openssl rand -base64 32`
2. Update PostgreSQL: `ALTER USER xclaw PASSWORD '<new>';`
3. Update `.env`: `PG_PASSWORD=<new-password>`
4. Restart xclaw service: `docker compose restart xclaw`
5. Verify: `./deploy/scripts/health-check.sh`

## Procedure: Security Incident Response

Follow `deploy/runbooks/security-incident.md`:

1. **Detect** — Alert from monitoring, user report, or automated scan
2. **Classify** — Data breach? Unauthorized access? Vulnerability exploitation?
3. **Contain** — Isolate: block IP, revoke tokens, disable affected feature
4. **Eradicate** — Patch vulnerability, rotate compromised credentials
5. **Recover** — Restore from known-good state, verify integrity
6. **Lessons** — Post-mortem with timeline, root cause, action items

## CI/CD Security Pipeline

The CI workflow (`.github/workflows/ci.yml`) includes:

| Job | Tool | Purpose |
|-----|------|---------|
| `lint` | ESLint | Code quality + security rules |
| `typecheck` | TypeScript strict | Type safety |
| `security` | npm audit | Dependency vulnerabilities (HIGH+) |
| `docker-build` | Docker Buildx | Build verification |
| `trivy-scan` | Trivy | Container image vulnerabilities (CRITICAL = fail) |

### Adding New Security Checks to CI

```yaml
# Example: Add SAST scanning
sast-scan:
  name: SAST Scan
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Run Semgrep
      uses: semgrep/semgrep-action@v1
      with:
        config: >-
          p/owasp-top-ten
          p/nodejs
          p/typescript
```

## Critical Security Rules

- **NEVER** disable guardrails in production
- **NEVER** log or store PII, tokens, or passwords in plain text
- **NEVER** hardcode secrets in source code or Docker images
- **NEVER** expose database ports in production
- **NEVER** skip Trivy scan before deploying images
- **ALWAYS** run security-scan.sh before major releases
- **ALWAYS** rotate secrets after any suspected compromise
- **ALWAYS** use parameterized queries (Drizzle ORM handles this)
- **ALWAYS** verify tenant isolation after any RAG or session changes
- **ALWAYS** reference CVE/CWE IDs in vulnerability reports

## OWASP Top 10 for LLM Applications 2025

| ID | Threat | Status | Mitigation |
|----|--------|--------|------------|
| LLM01 | Prompt Injection | ✅ Protected | `PromptInjectionDetector` (14 patterns, scoring) |
| LLM02 | Sensitive Info Disclosure | ✅ Protected | `OutputSanitizer` (system prompt leak detection) |
| LLM03 | Supply Chain Vulnerabilities | ✅ Protected | Trivy + npm audit + Dependabot |
| LLM04 | Data/Model Poisoning | ✅ Protected | Tenant-isolated RAG, input validation |
| LLM05 | Improper Output Handling | ✅ Protected | `OutputSanitizer` (XSS removal) |
| LLM06 | Excessive Agency | ✅ Protected | `TopicScopeGuard` (domain scoping) |
| LLM07 | System Prompt Leakage | ✅ Protected | Regex patterns for prompt fragments |
| LLM08 | Vector/Embedding Weakness | ✅ Protected | Tenant-scoped vector search |
| LLM09 | Misinformation | ⚠️ Partial | RAG-grounded, needs source attribution |
| LLM10 | Unbounded Consumption | ✅ Protected | `LLMRateLimiter` (60/min per-tenant) |

## Monitoring Thresholds (Security)

| Metric | Warning | Critical |
|--------|---------|----------|
| Guardrail blocks/hour | > 10 | > 50 |
| Failed auth attempts/IP | > 5/min | > 20/min |
| Rate limit triggers/tenant | > 30/min | > 55/min |
| Trivy CRITICAL findings | > 0 | Deploy blocked |
| npm audit HIGH findings | > 0 | Review required |
| Secret scan positive | ANY | Immediate rotation |
