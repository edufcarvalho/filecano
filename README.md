# Filecano

Store, organize, and retrieve files with a clean workspace.

Basic FastAPI + SQLModel on back-end Vite + React + Typescript on front-end with Postgres database and MinIO object storage

## Services

- `back`: FastAPI API on `http://localhost:8000` running with `uvicorn` as server
- `front`: React + TypeScript frontend on `http://localhost:5173` running with `vite` as server
- `database`: Postgres on `localhost:5432`
- `data`: MinIO API on `localhost:9000`, console on `http://localhost:9001`

## Architectural Decisions

### Frontend

- Routing is handled client-side with `react-router-dom`. Authenticated app routes, signed-out routes, and public share links are separated in `App.tsx`
- UI code follows separation of concerns by feature folder: auth components live in `components/auth`, file workflows in `components/files`, link workflows in `components/links`, layout in `components/layout`, reusable primitives in `components/ui`, and cross-cutting helpers in `lib`
- API access is centralized in `src/lib/api.ts`. Components call typed functions instead of constructing request URLs directly, and the API layer owns response parsing, download helpers, unauthorized handling, and token refresh retry logic
- Session state is isolated in `src/lib/session.ts`. The app stores the access token in local storage and derives display user data from the JWT payload when available
- Styling uses Tailwind CSS v4 with shadcn/Radix as UI base component libraries, the project keeps them as local source files under `components/ui`, which makes component behavior editable inside the project, which would make them inaccessible for editing inside the project
- `lucide-react` is the icon library, matching the shadcn configuration and keeping icon usage consistent across buttons, dropdowns, file types, and status UI
- Small reusable utilities are kept in `lib`, such as `cn()` for class merging, file display helpers, password validation, form types, and session helpers

### Backend

- The backend is a FastAPI application organized using Segregation of Concerns (SoC): 
  - `api` for HTTP routes and dependencies
  - `services` for business rules,
  - `repositories` for database interaction
  - `models` for SQLMode objects with tables
  - `schemas` for request/response contracts
  - `core` for configuration, security and errors
  - `utils` for shared helpers
- Routes stay thin and are execute actions based on verbs (`api` calls `self.service.do_something(...contract)).`, `APIRouter` modules define endpoints, request/response models, authentication dependencies, and streaming responses, while business behavior is delegated to services
- Repositories encapsulate SQL queries. They receive a SQLModel `Session` through FastAPI dependency injection, keeping persistence concerns separate from service logic
- Alembic manages schema migrations for Postgres, making the database versioned
- Postgres stores relational metadata for users, files, and share links. MinIO stores the actual files and generated previews through an S3-compatible API, which is useful for easy migration to S3 in a production environment, keeping object storage separate from database metadata
- File storage is wrapped by `FileStorageService`. This isolates MinIO setup, bucket versioning, upload/download/delete operations, and streaming response iteration from the rest of the app
- Authentication uses bearer tokens. Passwords are hashed with Argon2 (chosen over `BCrypt` because is safer) using `passlib`, and access tokens are signed `JWTs` using the configured `secret`, `algorithm`, `expiry`, and `refresh grace period`
- Configuration is environment-driven with `pydantic-settings`. Defaults support `dev` environment, while production secrets and endpoints can be supplied through a `.env`
- Application errors are modeled as domain-specific exceptions in `core/exceptions.py` and registered through FastAPI exception handlers, producing consistent JSON error responses
- UUIDv7 identifiers are used for users, files, and links. This keeps IDs globally unique while making time ordering less time complex than using the actual datetime fields

## Execution

### Dependencies
```
docker
docker-compose
bash
```

### Script
```bash
docker compose up --build
```

The compose defaults envs to `APP_ENV=development` and `NODE_ENV=development`, so backend reload and Vite HMR are enabled with source bind mounts.

For non-development containers, pass non-development environment values:
```bash
APP_ENV=production NODE_ENV=production docker compose up --build
```

Default credentials are defined in `compose.yml` for local development only
MinIO console credentials are `minioadmin` / `minioadmin`
Add production credentials renaming `.env.example` to `.env` and adding the correct production values
