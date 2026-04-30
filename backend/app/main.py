from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel

from app.core.config import get_settings
from app.db.session import engine


settings = get_settings()

app = FastAPI(title=settings.app_name)


@app.get("/")
def root():
    return {"name": settings.app_name, "status": "running"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
