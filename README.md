# Pelifiles 🦩
The file management system that eats files like a pelican 🦩

Basic FastAPI + Vite stack with Postgres database and MinIO object storage

## Services

- `back`: FastAPI API on `http://localhost:8000`
- `front`: Vite + React + TypeScript frontend on `http://localhost:5173`
- `database`: Postgres on `localhost:5432`
- `data`: MinIO API on `localhost:9000`, console on `http://localhost:9001`

## Run

```bash
docker compose up --build
```

The compose defaults envs to `APP_ENV=development` and `NODE_ENV=development`, so backend reload and Vite HMR are enabled with source bind mounts.

For non-development containers, pass non-development environment values:
```bash
APP_ENV=production NODE_ENV=production docker compose up --build
```

Default credentials are defined in `compose.yml` for local development only.
MinIO console credentials are `minioadmin` / `minioadmin`.
Add production credentials renaming `.env.example` to `.env` and adding the correct production values.
