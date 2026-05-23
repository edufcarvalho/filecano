# Filecano

Store, organize, and retrieve files with a clean workspace.

FastAPI + SQLModel on the back-end, Vite + React + TypeScript on the front-end, with a Postgres database and MinIO object storage

## Services

- `back`: FastAPI API on `http://localhost:8000` running with `uvicorn` as server
- `worker`: Celery worker processing background tasks (retention enforcement, scheduled cleanup) using DragonflyDB as cache database
- `front`: React + TypeScript frontend on `http://localhost:5173` running with `vite` as server
- `database`: Postgres on `localhost:5432`
- `data`: MinIO API on `localhost:9000`, console on `http://localhost:9001`
- `cache`: DragonflyDB (Redis-compatible) used as the Celery broker/backend and shared cache

## Architectural Decisions

### Frontend

- Routing is handled client-side with `react-router-dom`. Authenticated app routes, signed-out routes, and public share links are separated in `App.tsx`
- UI code follows separation of concerns by feature folder: auth components live in `components/auth`, file workflows in `components/files`, link workflows in `components/links`, layout in `components/layout`, reusable primitives in `components/ui`, and cross-cutting helpers in `lib`
- API access is centralized in `src/lib/api.ts`. Components call typed functions instead of constructing request URLs directly, and the API layer owns response parsing, download helpers, unauthorized handling, and token refresh retry logic
- Session state is isolated in `src/lib/session.ts`. The app stores the access token in local storage and derives display user data from the JWT payload when available
- Styling uses Tailwind CSS v4 with shadcn/Radix as UI base component libraries. The components are kept as local source files under `components/ui`, making their behavior editable inside the project, unlike npm packages which would be inaccessible for direct editing
- `lucide-react` is the icon library, matching the shadcn configuration and keeping icon usage consistent across buttons, dropdowns, file types, and status UI
- Small reusable utilities are kept in `lib`, such as `cn()` for class merging, file display helpers, password validation, form types, and session helpers
- Internationalization is handled with `i18next` and `react-i18next`, supporting English and Portuguese. Language preference is persisted in `localStorage` and detected from the browser on first visit
- Theme support uses Tailwind's dark mode with a `ThemeProvider` wrapping the app. User preference is persisted in `localStorage` and falls back to the system preference (detected via an inline script in `index.html` before React loads)
- Code splitting is done with `React.lazy()` and `Suspense`. Route-level components (Login, Signup, EditUser, Trash, SharedFiles) are lazy-loaded to reduce the initial bundle size
- File uploads use `XMLHttpRequest` instead of `fetch` to support upload progress events, which are surfaced through the upload dropzone UI
- Frontend testing uses Vitest with `jsdom`, `@testing-library/react`, and MSW for API mocking. Test files are co-located with source (`*.test.ts`, `*.test.tsx`)

### Backend

- The backend is a FastAPI application organized using Segregation of Concerns (SoC): 
  - `api` for HTTP routes and dependencies
  - `services` for business rules,
  - `repositories` for database interaction
  - `models` for SQLMode objects with tables
  - `schemas` for request/response contracts
  - `core` for configuration, security and errors
  - `utils` for shared helpers
- Routes stay thin and execute actions based on verbs (`api` calls `self.service.do_something(...contract)`). `APIRouter` modules define endpoints, request/response models, authentication dependencies, and streaming responses, while business behavior is delegated to services
- Repositories encapsulate SQL queries. They receive a SQLModel `Session` through FastAPI dependency injection, keeping persistence concerns separate from service logic
- Alembic manages schema migrations for Postgres, making the database versioned
- Postgres stores relational metadata for users, files, and share links. MinIO stores the actual files and generated previews through an S3-compatible API, which is useful for easy migration to S3 in a production environment, keeping object storage separate from database metadata
- File storage is wrapped by `FileStorageService`. This isolates MinIO setup, bucket versioning, upload/download/delete operations, and streaming response iteration from the rest of the app
- Authentication uses bearer tokens. Passwords are hashed with Argon2 (chosen over `bcrypt` because it is safer) using `passlib`, and access tokens are signed `JWTs` using the configured `secret`, `algorithm`, `expiry`, and `refresh grace period`
- Configuration is environment-driven with `pydantic-settings`. Defaults support `dev` environment, while production secrets and endpoints can be supplied through a `.env`
- Application errors are modeled as domain-specific exceptions in `core/exceptions.py` and registered through FastAPI exception handlers, producing consistent JSON error responses
- UUIDv7 identifiers are used for users, files, and links. This keeps IDs globally unique while providing time-ordering without the complexity of comparing separate datetime fields
- Soft deletion is implemented via MinIO versioning: deleting a file adds a delete marker on the bucket while metadata rows get a `deleted_at` timestamp. Restoring a file removes the delete marker, and permanent deletion removes all object versions along with the database row
- File deduplication on re-upload: when a file is uploaded, the system checks for a previously soft-deleted file with the same checksum and display name; if found, it restores the existing file instead of creating a duplicate
- Image previews are generated for `image/jpeg`, `image/png`, `image/gif`, and `image/webp` files using Pillow, resized to 200x200 JPEG at quality 85 and stored alongside the original in MinIO
- Celery is used for background and scheduled tasks. The worker runs retention policy enforcement periodically, automatically hard-deleting files, folders, and links that have been in the trash beyond the configured retention period
- Folder cascade behavior (soft-delete children, restore children, permanent delete children) is handled explicitly in service methods rather than relying on ORM-level cascades, keeping deletion logic explicit and debuggable
- GIN trigram indexes (`pg_trgm`) are used on file and folder name columns to enable efficient fuzzy search queries
- Access tokens are stored as HTTP-only, `SameSite=lax` cookies (`filecano_access_token`) in addition to supporting the `Authorization: Bearer` header, reducing the risk of XSS token theft
- Backend testing uses `pytest` with `pytest-asyncio` (auto mode), `pytest-cov` (70% coverage minimum), and `httpx` for async HTTP test clients. Unit tests mirror the source structure under `tests/unit/`, and integration tests live in `tests/integration/`

## Execution

### Dependencies
```
docker
docker-compose
docker-buildx-plugin
bash
make
```

### Script
```bash
make up
```

The compose defaults envs to `APP_ENV=development` and `NODE_ENV=development`, so backend reload and Vite HMR are enabled with source bind mounts.

For non-development containers, pass non-development environment values:
```bash
APP_ENV=production NODE_ENV=production docker compose up --build
```

Default credentials are defined in `compose.yml` for local development only
MinIO console credentials are `minioadmin` / `minioadmin`.
Add production credentials by renaming `.env.example` to `.env` and adding the correct production values.
