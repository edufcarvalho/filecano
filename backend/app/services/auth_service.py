from uuid import UUID

from app.core.config import Settings
from app.core.security import (
  create_access_token,
  decode_access_token,
  verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.params import UserLoginParams


class AuthService:
  def __init__(self, user_repository: UserRepository, settings: Settings):
    self.repository = user_repository
    self.settings = settings

  def login_user(self, params: UserLoginParams) -> dict[str, object]:
    user = self.repository.get_by_email(params.email)

    if user is None or not verify_password(params.password, user.hashed_password):
      raise ValueError("Invalid email or password")

    access_token = create_access_token(
      {"sub": str(user.id)},
      secret_key=self.settings.jwt_secret_key,
      algorithm=self.settings.jwt_algorithm,
      expires_seconds=self.settings.access_token_expire_seconds,
    )

    return {
      "access_token": access_token,
      "token_type": "bearer",
      "expires_in": self.settings.access_token_expire_minutes * 60,
    }

  def get_authenticated_user(self, user_id: UUID) -> User:
    user = self.repository.get_by_id(user_id)

    if user is None:
      raise ValueError("User not found")

    return user

  def authenticate_token(self, token: str) -> User:
    payload = decode_access_token(
      token,
      secret_key=self.settings.jwt_secret_key,
      algorithm=self.settings.jwt_algorithm,
    )
    user_id = payload.get("sub")

    if not isinstance(user_id, str):
      raise ValueError("Invalid access token")

    try:
      parsed_user_id = UUID(user_id)
    except ValueError as error:
      raise ValueError("Invalid access token") from error

    return self.get_authenticated_user(parsed_user_id)
