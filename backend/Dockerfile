FROM python:3.12-slim

# Copy uv binary from pinned official image
COPY --from=ghcr.io/astral-sh/uv:0.12.10 /uv /uvx /bin/

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PROJECT_ENVIRONMENT="/opt/venv" \
    PATH="/opt/venv/bin:$PATH"

# Create a non-root user and set up workspace directories
RUN groupadd --system --gid 1001 appgroup && \
    useradd --system --uid 1001 --gid appgroup --create-home --home-dir /app appuser && \
    mkdir -p /opt/venv /app && \
    chown -R appuser:appgroup /opt/venv /app

WORKDIR /app

USER appuser

# Install dependencies first for optimal layer caching
COPY --chown=appuser:appgroup pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-install-project

# Copy the rest of the application code
COPY --chown=appuser:appgroup . .

# Expose backend service port
EXPOSE 8000

# Run FastAPI development server with hot reloading
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
