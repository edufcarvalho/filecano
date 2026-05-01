from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.core import ConflictError, hash_password
from app.models import User
from app.repositories import UserRepository
from app.schemas import (
  UserCreationParams,
  UserUpdateParams,
)


class UserService:
  def __init__(self, user_repository: UserRepository, session: Session):
    self.repository = user_repository
    self.session = session

  def create_user(self, params: UserCreationParams) -> User:
    if self._user_exists(params.email):
      raise ConflictError("Email already registered")

    user = User(
      name=params.name,
      email=params.email,
      hashed_password=hash_password(params.password),
    )

    self.repository.add(user)
    self.session.commit()
    self.session.refresh(user)

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

    try:
      self.session.commit()
      self.session.refresh(user)
    except IntegrityError as error:
      self.session.rollback()
      raise ConflictError("Email already registered") from error

    return user

  def _user_exists(self, email: str) -> bool:
    user = self.repository.get_by_email(email)

    return user is not None
