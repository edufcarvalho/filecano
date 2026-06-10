from typing import Annotated, Optional

from fastapi import (
  APIRouter,
  Body,
  Depends,
  Request,
  Response,
  Security,
  status,
)
from fastapi.security import HTTPAuthorizationCredentials

from app.api.dependencies import get_auth_service, get_current_user, get_user_service
from app.api.dependencies.auth import bearer_auth
from app.core import (
  AuthenticationError,
  clear_token_cookie,
  get_settings,
  set_token_cookie,
)
from app.models import User
from app.schemas import (
  AuthResponse,
  UserCreationParams,
  UserLoginParams,
  UserResponse,
  UserUpdateParams,
)
from app.services import AuthService
from app.services import UserService as Service

router = APIRouter(prefix="/users", tags=["users"])


def _build_auth_response(
  response: Response,
  result: dict[str, object],
) -> AuthResponse:
  access_token = str(result["access_token"])
  set_token_cookie(response, access_token)

  user = result["user"]
  return AuthResponse(
    id=user["id"],  # type: ignore[arg-type]
    name=user["name"],  # type: ignore[arg-type]
    email=user["email"],  # type: ignore[arg-type]
    expires_in=result["expires_in"],  # type: ignore[arg-type]
    access_token=access_token,
    token_type=str(result["token_type"]),
  )


@router.post("", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def create_user(
  params: Annotated[UserCreationParams, Body()],
  response: Response,
  user_service: Service = Depends(get_user_service),
  auth_service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
  user_service.create_user(params)

  return _build_auth_response(response, auth_service.login_user(params))


@router.post("/login", response_model=AuthResponse)
def login_user(
  params: Annotated[UserLoginParams, Body()],
  response: Response,
  service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
  return _build_auth_response(response, service.login_user(params))


@router.post("/token/refresh", response_model=AuthResponse)
def refresh_token(
  response: Response,
  request: Request,
  credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_auth),
  service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
  settings = get_settings()
  cookie_token = request.cookies.get(settings.auth_cookie_name)

  if cookie_token is not None:
    return _build_auth_response(response, service.refresh_token(cookie_token))

  if credentials is not None:
    return _build_auth_response(
      response, service.refresh_token(credentials.credentials)
    )

  raise AuthenticationError(
    "Authorization is required", headers={"WWW-Authenticate": "Bearer"}
  )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
  clear_token_cookie(response)


@router.get("/me", response_model=UserResponse)
def me(
  current_user: User = Depends(get_current_user),
) -> UserResponse:
  return UserResponse.model_validate(current_user)


@router.put("", response_model=UserResponse)
def update_user(
  params: Annotated[UserUpdateParams, Body()],
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_user_service),
) -> UserResponse:
  return service.update_user(current_user, params)
