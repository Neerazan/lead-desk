"""
Services defined here run the automated backend test suite.

Usage (from repo root):
    docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-test

The `backend-test` service:
  - Reuses the same application image as production (built from ./backend).
  - Overrides the CMD to run pytest instead of starting the server.
  - Uses an *isolated* postgres database (`leaddesk_test`) so the development
    database is never touched.
  - Tests use SQLite in-memory by default; the Postgres service here is
    available for integration tests that need a real DB engine
    (set DATABASE_URL in the service env if you add those later).
"""
