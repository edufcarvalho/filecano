from typing import Annotated, Optional

from fastapi import APIRouter, Body, Depends, Security, status
from fastapi.security import HTTPAuthorizationCredentials

from app.api.dependencies import get_auth_service, get_current_user, get_user_service
from app.api.dependencies.auth import bearer_auth
from app.core import AuthenticationError
from app.models import User
from app.schemas import (
  TokenResponse,
  UserCreationParams,
  UserLoginParams,
  UserResponse,
  UserUpdateParams,
)
from app.services import AuthService
from app.services import UserService as Service

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def create_user(
  params: Annotated[UserCreationParams, Body()],
  user_service: Service = Depends(get_user_service),
  auth_service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
  user_service.create_user(params)

  return auth_service.login_user(params)


@router.post("/login", response_model=TokenResponse)
def login_user(
  params: Annotated[UserLoginParams, Body()],
  service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
  return service.login_user(params)


@router.post("/token/refresh", response_model=TokenResponse)
def refresh_token(
  credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_auth),
  service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
  if credentials is None:
    raise AuthenticationError("Authorization header is required")

  return service.refresh_token(credentials.credentials)


@router.put("", response_model=UserResponse)
def update_user(
  params: Annotated[UserUpdateParams, Body()],
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_user_service),
) -> UserResponse:
  return service.update_user(current_user, params)
