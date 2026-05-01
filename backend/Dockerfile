FROM python:3.14-alpine

# prevent python from creating cache files at runtime
ENV PYTHONDONTWRITEBYTECODE=1

# make python don't use buffered output, for better logging
ENV PYTHONUNBUFFERED=1

# make uv compile packages to bytecode for faster loading
ENV UV_COMPILE_BYTECODE=1

# avoid using symlinks to packages
ENV UV_LINK_MODE=copy

WORKDIR /app

RUN apk update \
    && apk add curl

RUN python -m pip install --no-cache-dir uv

COPY pyproject.toml uv.lock ./
RUN uv sync --no-cache --no-dev

COPY alembic.ini ./
COPY migrations ./migrations
COPY app ./app
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000


ENTRYPOINT ["sh", "./entrypoint.sh"]
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
