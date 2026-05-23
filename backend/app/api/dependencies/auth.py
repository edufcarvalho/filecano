from typing import Annotated, Optional

from fastapi import Depends, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.dependencies.services import get_auth_service
from app.core import AuthenticationError, get_settings
from app.models import User
from app.services import AuthService

bearer_auth = HTTPBearer(auto_error=False)
BEARER_HEADERS = {"WWW-Authenticate": "Bearer"}


def get_current_user(
  request: Request,
  credentials: Annotated[
    Optional[HTTPAuthorizationCredentials],
    Security(bearer_auth),
  ] = None,
  auth_service: AuthService = Depends(get_auth_service),
) -> User:
  settings = get_settings()
  token = _extract_token(request, credentials, settings.auth_cookie_name)

  if token is None:
    _raise_unauthorized("Authorization is required")

  try:
    return auth_service.authenticate_token(token)
  except AuthenticationError as error:
    _raise_unauthorized(str(error), error)


def _extract_token(
  request: Request,
  credentials: Optional[HTTPAuthorizationCredentials],
  cookie_name: str,
) -> Optional[str]:
  cookie_token = request.cookies.get(cookie_name)
  if cookie_token:
    return cookie_token

  if credentials is not None:
    return credentials.credentials

  return None


def _raise_unauthorized(
  detail: str,
  error: Optional[Exception] = None,
) -> None:
  raise AuthenticationError(detail, headers=BEARER_HEADERS) from error
