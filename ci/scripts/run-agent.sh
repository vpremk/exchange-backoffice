#!/usr/bin/env bash
###############################################################################
# run-agent.sh — Common wrapper for executing AI agent stages
#
# Usage:
#   bash ci/scripts/run-agent.sh \
#     --prompt ci/agents/requirements-analyst.prompt.md \
#     --input docs/requirements/ \
#     --output artifacts/requirements-analysis.json \
#     --output artifacts/user-stories.md
###############################################################################
set -euo pipefail

PROMPT_FILE=""
INPUTS=()
OUTPUTS=()
MAX_RETRIES="${AGENT_MAX_RETRIES:-1}"
TIMEOUT="${AGENT_TIMEOUT:-600}"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --prompt)
      PROMPT_FILE="$2"
      shift 2
      ;;
    --input)
      INPUTS+=("$2")
      shift 2
      ;;
    --output)
      OUTPUTS+=("$2")
      shift 2
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Validate
# ---------------------------------------------------------------------------
if [[ -z "$PROMPT_FILE" ]]; then
  echo "ERROR: --prompt is required"
  exit 1
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "ERROR: Prompt file not found: $PROMPT_FILE"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Agent Prompt : $PROMPT_FILE"
echo "Inputs       : ${INPUTS[*]:-none}"
echo "Outputs      : ${OUTPUTS[*]:-none}"
echo "Timeout      : ${TIMEOUT}s"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ---------------------------------------------------------------------------
# Build the prompt with context
# ---------------------------------------------------------------------------
FULL_PROMPT=$(cat "$PROMPT_FILE")

# Append input file contents as context
for INPUT in "${INPUTS[@]}"; do
  if [[ -d "$INPUT" ]]; then
    echo "Loading directory input: $INPUT"
    for FILE in "$INPUT"/*; do
      if [[ -f "$FILE" ]]; then
        FULL_PROMPT+=$'\n\n--- Input: '"$FILE"$' ---\n'
        FULL_PROMPT+=$(cat "$FILE")
      fi
    done
  elif [[ -f "$INPUT" ]]; then
    echo "Loading file input: $INPUT"
    FULL_PROMPT+=$'\n\n--- Input: '"$INPUT"$' ---\n'
    FULL_PROMPT+=$(cat "$INPUT")
  else
    echo "WARNING: Input not found: $INPUT (skipping)"
  fi
done

# Append output expectations
if [[ ${#OUTPUTS[@]} -gt 0 ]]; then
  FULL_PROMPT+=$'\n\n--- Expected Outputs ---\n'
  for OUTPUT in "${OUTPUTS[@]}"; do
    FULL_PROMPT+="- $OUTPUT"$'\n'
  done
fi

# ---------------------------------------------------------------------------
# Execute Claude Code in headless mode
# ---------------------------------------------------------------------------
ATTEMPT=0
while [[ $ATTEMPT -lt $MAX_RETRIES ]]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "Attempt $ATTEMPT of $MAX_RETRIES..."

  if timeout "${TIMEOUT}" claude --print \
    --prompt "$FULL_PROMPT" \
    --output-dir "$(dirname "${OUTPUTS[0]:-artifacts}")" \
    2>&1 | tee agent-output.log; then
    echo "Agent completed successfully"
    break
  else
    EXIT_CODE=$?
    echo "Agent exited with code $EXIT_CODE"
    if [[ $ATTEMPT -lt $MAX_RETRIES ]]; then
      echo "Retrying in 10 seconds..."
      sleep 10
    else
      echo "ERROR: Agent failed after $MAX_RETRIES attempts"
      exit 1
    fi
  fi
done

# ---------------------------------------------------------------------------
# Verify expected outputs exist
# ---------------------------------------------------------------------------
MISSING=0
for OUTPUT in "${OUTPUTS[@]}"; do
  if [[ ! -f "$OUTPUT" ]]; then
    echo "WARNING: Expected output not found: $OUTPUT"
    MISSING=$((MISSING + 1))
  else
    echo "✓ Output created: $OUTPUT ($(wc -c < "$OUTPUT") bytes)"
  fi
done

if [[ $MISSING -gt 0 ]]; then
  echo "WARNING: $MISSING expected output(s) missing"
fi

echo "Agent execution complete"
