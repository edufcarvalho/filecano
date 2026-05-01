from typing import Annotated

from fastapi import APIRouter, Body, Depends

from app.api.auth_middleware import AuthMiddleware
from app.api.dependencies import get_auth_service, get_user_service
from app.models.user import User
from app.schemas.params import (
  UserCreationParams,
  UserLoginParams,
  UserUpdateParams,
)
from app.services.auth_service import AuthService
from app.services.user_service import UserService as Service

router = APIRouter(prefix="/users", tags=["users"])


@router.post("")
def create_user(
  params: Annotated[UserCreationParams, Body()],
  service: Service = Depends(get_user_service),
) -> dict[str, str]:
  service.create_user(params)

  return {"message": "User created"}


@router.post("/login")
def login_user(
  params: Annotated[UserLoginParams, Body()],
  service: AuthService = Depends(get_auth_service),
) -> dict[str, object]:
  return service.login_user(params)


@router.put("")
def update_user(
  params: Annotated[UserUpdateParams, Body()],
  current_user: User = Depends(AuthMiddleware()),
  service: Service = Depends(get_user_service),
) -> dict[str, str]:
  service.update_user(current_user, params)

  return {"message": "User updated"}
