#!/usr/bin/env bash
###############################################################################
# health-check.sh — Run health checks against a deployed environment
#
# Usage:
#   bash ci/scripts/health-check.sh http://localhost:3001 smoke
#   bash ci/scripts/health-check.sh http://prod.example.com full
###############################################################################
set -euo pipefail

BASE_URL="${1:?Usage: health-check.sh <base-url> [smoke|full]}"
CHECK_MODE="${2:-smoke}"
MAX_RETRIES=5
RETRY_DELAY=5

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Health Check: ${BASE_URL}"
echo "Mode        : ${CHECK_MODE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FAILURES=0
WARNINGS=0
CHECKS=0

check() {
  local name="$1" url="$2" expected_status="${3:-200}"
  CHECKS=$((CHECKS + 1))

  for attempt in $(seq 1 $MAX_RETRIES); do
    HTTP_CODE=$(curl --silent --write-out "%{http_code}" --output /dev/null --max-time 10 "$url" 2>/dev/null || echo "000")

    if [[ "$HTTP_CODE" == "$expected_status" ]]; then
      echo "  ✓ ${name} — HTTP ${HTTP_CODE}"
      return 0
    fi

    if [[ $attempt -lt $MAX_RETRIES ]]; then
      sleep $RETRY_DELAY
    fi
  done

  echo "  ✗ ${name} — HTTP ${HTTP_CODE} (expected ${expected_status})"
  FAILURES=$((FAILURES + 1))
  return 1
}

check_response_time() {
  local name="$1" url="$2" threshold_ms="${3:-2000}"
  CHECKS=$((CHECKS + 1))

  TOTAL_TIME=$(curl --silent --write-out "%{time_total}" --output /dev/null --max-time 10 "$url" 2>/dev/null || echo "0")
  TOTAL_MS=$(echo "$TOTAL_TIME * 1000" | bc 2>/dev/null || echo "0")
  TOTAL_MS_INT=${TOTAL_MS%.*}

  if [[ "${TOTAL_MS_INT:-0}" -le "$threshold_ms" ]]; then
    echo "  ✓ ${name} — ${TOTAL_MS_INT}ms (threshold: ${threshold_ms}ms)"
  else
    echo "  ⚠ ${name} — ${TOTAL_MS_INT}ms exceeds threshold (${threshold_ms}ms)"
    WARNINGS=$((WARNINGS + 1))
  fi
}

# ---------------------------------------------------------------------------
# Smoke checks (always run)
# ---------------------------------------------------------------------------
echo ""
echo "--- Smoke Checks ---"
check "API Health" "${BASE_URL}/health"
check "API Root" "${BASE_URL}/"

# ---------------------------------------------------------------------------
# Full checks (only in full mode)
# ---------------------------------------------------------------------------
if [[ "$CHECK_MODE" == "full" ]]; then
  echo ""
  echo "--- API Endpoint Checks ---"
  check "Auth endpoint" "${BASE_URL}/api/auth/login" "401"
  check_response_time "API response time" "${BASE_URL}/health" 500

  echo ""
  echo "--- Service Connectivity ---"

  # Check database connectivity via health endpoint
  DB_STATUS=$(curl --silent --max-time 10 "${BASE_URL}/health" 2>/dev/null | jq -r '.database // "unknown"')
  CHECKS=$((CHECKS + 1))
  if [[ "$DB_STATUS" == "connected" || "$DB_STATUS" == "ok" ]]; then
    echo "  ✓ Database connectivity — ${DB_STATUS}"
  else
    echo "  ✗ Database connectivity — ${DB_STATUS}"
    FAILURES=$((FAILURES + 1))
  fi

  # Check Redis connectivity via health endpoint
  REDIS_STATUS=$(curl --silent --max-time 10 "${BASE_URL}/health" 2>/dev/null | jq -r '.redis // "unknown"')
  CHECKS=$((CHECKS + 1))
  if [[ "$REDIS_STATUS" == "connected" || "$REDIS_STATUS" == "ok" ]]; then
    echo "  ✓ Redis connectivity — ${REDIS_STATUS}"
  else
    echo "  ✗ Redis connectivity — ${REDIS_STATUS}"
    FAILURES=$((FAILURES + 1))
  fi

  # Check MinIO/S3 connectivity via health endpoint
  STORAGE_STATUS=$(curl --silent --max-time 10 "${BASE_URL}/health" 2>/dev/null | jq -r '.storage // "unknown"')
  CHECKS=$((CHECKS + 1))
  if [[ "$STORAGE_STATUS" == "connected" || "$STORAGE_STATUS" == "ok" ]]; then
    echo "  ✓ Storage (MinIO/S3) connectivity — ${STORAGE_STATUS}"
  else
    echo "  ⚠ Storage connectivity — ${STORAGE_STATUS}"
    WARNINGS=$((WARNINGS + 1))
  fi

  echo ""
  echo "--- SSL/TLS Check ---"
  if [[ "$BASE_URL" == https://* ]]; then
    CERT_EXPIRY=$(echo | openssl s_client -servername "${BASE_URL#https://}" -connect "${BASE_URL#https://}:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    CHECKS=$((CHECKS + 1))
    if [[ -n "$CERT_EXPIRY" ]]; then
      EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || date -jf "%b %d %T %Y %Z" "$CERT_EXPIRY" +%s 2>/dev/null || echo "0")
      NOW_EPOCH=$(date +%s)
      DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
      if [[ $DAYS_LEFT -gt 30 ]]; then
        echo "  ✓ SSL certificate — ${DAYS_LEFT} days remaining"
      elif [[ $DAYS_LEFT -gt 0 ]]; then
        echo "  ⚠ SSL certificate — ${DAYS_LEFT} days remaining (< 30 days)"
        WARNINGS=$((WARNINGS + 1))
      else
        echo "  ✗ SSL certificate — EXPIRED"
        FAILURES=$((FAILURES + 1))
      fi
    else
      echo "  ⚠ SSL certificate — could not determine expiry"
      WARNINGS=$((WARNINGS + 1))
    fi
  else
    echo "  ⚠ Not using HTTPS"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Health Check Summary"
echo "  Checks: $CHECKS | Failures: $FAILURES | Warnings: $WARNINGS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ $FAILURES -gt 0 ]]; then
  echo "❌ Health check failed with $FAILURES failure(s)"
  exit 1
fi

if [[ $WARNINGS -gt 0 ]]; then
  echo "⚠ Health check passed with $WARNINGS warning(s)"
fi

echo "✅ Health check passed"
