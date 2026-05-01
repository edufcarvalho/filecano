from typing import Annotated

from fastapi import Depends, Header, HTTPException, status

from app.api.dependencies import get_auth_service
from app.models.user import User
from app.services.auth_service import AuthService


class AuthMiddleware:
  def __call__(
    self,
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
    except ValueError as error:
      raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=str(error),
        headers={"WWW-Authenticate": "Bearer"},
      ) from error
