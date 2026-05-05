setup:
	if [ ! -e ./backend/.env ]; then cp ./backend/.env.example ./backend/.env; fi
	if [ ! -e ./frontend/.env ]; then cp ./frontend/.env.example ./frontend/.env; fi

up: setup
	docker compose up
