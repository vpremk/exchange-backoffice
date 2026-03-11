###############################################################################
# backend/Dockerfile — Multi-stage build for Compliance Sentinel API
###############################################################################

# === Stage 1: Dependencies ===
FROM python:3.11-slim AS deps

WORKDIR /app

# Install system deps needed for some Python packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# === Stage 2: Runtime ===
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install only runtime system deps
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 curl && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd -r sentinel && \
    useradd -r -g sentinel -d /app -s /sbin/nologin sentinel

# Copy installed Python packages from deps stage
COPY --from=deps /install /usr/local

# Copy application code
COPY . .

# Remove unnecessary files that made it into the context
RUN rm -f Dockerfile requirements*.txt

# Switch to non-root user
USER sentinel

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

ENTRYPOINT ["python", "-m", "uvicorn"]
CMD ["app.main:app", "--host", "0.0.0.0", "--port", "8000"]
