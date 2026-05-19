from app.core import ConflictError, hash_password
from app.models import User
from app.repositories import UserRepository
from app.schemas import (
  UserCreationParams,
  UserUpdateParams,
)


class UserService:
  def __init__(self, user_repository: UserRepository):
    self.repository = user_repository

  def create_user(self, params: UserCreationParams) -> User:
    if self._user_exists(params.email):
      raise ConflictError("Email already registered")

    user = User(
      name=params.name,
      email=params.email,
      hashed_password=hash_password(params.password),
    )

    self.repository.add(user)
    self.repository.commit()
    self.repository.refresh(user)

    return user

  def update_user(self, user: User, params: UserUpdateParams) -> User:
    if params.email is not None and params.email != user.email:
      if self._user_exists(params.email):
        raise ConflictError("Email already registered")

      user.email = params.email

    if params.name is not None:
      user.name = params.name

    if params.password is not None:
      user.hashed_password = hash_password(params.password)

    self.repository.add(user)
    self.repository.commit()
    self.repository.refresh(user)

    return user

  def _user_exists(self, email: str) -> bool:
    user = self.repository.get_by_email(email)

    return user is not None
