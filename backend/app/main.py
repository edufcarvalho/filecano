from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.dependencies import register_exception_handlers
from app.api.v1.api import router as v1_router
from app.core import get_settings

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
  CORSMiddleware,
  allow_origins=settings.cors_origin_list,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
  expose_headers=["Content-Disposition", "X-Checksum-SHA256"],
)

app.include_router(v1_router, prefix="/api")

register_exception_handlers(app)


@app.get("/")
def root() -> dict[str, str]:
  return {"name": settings.app_name, "status": "running"}


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
  return {"status": "ok"}
