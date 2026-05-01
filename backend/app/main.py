
from fastapi import FastAPI

from app.api.exception_handling import register_exception_handlers
from app.api.v1.api import router as v1_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.include_router(v1_router, prefix="/api/v1")

register_exception_handlers(app)

@app.get("/")
def root():
    return {"name": settings.app_name, "status": "running"}

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
