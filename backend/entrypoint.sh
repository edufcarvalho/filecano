#!/bin/sh
set -e

uv run alembic upgrade head

if [ "${APP_ENV}" != "production" ]; then
  exec "$@" --reload
else
  exec "$@"
fi
