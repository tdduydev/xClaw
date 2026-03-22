---
name: devops
description: >-
  Use when working with DevOps tasks: CI/CD pipelines, Docker deployment, production deploy,
  rollback, backup/restore databases, health checks, monitoring, incident response,
  infrastructure configuration, or security hardening in xClaw.
  DO NOT USE FOR: application code changes, frontend UI, database schema design.
---

# DevOps Skill — xClaw Platform

## Overview

xClaw uses Docker Compose for all environments. The platform runs 5 services:
PostgreSQL 18, MongoDB 7, Redis 8, xClaw API server (Node.js/Hono), and Web frontend (Nginx).

## Directory Layout

```
xClaw/
├── docker-compose.yml              # Dev environment (default)
├── docker-compose.prod.yml         # Production overrides
├── Dockerfile                      # Server multi-stage build
├── .env.example                    # Dev environment template
├── .dockerignore
├── deploy/
│   ├── scripts/
│   │   ├── deploy.sh               # Deploy helper (dev/staging/prod)
│   │   ├── rollback.sh             # Rollback to previous image
│   │   ├── health-check.sh         # Verify all health endpoints
│   │   ├── backup-postgres.sh      # PostgreSQL backup
│   │   └── backup-mongodb.sh       # MongoDB backup
│   ├── runbooks/
│   │   ├── deployment.md           # Deployment procedures
│   │   ├── rollback.md             # Rollback procedures
│   │   ├── disaster-recovery.md    # DR plan & restore steps
│   │   └── incident-response.md    # Incident triage & response
│   └── env/
│       └── .env.production.example # Production env template
├── packages/web/
│   ├── Dockerfile                  # Web frontend build
│   └── nginx.conf                  # Nginx SPA + API proxy config
├── scripts/
│   └── publish-all.sh              # npm publish helper (not deploy)
└── .github/
    ├── workflows/
    │   ├── ci.yml                  # CI: lint, typecheck, security, Docker build
    │   ├── docker-publish.yml      # CD: build & push images to GHCR
    │   ├── packages-publish.yml    # npm package publish
    │   ├── docs-ci.yml             # Docs CI
    │   ├── docs-publish-docker.yml # Docs Docker publish
    │   └── docs-deploy-pages.yml   # Docs GitHub Pages
    └── dependabot.yml              # Auto dependency updates
```

## Procedure: Deployment

1. Read the runbook: `deploy/runbooks/deployment.md`
2. For dev: `./deploy/scripts/deploy.sh dev`
3. For production: `./deploy/scripts/deploy.sh production`
4. Always verify with: `./deploy/scripts/health-check.sh`

## Procedure: Rollback

1. Read the runbook: `deploy/runbooks/rollback.md`
2. Quick: `./deploy/scripts/rollback.sh xclaw <tag>`
3. Always verify health after rollback

## Procedure: Backup & Restore

```bash
# Backup
./deploy/scripts/backup-postgres.sh ./backups/postgres
./deploy/scripts/backup-mongodb.sh ./backups/mongodb

# Restore — see deploy/runbooks/disaster-recovery.md
```

## Procedure: CI/CD Pipeline Changes

When modifying `.github/workflows/*.yml`:
1. Use `concurrency` to cancel duplicate runs
2. Use `actions/checkout@v4` with `submodules: recursive` if build needs plugins
3. Cache npm: `actions/setup-node@v4` with `cache: npm`
4. For Docker builds: `docker/setup-buildx-action@v3` + GHA cache
5. Test workflow changes on a feature branch first

## Procedure: Incident Response

1. Read the runbook: `deploy/runbooks/incident-response.md`
2. Run `./deploy/scripts/health-check.sh` to assess
3. Check Docker logs: `docker compose logs --since 10m xclaw`
4. Escalation: SEV-1/2 → immediate rollback, SEV-3/4 → investigate

## Health Endpoints

| Endpoint | Purpose | Use For |
|----------|---------|---------|
| `GET /health` | Liveness | Container orchestrator liveness probe |
| `GET /health/ready` | Readiness | Load balancer readiness check |
| `GET /health/deep` | Deep check | Debugging, shows PG/Mongo/Memory status |

## Critical Rules

- **NEVER** expose database ports externally in production
- **NEVER** hardcode secrets in Docker images or compose files
- **NEVER** run `npm run build` on host — always use Docker
- **ALWAYS** backup databases before deploying migration changes
- **ALWAYS** run health checks after every deployment
- **ALWAYS** use `docker compose -f docker-compose.yml -f docker-compose.prod.yml` for production
- Server Dockerfile uses non-root user `xclaw` (UID 1001) for security

## Docker Image Registry

- Registry: `ghcr.io/xdev-asia/`
- Server: `ghcr.io/xdev-asia/xclaw-server`
- Web: `ghcr.io/xdev-asia/xclaw-web`
- Tags: `latest`, `v2.1.0`, `sha-abc1234`, `develop`

## Environment Differences

| Setting | Dev | Production |
|---------|-----|------------|
| `NODE_ENV` | development | production |
| DB ports exposed | Yes | No (internal only) |
| Resource limits | None | Memory + CPU capped |
| Log rotation | None | max-size 50m, 5 files |
| Image source | Local build | GHCR pre-built |
| Health checks | Manual | Automated probes |
