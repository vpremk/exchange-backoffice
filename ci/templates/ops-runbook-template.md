# Operations Runbook: <Service/Feature Name>

## Service Overview
- **Service:** <service name>
- **Owner:** <team/person>
- **Repository:** <repo URL>
- **Dashboard:** <monitoring dashboard URL>
- **On-Call:** <escalation path>

---

## Architecture

```
<Diagram or description of service architecture>
```

### Dependencies
| Dependency | Type | Health Check | Fallback |
|-----------|------|-------------|----------|
| PostgreSQL | Database | `pg_isready` | DR replica |
| Redis | Cache/Queue | `redis-cli ping` | Restart |
| MinIO | Object Storage | `mc ready local` | N/A |

---

## Health Checks

### Automated Checks
| Check | Endpoint/Command | Expected | Frequency |
|-------|-----------------|----------|-----------|
| API Health | `GET /health` | HTTP 200 | 30s |
| DB Connectivity | Via /health | `"database": "ok"` | 30s |
| Redis Connectivity | Via /health | `"redis": "ok"` | 30s |
| Worker Active | Queue pending count | < 100 | 1m |

### Manual Checks
```bash
# Check API health
curl -s http://localhost:3001/health | jq .

# Check database
cd backend && npx prisma db execute --stdin <<< "SELECT 1"

# Check Redis
redis-cli ping

# Check MinIO
curl -s http://localhost:9000/minio/health/live

# Check worker queue
redis-cli llen bull:<queue-name>:wait
```

---

## Common Issues & Remediation

### Issue: API returns 503 (Service Unavailable)
**Symptoms:** Health check fails, users see error page
**Root Cause:** Database connection pool exhausted or Redis unreachable
**Resolution:**
1. Check database: `docker compose logs postgres`
2. Check Redis: `docker compose logs redis`
3. Restart API: `docker compose restart backend`
4. If persists, check connection pool settings in `.env`

### Issue: Queue jobs stuck / not processing
**Symptoms:** Queue depth growing, documents stuck in PROCESSING
**Root Cause:** Worker crashed or Redis connection lost
**Resolution:**
1. Check worker logs: `docker compose logs worker`
2. Check Redis: `redis-cli ping`
3. Restart worker: `docker compose restart worker`
4. Check failed jobs: `redis-cli llen bull:<queue>:failed`

### Issue: File upload fails
**Symptoms:** 500 error on upload, MinIO unreachable
**Root Cause:** MinIO service down or bucket not created
**Resolution:**
1. Check MinIO: `docker compose logs minio`
2. Restart MinIO: `docker compose restart minio`
3. Verify bucket exists: check MinIO console at :9001

### Issue: High memory usage
**Symptoms:** OOMKilled containers, degraded performance
**Root Cause:** Memory leak, unbounded cache, or large file processing
**Resolution:**
1. Check container stats: `docker stats`
2. Identify leak: check API/worker memory trends
3. Restart affected service
4. If recurring, file bug with memory profile

---

## Deployment

### Standard Deployment
```bash
# Pull latest images
docker compose pull

# Deploy with zero downtime
docker compose up -d --no-deps --build backend
docker compose up -d --no-deps --build frontend

# Run migrations
docker compose exec backend npx prisma migrate deploy

# Verify
curl -s http://localhost:3001/health
```

### Rollback
```bash
# Rollback to previous version
docker compose down
git checkout <previous-tag>
docker compose up -d

# Verify
curl -s http://localhost:3001/health
```

---

## Failover Procedures

### Database Failover
1. Verify primary is down: `pg_isready -h <primary-host>`
2. Promote replica: `pg_ctl promote -D <data-dir>`
3. Update connection string in environment
4. Restart API and worker services
5. Verify application health
6. **RTO:** < 5 minutes | **RPO:** < 1 minute

### DR Activation
1. Verify production is unreachable
2. Update DNS to point to DR environment
3. Verify DR health checks pass
4. Notify stakeholders
5. **RTO:** < 15 minutes | **RPO:** < 5 minutes

---

## Monitoring & Alerting

### Key Metrics
| Metric | Warning Threshold | Critical Threshold | Action |
|--------|------------------|-------------------|--------|
| API p95 latency | > 400ms | > 500ms | Investigate slow queries |
| Error rate | > 0.5% | > 1% | Check logs for errors |
| CPU usage | > 70% | > 90% | Scale up / investigate |
| Memory usage | > 70% | > 90% | Check for leaks |
| Queue depth | > 500 | > 1000 | Check worker health |
| Disk usage | > 80% | > 95% | Clean up / expand |

### Alert Routing
| Severity | Channel | Response Time |
|----------|---------|--------------|
| Critical | PagerDuty + Slack #incidents | 15 minutes |
| Warning | Slack #ops-alerts | 1 hour |
| Info | Slack #ops-info | Next business day |

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| On-Call Engineer | | |
| Tech Lead | | |
| Product Owner | | |
| Database Admin | | |
