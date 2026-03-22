# Deployment Procedures

## Environments

| Environment | Branch | Compose | Domain |
|-------------|--------|---------|--------|
| Development | feature/* | `docker-compose.yml` | localhost |
| Staging | develop | `docker-compose.yml` + `docker-compose.prod.yml` | staging.xclaw.xdev.asia |
| Production | main (tags) | `docker-compose.yml` + `docker-compose.prod.yml` | xclaw.xdev.asia |

## Quick Deploy

```bash
# Development
./deploy/scripts/deploy.sh dev

# Staging
./deploy/scripts/deploy.sh staging

# Production (requires confirmation)
./deploy/scripts/deploy.sh production
```

## Manual Deploy Steps

### 1. Pre-deploy Checklist

- [ ] All CI checks pass on the branch
- [ ] Docker images built successfully
- [ ] Trivy scan — no CRITICAL vulnerabilities
- [ ] Database migration tested on staging
- [ ] `.env` updated for target environment
- [ ] Database backup completed

### 2. Deploy

```bash
# Pull latest images
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull

# Start/restart services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Or restart only a specific service
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps xclaw
```

### 3. Post-deploy Verification

```bash
# Run health checks
./deploy/scripts/health-check.sh http://localhost:5001

# Check logs for errors
docker compose logs -f --tail 100 xclaw

# Verify key endpoints
curl -s http://localhost:5001/health/deep | python3 -m json.tool
```

### 4. Post-deploy Monitoring (first 30 minutes)

- Watch error rate in logs
- Monitor `/health/deep` for degraded services
- Check API response times
- Verify frontend loads correctly at port 3000

## Docker Image Tags

| Tag Pattern | Meaning | Example |
|-------------|---------|---------|
| `latest` | Latest main branch build | `ghcr.io/xdev-asia/xclaw-server:latest` |
| `v*.*.*` | Release version | `ghcr.io/xdev-asia/xclaw-server:v2.1.0` |
| `sha-*` | Specific commit | `ghcr.io/xdev-asia/xclaw-server:sha-abc1234` |
| `develop` | Latest develop branch | `ghcr.io/xdev-asia/xclaw-server:develop` |

## Database Migrations

Migrations run automatically on server startup via `runMigrations()`. For production:

1. **Always** backup the database before deploying migration changes
2. Test the migration on staging first
3. The server startup sequence is: `runMigrations()` → `connectMongo()` → `seedInitialData()`
4. Each step is wrapped in try/catch — a migration failure won't crash the server

## Service Ports

| Service | Internal Port | External Port (dev) | External Port (prod) |
|---------|--------------|--------------------|--------------------|
| xclaw (API) | 5001 | 5001 | 5001 |
| web (Nginx) | 80 | 3000 | 3000 |
| PostgreSQL | 5432 | 5432 | — (internal only) |
| MongoDB | 27017 | 27018 | — (internal only) |
| Redis | 6379 | 6379 | — (internal only) |
