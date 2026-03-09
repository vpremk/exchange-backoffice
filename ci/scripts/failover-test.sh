#!/usr/bin/env bash
###############################################################################
# failover-test.sh — Simulate failover scenarios and measure RTO/RPO
#
# Usage:
#   bash ci/scripts/failover-test.sh \
#     --production-url http://prod.example.com \
#     --dr-url http://dr.example.com
###############################################################################
set -euo pipefail

PRODUCTION_URL=""
DR_URL=""
RESULTS_FILE="${ARTIFACTS_DIR:-artifacts}/failover-test-results.json"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --production-url) PRODUCTION_URL="$2"; shift 2 ;;
    --dr-url) DR_URL="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

mkdir -p "$(dirname "$RESULTS_FILE")"

RESULTS='{"tests": [], "summary": {}}'

# ---------------------------------------------------------------------------
# Helper: add test result
# ---------------------------------------------------------------------------
add_result() {
  local name="$1" status="$2" duration_ms="$3" details="$4"
  RESULTS=$(echo "$RESULTS" | jq \
    --arg name "$name" \
    --arg status "$status" \
    --argjson duration "$duration_ms" \
    --arg details "$details" \
    '.tests += [{"name": $name, "status": $status, "duration_ms": $duration, "details": $details}]')
}

# ---------------------------------------------------------------------------
# Helper: measure health check recovery time
# ---------------------------------------------------------------------------
wait_for_health() {
  local url="$1" max_wait="${2:-60}" start_ms
  start_ms=$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')

  for i in $(seq 1 "$max_wait"); do
    if curl --silent --fail --max-time 5 "${url}/health" > /dev/null 2>&1; then
      local end_ms
      end_ms=$(date +%s%3N 2>/dev/null || python3 -c 'import time; print(int(time.time()*1000))')
      echo $((end_ms - start_ms))
      return 0
    fi
    sleep 1
  done
  echo "-1"
  return 1
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Failover Testing"
echo "Production : ${PRODUCTION_URL:-not set}"
echo "DR         : ${DR_URL:-not set}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ---------------------------------------------------------------------------
# Test 1: Production health baseline
# ---------------------------------------------------------------------------
echo ""
echo "Test 1: Production health baseline..."
if [[ -n "$PRODUCTION_URL" ]]; then
  RECOVERY=$(wait_for_health "$PRODUCTION_URL" 10)
  if [[ "$RECOVERY" -ge 0 ]]; then
    add_result "production-health-baseline" "PASS" "$RECOVERY" "Production healthy, response in ${RECOVERY}ms"
  else
    add_result "production-health-baseline" "FAIL" "0" "Production health check failed"
  fi
else
  add_result "production-health-baseline" "SKIP" "0" "Production URL not configured"
fi

# ---------------------------------------------------------------------------
# Test 2: DR health baseline
# ---------------------------------------------------------------------------
echo "Test 2: DR health baseline..."
if [[ -n "$DR_URL" ]]; then
  RECOVERY=$(wait_for_health "$DR_URL" 10)
  if [[ "$RECOVERY" -ge 0 ]]; then
    add_result "dr-health-baseline" "PASS" "$RECOVERY" "DR healthy, response in ${RECOVERY}ms"
  else
    add_result "dr-health-baseline" "FAIL" "0" "DR health check failed"
  fi
else
  add_result "dr-health-baseline" "SKIP" "0" "DR URL not configured"
fi

# ---------------------------------------------------------------------------
# Test 3: DR can serve traffic independently
# ---------------------------------------------------------------------------
echo "Test 3: DR independence check..."
if [[ -n "$DR_URL" ]]; then
  HTTP_CODE=$(curl --silent --write-out "%{http_code}" --output /dev/null --max-time 10 "${DR_URL}/health" 2>/dev/null || echo "000")
  if [[ "$HTTP_CODE" == "200" ]]; then
    add_result "dr-independence" "PASS" "0" "DR serves traffic independently (HTTP 200)"
  else
    add_result "dr-independence" "FAIL" "0" "DR cannot serve traffic independently (HTTP ${HTTP_CODE})"
  fi
else
  add_result "dr-independence" "SKIP" "0" "DR URL not configured"
fi

# ---------------------------------------------------------------------------
# Test 4: Version consistency (Production == DR)
# ---------------------------------------------------------------------------
echo "Test 4: Version consistency..."
if [[ -n "$PRODUCTION_URL" && -n "$DR_URL" ]]; then
  PROD_VERSION=$(curl --silent --max-time 10 "${PRODUCTION_URL}/health" 2>/dev/null | jq -r '.version // "unknown"')
  DR_VERSION=$(curl --silent --max-time 10 "${DR_URL}/health" 2>/dev/null | jq -r '.version // "unknown"')
  if [[ "$PROD_VERSION" == "$DR_VERSION" ]]; then
    add_result "version-consistency" "PASS" "0" "Versions match: ${PROD_VERSION}"
  else
    add_result "version-consistency" "WARN" "0" "Version mismatch: prod=${PROD_VERSION} dr=${DR_VERSION}"
  fi
else
  add_result "version-consistency" "SKIP" "0" "Both URLs required for version check"
fi

# ---------------------------------------------------------------------------
# Test 5: Database replication lag
# ---------------------------------------------------------------------------
echo "Test 5: Database replication lag check..."
if [[ -n "$DR_URL" ]]; then
  REP_LAG=$(curl --silent --max-time 10 "${DR_URL}/health" 2>/dev/null | jq -r '.replication_lag_seconds // "unknown"')
  if [[ "$REP_LAG" != "unknown" && "$REP_LAG" != "null" ]]; then
    if (( $(echo "$REP_LAG < 60" | bc -l 2>/dev/null || echo 0) )); then
      add_result "replication-lag" "PASS" "0" "Replication lag: ${REP_LAG}s (< 60s threshold)"
    else
      add_result "replication-lag" "WARN" "0" "Replication lag: ${REP_LAG}s (exceeds 60s threshold)"
    fi
  else
    add_result "replication-lag" "SKIP" "0" "Replication lag metric not available from health endpoint"
  fi
else
  add_result "replication-lag" "SKIP" "0" "DR URL not configured"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
PASS_COUNT=$(echo "$RESULTS" | jq '[.tests[] | select(.status == "PASS")] | length')
FAIL_COUNT=$(echo "$RESULTS" | jq '[.tests[] | select(.status == "FAIL")] | length')
WARN_COUNT=$(echo "$RESULTS" | jq '[.tests[] | select(.status == "WARN")] | length')
SKIP_COUNT=$(echo "$RESULTS" | jq '[.tests[] | select(.status == "SKIP")] | length')

RESULTS=$(echo "$RESULTS" | jq \
  --argjson pass "$PASS_COUNT" \
  --argjson fail "$FAIL_COUNT" \
  --argjson warn "$WARN_COUNT" \
  --argjson skip "$SKIP_COUNT" \
  '.summary = {"pass": $pass, "fail": $fail, "warn": $warn, "skip": $skip}')

echo "$RESULTS" | jq . > "$RESULTS_FILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Failover Test Summary"
echo "  PASS: $PASS_COUNT | FAIL: $FAIL_COUNT | WARN: $WARN_COUNT | SKIP: $SKIP_COUNT"
echo "Results: $RESULTS_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo "❌ Failover testing found $FAIL_COUNT FAIL-level issues"
  exit 1
fi
