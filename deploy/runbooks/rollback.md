# Rollback Procedures

## When to Rollback

Trigger an immediate rollback if ANY of these occur within 30 minutes after deploy:

| Condition | Threshold |
|-----------|-----------|
| HTTP 5xx error rate | > 5% for 5 minutes |
| Health check failures | > 3 consecutive failures |
| P95 API latency | > 5 seconds for 5 minutes |
| Critical user-facing bug | Any severity |

## Quick Rollback

```bash
# Rollback server to a specific tag
./deploy/scripts/rollback.sh xclaw sha-abc1234

# Rollback web frontend
./deploy/scripts/rollback.sh web sha-abc1234

# Interactive (lists available images)
./deploy/scripts/rollback.sh xclaw
```

## Manual Rollback Steps

### 1. Identify the Last Known Good Version

```bash
# List recent server images
docker images --filter "reference=ghcr.io/xdev-asia/xclaw-server*" \
  --format "{{.Tag}}\t{{.CreatedAt}}" | head -10

# Or check GHCR for available tags
# https://github.com/xdev-asia/xClaw/pkgs/container/xclaw-server
```

### 2. Pin and Restart

```bash
# Set the image to the known good version
export XCLAW_SERVER_IMAGE=ghcr.io/xdev-asia/xclaw-server:sha-abc1234

# Restart only the affected service
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps xclaw
```

### 3. Verify Rollback

```bash
./deploy/scripts/health-check.sh http://localhost:5001
```

### 4. Investigate Root Cause

```bash
# Check logs from the failed deployment
docker compose logs --since 1h xclaw | grep -i "error\|fatal\|panic"

# Check the deep health endpoint
curl -s http://localhost:5001/health/deep | python3 -m json.tool
```

## Database Rollback

Database schema changes (Drizzle migrations) are **forward-only** by default. If a migration caused issues:

1. **Do NOT** manually alter the database schema
2. Create a new migration that reverts the schema change
3. Test the revert migration on staging
4. Deploy the revert migration as a normal deployment

```bash
# Generate a new migration to revert
cd packages/db
npx drizzle-kit generate
# Edit the generated SQL to reverse the problematic change
```

## Post-Rollback

- [ ] Verify all health checks pass
- [ ] Notify the team about the rollback
- [ ] Create a post-mortem issue
- [ ] Identify root cause before re-attempting deployment
