from time import time
from uuid import UUID

from app.core import (
  AuthenticationError,
  Settings,
  create_token,
  decode_token,
  verify_password,
)
from app.models import User
from app.repositories import UserRepository
from app.schemas import UserLoginParams


class AuthService:
  def __init__(self, user_repository: UserRepository, settings: Settings):
    self.repository = user_repository
    self.settings = settings

  def login_user(self, params: UserLoginParams) -> dict[str, object]:
    user = self._authenticate_credentials(params.email, params.password)
    access_token = self._create_user_access_token(user)

    return {
      "access_token": access_token,
      "token_type": "bearer",
      "expires_in": self.settings.access_token_expire_seconds,
    }

  def authenticate_token(self, token: str) -> User:
    payload = self._decode_token(token)
    user_id = self._get_token_subject(payload)

    return self.get_authenticated_user(user_id)

  def refresh_token(self, token: str) -> dict[str, object]:
    payload = self._decode_token(token, verify_expiration=False)
    expires_at = payload.get("exp")

    if not isinstance(expires_at, int):
      raise AuthenticationError("Invalid access token")

    if expires_at + self.settings.access_token_refresh_grace_seconds <= int(time()):
      raise AuthenticationError("Access token expired")

    user = self.get_authenticated_user(self._get_token_subject(payload))
    access_token = self._create_user_access_token(user)

    return {
      "access_token": access_token,
      "token_type": "bearer",
      "expires_in": self.settings.access_token_expire_seconds,
    }

  def get_authenticated_user(self, user_id: UUID) -> User:
    user = self.repository.get_by_id(user_id)

    if user is None:
      raise AuthenticationError("User not found")

    return user

  def _authenticate_credentials(self, email: str, password: str) -> User:
    user = self.repository.get_by_email(email)

    if user is None or not verify_password(password, user.hashed_password):
      raise AuthenticationError("Invalid email or password")

    return user

  def _create_user_access_token(self, user: User) -> str:
    return create_token(
      payload={
        "sub": str(user.id),
        "name": user.name,
        "email": user.email,
      },
      secret_key=self.settings.jwt_secret_key,
      algorithm=self.settings.jwt_algorithm,
      expire_in=self.settings.access_token_expire_seconds,
    )

  def _decode_token(
    self,
    token: str,
    verify_expiration: bool = True,
  ) -> dict[str, object]:
    try:
      return decode_token(
        token,
        secret_key=self.settings.jwt_secret_key,
        algorithm=self.settings.jwt_algorithm,
        verify_expiration=verify_expiration,
      )
    except ValueError as error:
      raise AuthenticationError(str(error)) from error

  def _get_token_subject(self, payload: dict[str, object]) -> UUID:
    user_id = payload.get("sub")

    try:
      return UUID(user_id)
    except (TypeError, ValueError) as error:
      raise AuthenticationError("Invalid access token") from error
