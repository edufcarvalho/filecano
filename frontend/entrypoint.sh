#!/bin/sh
set -e

if [ "${NODE_ENV}" = "production" ]; then
  npm run build
  exec npx vite preview --port 5173 --host 0.0.0.0
else
  exec npm run dev -- --host 0.0.0.0
fi
