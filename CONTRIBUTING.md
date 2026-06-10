# Contributing to Filecano

Filecano is a self-hosted file storage and sharing app built with FastAPI, SQLModel, and Vite + React + TypeScript.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with compose and Buildx
- [Python 3.14+](https://www.python.org/) managed via [uv](https://github.com/astral-sh/uv)
- [Node.js 22+](https://nodejs.org/) with npm
- `make`

## Getting Started

```bash
make setup   # copies .env files and installs backend dependencies
make up      # starts all services
```

The app is served at `http://localhost` and `https://localhost` (self-signed certificate).

### Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `APP_ENV` | `development` | Backend hot reload — disabled only when `production` |
| `NODE_ENV` | `development` | Frontend HMR — disabled only when `production` |

Production run:

```bash
APP_ENV=production NODE_ENV=production docker compose up --build
```

### Debug Mode

For backend work, run services without the backend container, then start uvicorn locally with hot reload:

```bash
make debug
```

This exposes Postgres at `localhost:5432` instead of the internal Docker hostname, so you can set breakpoints and use the debugger.

---

## Services

| Service | Internal Port | Stack |
|---|---|---|
| `nginx` | 80, 443 | Reverse proxy with rate limiting |
| `back` | 8000 | FastAPI — uvicorn ASGI server |
| `worker` | — | Celery beat + worker (DragonflyDB broker) |
| `front` | 5173 | Vite dev server (React + TypeScript) |
| `database` | 5432 | PostgreSQL 16 |
| `data` | 9000 | MinIO S3-compatible object storage |
| `cache` | 6379 | DragonflyDB (Redis-compatible) |

---

## Project Structure

```
├── backend/                 FastAPI + SQLModel
│   ├── app/
│   │   ├── api/             Routes, dependencies, exception handlers
│   │   ├── core/            Configuration, JWT, password hashing
│   │   ├── db/              SQLModel session management
│   │   ├── models/          SQLModel table definitions
│   │   ├── repositories/    Database query layer
│   │   ├── schemas/         Pydantic request/response models
│   │   ├── services/        Business logic
│   │   ├── tasks/           Celery tasks and beat schedule
│   │   ├── tests/           pytest (unit/ + integration/)
│   │   └── utils/           Pagination, MIME detection, file helpers
│   └── migrations/          Alembic schema versions
├── frontend/                Vite + React + TypeScript
│   └── src/
│       ├── components/      Feature folders (auth, files, layout, links, ui, misc)
│       ├── hooks/           Custom React hooks
│       ├── i18n/            i18next translations (en, pt)
│       └── lib/             API client, session, form helpers, cn()
├── nginx/                   Reverse proxy configuration
└── compose.yml              Docker Compose orchestration
```

### Frontend Component Pattern

The frontend is a Vite project using React, TypeScript, and shadcn/Radix UI. Components are organized under `src/components/` grouped by domain:

```
src/components/
├── auth/       Login, signup, password forms
├── files/      File list, upload, trash, shared files
├── layout/     Site header, app layout
├── links/      Share link management
├── ui/         shadcn/Radix primitives (button, dialog, dropdown, etc.)
├── misc/       Search, language switcher, reusable utilities
└── errors/     Error boundaries, not-found pages
```

#### Adding shadcn/Radix Components

```bash
npx shadcn@latest add button
```

Components are placed in `src/components/ui/` as local source files (not npm packages), so they can be edited directly. Import them using the path alias:

```tsx
import { Button } from "@/components/ui/button"
```

Available aliases: `@/`, `@auth/`, `@files/`, `@layout/`, `@misc/`, `@errors/`, `@ui/`

---

## Code Style

### Backend (Ruff)

- 2-space indent, double quotes, 88-char line length
- Lint: `cd backend && make lint`
- Auto-fix: `cd backend && make format`

### Frontend (ESLint + Prettier)

- 2-space indent, double quotes, no semicolons, 80-char line length
- TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`
- Lint: `cd frontend && npm run lint`
- Format: `cd frontend && npm run format`
- Type-check: `cd frontend && npm run typecheck`

---

## Testing

### Backend (pytest)

```bash
cd backend
make test              # All tests, 70% coverage minimum
make test-unit         # Unit tests only
make test-integration  # Integration tests only
```

Stack: pytest, pytest-asyncio (auto mode), pytest-cov, httpx. Tests mirror source under `app/tests/unit/` and `app/tests/integration/`.

### Frontend (Vitest)

```bash
cd frontend
npm test               # Run once
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

Stack: Vitest, jsdom, @testing-library/react, MSW (API mocking). Test files are co-located with source (`*.test.ts`, `*.test.tsx`).

---

## Architecture Conventions

### Backend — Separation of Concerns

Routes are thin — they validate input, call a service, and return a response. Business rules live in services. Data access lives in repositories. Exception handlers in `core/exceptions.py` produce consistent JSON error responses.

### Frontend — Centralized Data Flow

- All API calls go through **`src/lib/api.ts`** — never construct request URLs in components.
- Session and authentication state is in **`src/lib/session.ts`**. The access token is stored as an HTTP-only cookie, with localStorage as a fallback when cookies aren't available.
- Shared utilities live in `src/lib/` — `cn()` for Tailwind class merging, `form.ts` for form types, `file.ts` for display helpers, and `password.ts` for validation.

### File Storage

MinIO handles object storage via `FileStorageService`. Files are deduplicated on re-upload by comparing checksums against soft-deleted records. Soft deletion uses MinIO versioning (delete markers) rather than immediately removing objects.

### Background Tasks

Celery tasks live in `backend/app/tasks/`. To add a new task, create a file in that directory and register it on the Celery app:

```python
from app.tasks.celery import celery

@celery.task(name="example.health_check")
def health_check() -> str:
  return "celery-worker-ok"
```

The worker runs both task processing and the beat scheduler for periodic jobs like retention policy enforcement.

### Database

PostgreSQL stores relational metadata (users, files, folders, share links). Always create an Alembic migration for schema changes:

```bash
cd backend
uv run alembic revision --autogenerate -m "description of change"
```

---

## CI Pipeline

Runs on push and pull request to `main`:

| Job | Steps |
|---|---|
| **backend** | lint → format check → test (≥70% cov) |
| **frontend** | lint → typecheck → test |
| **security** | npm audit, pip-audit (advisory, non-blocking) |

Dependabot keeps npm, pip, and GitHub Actions dependencies up to date weekly.

---

## Pull Request Checklist

- [ ] Branch from `main` with a descriptive name
- [ ] Backend: `make lint && make format && make test` pass
- [ ] Frontend: `npm run lint && npm run typecheck && npm test` pass
- [ ] Database schema changes include an Alembic migration
- [ ] No secrets, credentials, or `.env` files committed
- [ ] PR description follows the template
