install-test-deps:
	uv sync --extra test

test:
	uv run python -m pytest app/tests -v $(ARGS)  --cov=app --cov-report=term-missing --cov-fail-under=70

test-unit:
	uv run python -m pytest app/tests/unit -v $(ARGS) --no-cov

test-integration:
	uv run python -m pytest app/tests/integration -v $(ARGS) --no-cov

lint:
	uv run ruff check app
	uv run ruff format --check app

format:
	uv run ruff format app
	uv run ruff check --fix app
