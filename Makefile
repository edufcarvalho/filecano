PODMAN_COMPOSE ?= podman compose
E2E_COMPOSE_FILES := -f compose.yml -f compose.e2e.yml

help:
	@echo -e "\033[1;34mAvailable commands:\033[0m"
	@echo "  make setup       	- Setup environment variables"
	@echo "  make up            - Start all the containers (breakpoints don't work)"
	@echo "  make debug     		- Run with debug mode (breakpoints work)"
	@echo "  make e2e           - Start the app stack and run Playwright E2E tests"
	@echo "  make e2e-up        - Start the containers required for E2E tests"
	@echo "  make e2e-down      - Stop the E2E containers and remove test volumes"

setup:
	if [ ! -e ./backend/.env ]; then cp ./backend/.env.example ./backend/.env; fi
	if [ ! -e ./frontend/.env ]; then cp ./frontend/.env.example ./frontend/.env; fi
	cd backend && uv sync --all-extras

up: setup
	$(PODMAN_COMPOSE) up

e2e-up: setup
	$(PODMAN_COMPOSE) $(E2E_COMPOSE_FILES) up --build -d database data cache back
	$(PODMAN_COMPOSE) $(E2E_COMPOSE_FILES) up --build --force-recreate -d front nginx

e2e: e2e-up
	$(PODMAN_COMPOSE) $(E2E_COMPOSE_FILES) run --rm e2e

e2e-down:
	$(PODMAN_COMPOSE) $(E2E_COMPOSE_FILES) down -v

debug: setup
	$(PODMAN_COMPOSE) up --scale back=0 -d
	echo "Remember to point to database in localhost:5432 instead of database:5432"
	cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir ./app/
	cd .. && $(PODMAN_COMPOSE) down
