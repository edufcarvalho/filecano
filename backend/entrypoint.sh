#!/bin/sh
set -e

if [ "${SKIP_MIGRATIONS}" != "true" ]; then
  uv run alembic upgrade head
fi

if [ "${APP_ENV}" != "production" ]; then
  case "$*" in
    *uvicorn*)
      exec "$@" --reload
      ;;
    *)
      exec "$@"
      ;;
  esac
else
  exec "$@"
fi
