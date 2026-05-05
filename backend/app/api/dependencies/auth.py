from typing import Annotated, Optional

from fastapi import Depends, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.dependencies.services import get_auth_service
from app.core import AuthenticationError
from app.models import User
from app.services import AuthService

bearer_auth = HTTPBearer(auto_error=False)
BEARER_HEADERS = {"WWW-Authenticate": "Bearer"}


def get_current_user(
  credentials: Annotated[
    Optional[HTTPAuthorizationCredentials],
    Security(bearer_auth),
  ] = None,
  auth_service: AuthService = Depends(get_auth_service),
) -> User:
  if credentials is None:
    _raise_unauthorized("Authorization header is required")

  try:
    return auth_service.authenticate_token(credentials.credentials)
  except AuthenticationError as error:
    _raise_unauthorized(str(error), error)


def _raise_unauthorized(
  detail: str,
  error: Optional[Exception] = None,
) -> None:
  raise AuthenticationError(detail, headers=BEARER_HEADERS) from error
