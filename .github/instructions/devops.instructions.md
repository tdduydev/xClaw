---
description: "Use when working with DevOps, CI/CD, Docker, docker-compose, Dockerfile, deployment, monitoring, backup, or infrastructure in xClaw"
applyTo: [".github/workflows/**", "docker-compose*.yml", "Dockerfile", "packages/server/**", "deploy/**", "scripts/**"]
---
# DevOps & Docker Instructions

## Docker Compose Services

| Service | Image | Port (dev) | Port (prod) | Purpose |
|---------|-------|-----------|------------|---------|
| postgres | postgres:18-alpine | 5432 | internal | Config/structured data |
| mongodb | mongo:7 | 27018 | internal | AI/conversational data |
| redis | redis:8-alpine | 6379 | internal | Cache |
| xclaw | built from Dockerfile | 5001 | 5001 | API server |
| web | packages/web/Dockerfile | 3000 | 3000 | Frontend (Nginx) |

## Build & Run

```bash
# Development
docker compose up --build

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f xclaw
```

- **Never** run `npm run build` or `npm test` directly on host
- Always use Docker Compose for consistency
- Clone with `--recurse-submodules` for plugins

## Server Startup Sequence

In `packages/server/src/index.ts`:
1. `runMigrations()` — PostgreSQL migrations
2. `connectMongo()` — MongoDB connection
3. `seedInitialData()` — Idempotent seed

Each step wrapped in try/catch.

## Dockerfile Notes

- Multi-stage build: deps → builder → runner
- Non-root user `xclaw` (UID 1001) in runner stage
- SQL migrations explicitly copied: `cp -r src/migrations dist/migrations`
- Final stage: slim Node image with only `dist/` and `node_modules/`

## CI/CD Workflows

| Workflow | File | Trigger |
|----------|------|---------|
| CI — Build, Lint & Test | `ci.yml` | PR + push to main/develop |
| Docker — Publish Images | `docker-publish.yml` | Push to main, tags v* |
| Packages — npm Publish | `packages-publish.yml` | Push to main (src changes) |

## Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness — uptime/version |
| `GET /health/ready` | Readiness — DB connections alive |
| `GET /health/deep` | Deep — PG, Mongo, memory with latency |

## Deploy Scripts

All operational scripts are in `deploy/scripts/`:
- `deploy.sh [dev|staging|production]` — Full deploy with health checks
- `rollback.sh [xclaw|web] [tag]` — Rollback to specific image
- `health-check.sh [base_url]` — Verify all health endpoints
- `backup-postgres.sh [dir]` — PostgreSQL backup
- `backup-mongodb.sh [dir]` — MongoDB backup

## Runbooks

Located in `deploy/runbooks/`:
- `deployment.md` — Step-by-step deployment procedures
- `rollback.md` — Rollback triggers and procedures
- `disaster-recovery.md` — DR plan and restore steps
- `incident-response.md` — Incident triage and response

## Docker Image Tags

- `latest` — latest main build
- `v2.1.0` — release tag (sem ver)
- `sha-abc1234` — commit SHA for traceability
- `develop` — latest develop build

## Security Rules

- NEVER expose database ports in production
- NEVER hardcode secrets in Dockerfiles or compose files
- ALWAYS backup before deploying migrations
- Trivy scan on all images before deploying
- Non-root container user in production

## Adding a New Workflow

1. Create `.github/workflows/<name>.yml`
2. Use `concurrency` to cancel duplicate runs
3. Use `actions/checkout@v4` with `submodules: recursive` if builds need plugins
4. Cache npm with `actions/setup-node@v4` `cache: npm`
5. For Docker builds, use `docker/setup-buildx-action@v3` + GHA cache
5. For Docker builds, use `docker/setup-buildx-action@v3` + GHA cache
