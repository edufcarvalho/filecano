#!/bin/sh
set -e

if [ "${SKIP_MIGRATIONS}" != "true" ]; then
  uv run alembic upgrade head
fi

if [ "${APP_ENV}" != "production" ] && [ "$1" = "uvicorn" ]; then
  exec "$@" --reload
else
  exec "$@"
fi
