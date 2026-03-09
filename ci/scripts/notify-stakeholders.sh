#!/usr/bin/env bash
###############################################################################
# notify-stakeholders.sh — Send deployment notifications via Slack/email
#
# Usage:
#   bash ci/scripts/notify-stakeholders.sh \
#     --status deployed \
#     --version abc1234 \
#     --environment production \
#     --release-notes artifacts/release-notes.md
###############################################################################
set -euo pipefail

STATUS=""
VERSION=""
ENVIRONMENT=""
RELEASE_NOTES_FILE=""
REASON=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --status) STATUS="$2"; shift 2 ;;
    --version) VERSION="$2"; shift 2 ;;
    --environment) ENVIRONMENT="$2"; shift 2 ;;
    --release-notes) RELEASE_NOTES_FILE="$2"; shift 2 ;;
    --reason) REASON="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

STATUS="${STATUS:-unknown}"
VERSION="${VERSION:-${CI_COMMIT_SHORT_SHA:-unknown}}"
ENVIRONMENT="${ENVIRONMENT:-unknown}"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

# ---------------------------------------------------------------------------
# Build notification message
# ---------------------------------------------------------------------------
case "$STATUS" in
  deployed)
    EMOJI="✅"
    TITLE="Deployment Successful"
    COLOR="#36a64f"
    ;;
  rollback)
    EMOJI="🔄"
    TITLE="Rollback Initiated"
    COLOR="#ff9900"
    ;;
  rollback-complete)
    EMOJI="⚠️"
    TITLE="Rollback Complete"
    COLOR="#ff9900"
    ;;
  failed)
    EMOJI="❌"
    TITLE="Deployment Failed"
    COLOR="#cc0000"
    ;;
  *)
    EMOJI="ℹ️"
    TITLE="Deployment Update"
    COLOR="#0066cc"
    ;;
esac

RELEASE_NOTES=""
if [[ -n "$RELEASE_NOTES_FILE" && -f "$RELEASE_NOTES_FILE" ]]; then
  RELEASE_NOTES=$(head -c 2000 "$RELEASE_NOTES_FILE")
fi

# ---------------------------------------------------------------------------
# Slack notification
# ---------------------------------------------------------------------------
if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
  echo "Sending Slack notification..."

  SLACK_PAYLOAD=$(jq -n \
    --arg title "${EMOJI} ${TITLE}" \
    --arg env "$ENVIRONMENT" \
    --arg ver "$VERSION" \
    --arg time "$TIMESTAMP" \
    --arg color "$COLOR" \
    --arg reason "$REASON" \
    --arg notes "$RELEASE_NOTES" \
    --arg pipeline "${CI_PIPELINE_URL:-N/A}" \
    '{
      "attachments": [{
        "color": $color,
        "blocks": [
          {
            "type": "header",
            "text": {"type": "plain_text", "text": $title}
          },
          {
            "type": "section",
            "fields": [
              {"type": "mrkdwn", "text": ("*Environment:*\n" + $env)},
              {"type": "mrkdwn", "text": ("*Version:*\n`" + $ver + "`")},
              {"type": "mrkdwn", "text": ("*Timestamp:*\n" + $time)},
              {"type": "mrkdwn", "text": ("*Pipeline:*\n" + $pipeline)}
            ]
          }
        ] + (if $reason != "" then [{
          "type": "section",
          "text": {"type": "mrkdwn", "text": ("*Reason:* " + $reason)}
        }] else [] end) + (if $notes != "" then [{
          "type": "section",
          "text": {"type": "mrkdwn", "text": ("*Release Notes:*\n" + ($notes | split("\n") | .[0:10] | join("\n")))}
        }] else [] end)
      }]
    }')

  HTTP_CODE=$(curl --silent --write-out "%{http_code}" --output /dev/null \
    --header "Content-Type: application/json" \
    --data "$SLACK_PAYLOAD" \
    "$SLACK_WEBHOOK_URL")

  if [[ "$HTTP_CODE" == "200" ]]; then
    echo "  ✓ Slack notification sent"
  else
    echo "  ⚠ Slack notification failed (HTTP ${HTTP_CODE})"
  fi
else
  echo "SLACK_WEBHOOK_URL not set — skipping Slack notification"
fi

# ---------------------------------------------------------------------------
# Email notification (via GitLab CI or sendmail)
# ---------------------------------------------------------------------------
if [[ -n "${NOTIFICATION_EMAIL:-}" ]]; then
  echo "Sending email notification to ${NOTIFICATION_EMAIL}..."

  SUBJECT="${EMOJI} [${ENVIRONMENT}] ${TITLE} — v${VERSION}"
  BODY=$(cat <<EOF
${TITLE}

Environment: ${ENVIRONMENT}
Version:     ${VERSION}
Timestamp:   ${TIMESTAMP}
Pipeline:    ${CI_PIPELINE_URL:-N/A}
${REASON:+Reason: ${REASON}}

${RELEASE_NOTES:+Release Notes:
${RELEASE_NOTES}}
EOF
)

  if command -v sendmail &> /dev/null; then
    echo -e "Subject: ${SUBJECT}\n\n${BODY}" | sendmail "$NOTIFICATION_EMAIL"
    echo "  ✓ Email sent"
  elif command -v mail &> /dev/null; then
    echo "$BODY" | mail -s "$SUBJECT" "$NOTIFICATION_EMAIL"
    echo "  ✓ Email sent"
  else
    echo "  ⚠ No mail command available — skipping email"
  fi
else
  echo "NOTIFICATION_EMAIL not set — skipping email notification"
fi

# ---------------------------------------------------------------------------
# Console summary
# ---------------------------------------------------------------------------
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "${EMOJI} ${TITLE}"
echo "  Environment : ${ENVIRONMENT}"
echo "  Version     : ${VERSION}"
echo "  Timestamp   : ${TIMESTAMP}"
if [[ -n "$REASON" ]]; then
  echo "  Reason      : ${REASON}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
