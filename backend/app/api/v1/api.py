from fastapi import APIRouter

from app.api.v1.routes import files, users, links

router = APIRouter(prefix="/v1")

router.include_router(files.router)
router.include_router(users.router)
router.include_router(links.router)
