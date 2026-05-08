help:
	@echo -e "\033[1;34mAvailable commands:\033[0m"
	@echo "  make setup       	- Setup environment variables"
	@echo "  make up            - Start all the containers (breakpoints don't work work)
	@echo "  make debug     		- Run with debug mode (breakpoints work)"

setup:
	if [ ! -e ./backend/.env ]; then cp ./backend/.env.example ./backend/.env; fi
	if [ ! -e ./frontend/.env ]; then cp ./frontend/.env.example ./frontend/.env; fi
	cd backend && uv sync --all-extras

up: setup
	docker compose up

debug: setup
	docker compose up --scale back=0 -d
	echo "Remember to point to database in localhost:5432 instead of database:5432"
	cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir ./app/ && docker compose down
