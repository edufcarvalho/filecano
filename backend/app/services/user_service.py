from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.params import (
  UserCreationParams,
  UserUpdateParams,
)


class UserService:
  def __init__(self, user_repository: UserRepository):
    self.repository = user_repository

  def create_user(self, params: UserCreationParams) -> User:
    if self._user_exists(params.email):
      raise ValueError("Email already registered")

    user = User(
      name=params.name,
      email=params.email,
      hashed_password=hash_password(params.password)
    )

    return self.repository.create(user)

  def update_user(self, user: User, params: UserUpdateParams) -> User:
    if params.email is not None and params.email != user.email:
      if self._user_exists(params.email):
        raise ValueError("Email already registered")

      user.email = params.email

    if params.name is not None:
      user.name = params.name

    if params.password is not None:
      user.hashed_password = hash_password(params.password)

    return self.repository.update(user)

  def _user_exists(self, email: str) -> bool:
    user = self.repository.get_by_email(email)

    return user is not None
