#!/bin/sh
set -e

echo "Applying Alembic database migrations..."
alembic upgrade head

echo "Running database seed..."
python -m app.core.seed

echo "Starting Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
