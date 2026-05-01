from fastapi import APIRouter

from app.api.v1.routes import files, users

router = APIRouter()

router.include_router(files.router)
router.include_router(users.router)
