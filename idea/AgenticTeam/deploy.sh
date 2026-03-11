#!/usr/bin/env bash
###############################################################################
# deploy.sh — Unified deployment script for Compliance Sentinel
#
# Supports:
#   --method compose   → docker-compose (dev)
#   --method helm      → Helm chart (staging / production)
###############################################################################
set -euo pipefail

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
DEPLOY_ENV=""
DEPLOY_METHOD=""
BACKEND_IMAGE=""
FRONTEND_IMAGE=""
DB_PASSWORD=""
REDIS_URL=""
CLICKHOUSE_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)            DEPLOY_ENV="$2";       shift 2 ;;
    --method)         DEPLOY_METHOD="$2";    shift 2 ;;
    --backend-image)  BACKEND_IMAGE="$2";    shift 2 ;;
    --frontend-image) FRONTEND_IMAGE="$2";   shift 2 ;;
    --db-password)    DB_PASSWORD="$2";      shift 2 ;;
    --redis-url)      REDIS_URL="$2";        shift 2 ;;
    --clickhouse-url) CLICKHOUSE_URL="$2";   shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Validate required args
for var in DEPLOY_ENV DEPLOY_METHOD BACKEND_IMAGE FRONTEND_IMAGE; do
  if [[ -z "${!var}" ]]; then
    echo "ERROR: --$(echo ${var} | tr '[:upper:]' '[:lower:]' | tr '_' '-') is required"
    exit 1
  fi
done

echo "============================================"
echo " Deploying Compliance Sentinel"
echo " Environment : ${DEPLOY_ENV}"
echo " Method      : ${DEPLOY_METHOD}"
echo " Backend     : ${BACKEND_IMAGE}"
echo " Frontend    : ${FRONTEND_IMAGE}"
echo "============================================"

# ---------------------------------------------------------------------------
# docker-compose deployment (dev)
# ---------------------------------------------------------------------------
deploy_compose() {
  local COMPOSE_FILE="docker-compose.${DEPLOY_ENV}.yml"

  if [[ ! -f "${COMPOSE_FILE}" ]]; then
    COMPOSE_FILE="docker-compose.yml"
  fi

  echo "Using compose file: ${COMPOSE_FILE}"

  export BACKEND_IMAGE FRONTEND_IMAGE DB_PASSWORD REDIS_URL CLICKHOUSE_URL

  docker compose -f "${COMPOSE_FILE}" pull
  docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans --force-recreate

  echo "Waiting for services to stabilize..."
  sleep 5

  docker compose -f "${COMPOSE_FILE}" ps
  echo "Compose deployment complete."
}

# ---------------------------------------------------------------------------
# Helm deployment (staging / production)
# ---------------------------------------------------------------------------
deploy_helm() {
  local RELEASE_NAME="compliance-sentinel"
  local NAMESPACE="sentinel-${DEPLOY_ENV}"
  local CHART_PATH="./helm/compliance-sentinel"

  # Environment-specific values file
  local VALUES_FILE="./helm/values-${DEPLOY_ENV}.yaml"
  local VALUES_FLAG=""
  if [[ -f "${VALUES_FILE}" ]]; then
    VALUES_FLAG="--values ${VALUES_FILE}"
  fi

  # Replica count per environment
  local REPLICAS=2
  if [[ "${DEPLOY_ENV}" == "production" ]]; then
    REPLICAS=3
  fi

  echo "Deploying via Helm to namespace: ${NAMESPACE}"

  helm upgrade --install "${RELEASE_NAME}" "${CHART_PATH}" \
    --namespace "${NAMESPACE}" \
    --create-namespace \
    ${VALUES_FLAG} \
    --set backend.image="${BACKEND_IMAGE}" \
    --set frontend.image="${FRONTEND_IMAGE}" \
    --set backend.replicas="${REPLICAS}" \
    --set frontend.replicas="${REPLICAS}" \
    --set secrets.dbPassword="${DB_PASSWORD}" \
    --set secrets.redisUrl="${REDIS_URL}" \
    --set secrets.clickhouseUrl="${CLICKHOUSE_URL}" \
    --wait \
    --timeout 300s

  echo "Helm deployment complete."
  helm status "${RELEASE_NAME}" --namespace "${NAMESPACE}"
}

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------
case "${DEPLOY_METHOD}" in
  compose)  deploy_compose ;;
  helm)     deploy_helm ;;
  *)
    echo "ERROR: Unknown deploy method '${DEPLOY_METHOD}'. Use 'compose' or 'helm'."
    exit 1
    ;;
esac

echo "Deployment to ${DEPLOY_ENV} finished successfully."
