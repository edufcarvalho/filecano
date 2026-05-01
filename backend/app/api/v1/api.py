from fastapi import APIRouter

from app.api.v1.routes import users
from app.api.exception_handling import register_exception_handlers

router = APIRouter()

router.include_router(users.router)