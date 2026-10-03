FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.12.10 /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PROJECT_ENVIRONMENT="/opt/venv" \
    PATH="/opt/venv/bin:$PATH"

RUN groupadd --system --gid 1001 appgroup && \
    useradd --system --uid 1001 --gid appgroup --create-home --home-dir /app appuser && \
    mkdir -p /opt/venv /app && \
    chown -R appuser:appgroup /opt/venv /app

WORKDIR /app
USER appuser

COPY --chown=appuser:appgroup pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-install-project --no-dev

COPY --chown=appuser:appgroup . .

EXPOSE 8000

# Runs migrations, seed, then the server
CMD ["sh", "/app/scripts/start.sh"]