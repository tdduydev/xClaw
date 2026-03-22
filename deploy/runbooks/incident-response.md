# Incident Response

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **SEV-1** | Complete outage | 15 min | All APIs down, data loss |
| **SEV-2** | Major degradation | 30 min | Auth broken, 50%+ errors |
| **SEV-3** | Minor degradation | 2 hours | Slow responses, single feature down |
| **SEV-4** | Low impact | 24 hours | Cosmetic issues, non-critical bugs |

## Triage Steps

### 1. Assess Impact

```bash
# Check all health endpoints
./deploy/scripts/health-check.sh

# Check service status
docker compose ps

# Check recent logs
docker compose logs --since 10m xclaw 2>&1 | grep -ic "error"
```

### 2. Identify Root Cause

| Symptom | Likely Cause | Quick Fix |
|---------|-------------|-----------|
| `/health` returns 503 | Server crashed | `docker compose restart xclaw` |
| `/health/ready` fails | DB connection lost | Restart database services |
| `/health/deep` shows degraded | Specific dependency down | Check the failing component |
| High latency (>2s) | DB slow queries / OOM | Check logs, increase resources |
| 401/403 on all requests | JWT secret mismatch | Check `.env` JWT_SECRET |
| CORS errors | Origin not allowed | Check `CORS_ORIGINS` in env |

### 3. Mitigate

**If the issue is the latest deploy:**

```bash
./deploy/scripts/rollback.sh xclaw <previous-tag>
```

**If a database is unresponsive:**

```bash
docker compose restart postgres  # or mongodb, redis
```

**If resources are exhausted:**

```bash
# Check resource usage
docker stats --no-stream

# Restart the offending service
docker compose restart xclaw
```

### 4. Communicate

For SEV-1 and SEV-2:

1. Post in the team Slack channel immediately
2. Create a GitHub issue with label `incident`
3. Update stakeholders every 30 minutes until resolved

### 5. Post-Mortem Template

After resolution, create a post-mortem document:

```markdown
## Incident: [Brief title]
- **Date**: YYYY-MM-DD
- **Duration**: X hours Y minutes
- **Severity**: SEV-N
- **Impact**: [Who/what was affected]

### Timeline
- HH:MM — Issue detected
- HH:MM — Investigation started
- HH:MM — Root cause identified
- HH:MM — Fix applied
- HH:MM — Service restored

### Root Cause
[Description]

### Resolution
[What was done to fix it]

### Action Items
- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]
```

## Monitoring Thresholds

| Metric | Warning | Critical (SEV-2) |
|--------|---------|-------------------|
| API response time p95 | > 500ms | > 2000ms |
| HTTP 5xx error rate | > 1% | > 5% |
| CPU usage | > 70% | > 90% |
| Memory usage | > 70% | > 90% |
| Disk usage | > 70% | > 90% |
| DB connection pool | > 80% | > 95% |
