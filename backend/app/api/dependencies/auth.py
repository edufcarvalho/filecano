from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from app.api.dependencies.services import get_auth_service
from app.core import AuthenticationError
from app.models import User
from app.services import AuthService


def get_current_user(
  authorization: Annotated[str | None, Header()] = None,
  auth_service: AuthService = Depends(get_auth_service),
) -> User:
  if authorization is None:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Authorization header is required",
      headers={"WWW-Authenticate": "Bearer"},
    )

  schema, _, token = authorization.partition(" ")

  if schema.lower() != "bearer" or not token:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Authorization header must use Bearer token",
      headers={"WWW-Authenticate": "Bearer"},
    )

  try:
    return auth_service.authenticate_token(token)
  except AuthenticationError as error:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail=str(error),
      headers={"WWW-Authenticate": "Bearer"},
    ) from error
