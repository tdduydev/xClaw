---
description: "Use when working with security scanning, vulnerability management, secret detection, AI guardrails, container hardening, or security incident response in xClaw"
applyTo: ["packages/core/src/guardrails/**", "deploy/scripts/security-*.sh", "deploy/scripts/secret-*.sh", "deploy/runbooks/security-*.md", ".trivyignore", ".gitleaksignore"]
---
# Security & DevSecOps Instructions

## Security Scan Scripts

Located in `deploy/scripts/`:
- `security-scan.sh [full|deps|secrets|container|sast|config|ai]` — Comprehensive scanner
- `secret-scan.sh` — Secret detection in repository

## Guardrail Files

All guardrails live in `packages/core/src/guardrails/`:

| File | Purpose | Key Export |
|------|---------|------------|
| `types.ts` | Type definitions | `GuardrailResult`, `GuardrailContext` |
| `guardrail-pipeline.ts` | Orchestrator | `GuardrailPipeline` |
| `prompt-injection-detector.ts` | Input guard | `PromptInjectionDetector` |
| `output-sanitizer.ts` | Output guard | `OutputSanitizer` |
| `topic-scope-guard.ts` | Domain scoping | `TopicScopeGuard` |
| `rate-limiter.ts` | Rate limiting | `LLMRateLimiter` |

Exported from `packages/core/src/index.ts`.

## Adding New Guardrails

1. Create file in `packages/core/src/guardrails/`
2. Implement `InputGuardrail` or `OutputGuardrail` interface from `types.ts`
3. Export from `packages/core/src/index.ts`
4. Register in `packages/gateway/src/chat.ts` pipeline initialization

```typescript
// Example: new input guardrail
import type { InputGuardrail, GuardrailResult, GuardrailContext } from './types.js';

export class MyNewGuard implements InputGuardrail {
  name = 'my-new-guard';
  async check(input: string, context: GuardrailContext): Promise<GuardrailResult> {
    // ... detection logic
    return { pass: true, guard: this.name, reason: 'clean' };
  }
}
```

## Security Incident Runbook

Located at `deploy/runbooks/security-incident.md`. Follow for:
- Data breach response
- Unauthorized access
- Vulnerability exploitation
- Compromised credentials

## Container Security

- Server runs as `xclaw` user (UID 1001) — never root
- Trivy scans in CI block CRITICAL vulnerabilities
- Production: no database ports exposed, resource limits enforced
- All images multi-stage built (minimal attack surface)

## Authentication & Authorization

- JWT HS256 with 24h expiry
- PBKDF2 password hashing (in `packages/gateway/src/auth.ts`)
- RBAC via roles/permissions tables
- Tenant middleware isolates all API routes by `tenantId`
- Every protected route: `authMiddleware` → `tenantMiddleware` → handler

## Secret Management Rules

- Secrets in `.env` files only (never in source code)
- `.env` files in `.gitignore`
- Templates: `.env.example`, `deploy/env/.env.production.example`
- Rotate JWT secret and DB passwords quarterly (or after any compromise)
- CI uses GitHub Secrets / OIDC tokens (never hardcoded)
