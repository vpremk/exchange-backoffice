# Performance Test Report

## Executive Summary
- **Test Date:** <YYYY-MM-DD>
- **Version:** <commit SHA>
- **Test Environment:** <environment name>
- **Overall Status:** PASS | WARN | FAIL

---

## Load Test Results

### Test Scenarios Executed

| Test | VUs | Duration | Avg RT (ms) | p95 RT (ms) | p99 RT (ms) | Error Rate | Throughput (req/s) | Status |
|------|-----|----------|-------------|-------------|-------------|------------|-------------------|--------|
| Baseline | | | | | | | | |
| Peak (2x) | | | | | | | | |
| Stress (5x) | | | | | | | | |
| Spike (10x) | | | | | | | | |
| Soak (1hr) | | | | | | | | |

### Breaking Point
- **Max VUs before degradation:** <number>
- **Max VUs before failure:** <number>
- **Bottleneck service:** <service name>
- **Limiting resource:** CPU | Memory | DB Connections | Network

---

## Per-Endpoint Performance

| Endpoint | Method | p50 (ms) | p95 (ms) | p99 (ms) | SLA Target (ms) | Status |
|----------|--------|----------|----------|----------|-----------------|--------|
| /health | GET | | | | 100 | |
| /api/auth/login | POST | | | | 1000 | |
| /api/documents | GET | | | | 500 | |
| /api/documents/upload | POST | | | | 5000 | |

---

## Database Performance

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Connection pool utilization | | < 70% | |
| Slowest query (ms) | | < 500ms | |
| Avg query time (ms) | | < 50ms | |
| Lock contention events | | 0 | |
| Replication lag (s) | | < 30s | |

---

## Queue & Worker Performance

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Job throughput (jobs/min) | | | |
| Max queue depth | | < 1000 | |
| End-to-end pipeline latency | | | |
| Failed jobs | | 0 | |
| Redis memory (MB) | | < 512 | |

---

## Frontend Performance (Lighthouse)

| Metric | Score/Value | Target | Status |
|--------|------------|--------|--------|
| Performance Score | | >= 90 | |
| LCP | | < 2.5s | |
| FID | | < 100ms | |
| CLS | | < 0.1 | |
| TTFB | | < 800ms | |
| FCP | | < 1.8s | |
| Bundle Size (gzipped) | | < 500KB | |

---

## Resource Utilization

### At Baseline Load
| Service | CPU % | Memory (MB) | Disk I/O | Network I/O |
|---------|-------|-------------|----------|-------------|
| API Server | | | | |
| Worker | | | | |
| PostgreSQL | | | | |
| Redis | | | | |
| MinIO | | | | |

### At Peak Load
| Service | CPU % | Memory (MB) | Headroom % |
|---------|-------|-------------|------------|
| API Server | | | |
| Worker | | | |
| PostgreSQL | | | |
| Redis | | | |

---

## Regression Analysis

| Endpoint | Previous p95 | Current p95 | Change % | Status |
|----------|-------------|-------------|----------|--------|
| | | | | |

---

## Recommendations

### Immediate Actions
1. <action item>

### Capacity Planning
1. <recommendation>

### Auto-Scaling Recommendations
| Service | Scale-Up Trigger | Scale-Down Trigger |
|---------|-----------------|-------------------|
| | | |

---

## Verdict

- [ ] **PASS** — All SLA targets met, error rate < 0.1% at baseline
- [ ] **WARN** — p95 between 80-100% of SLA, or utilization > 70% at peak
- [ ] **FAIL** — SLA breach at baseline, error rate > 1%, memory leak, or crash
