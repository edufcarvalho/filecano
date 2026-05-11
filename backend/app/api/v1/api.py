from fastapi import APIRouter

from app.api.v1.routes import files, folders, links, users

router = APIRouter(prefix="/v1")

router.include_router(files.router)
router.include_router(users.router)
router.include_router(links.router)
router.include_router(folders.router)
