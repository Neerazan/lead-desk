.PHONY: help up down dev dev-down test test-clean logs ps build

# Show available commands
help:
	@echo ""
	@echo "  Lead Desk – available commands"
	@echo "  ─────────────────────────────────────────────"
	@echo "  make up          Start production stack (detached)"
	@echo "  make down        Stop production stack + remove volumes"
	@echo "  make dev         Start dev stack with hot-reload (detached)"
	@echo "  make dev-down    Stop dev stack"
	@echo "  make build       Rebuild all images without starting"
	@echo "  make test        Build & run full test suite"
	@echo "  make test-clean  Run tests then remove containers & volumes"
	@echo "  make logs        Tail logs for production stack"
	@echo "  make ps          Show running containers"
	@echo "  ─────────────────────────────────────────────"
	@echo ""

# Production
up:
	docker compose up --build -d

down:
	docker compose down --volumes --remove-orphans

# Development (hot-reload)
dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

dev-down:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down --remove-orphans

# Build only
build:
	docker compose build

# Tests
test:
	docker compose -f docker-compose.test.yml up --build \
		--abort-on-container-exit \
		--exit-code-from backend-test

test-clean:
	docker compose -f docker-compose.test.yml up --build \
		--abort-on-container-exit \
		--exit-code-from backend-test; \
	docker compose -f docker-compose.test.yml down --volumes --remove-orphans

# Utilities
logs:
	docker compose logs -f

ps:
	docker compose ps
