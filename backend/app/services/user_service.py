from app.schemas.params import UserParams as Params
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.core.security import hash_password

class UserService:
  def __init__(self, user_repository: UserRepository):
    self.repository = user_repository

  def create_user(self, params: Params) -> User:
    if self._user_exists(params.email):
      raise ValueError("Email already registered")
    
    user = User(
      name=params.name,
      email=params.email,
      hashed_password=hash_password(params.password)
    )

    return self.repository.create(user)

  def _user_exists(self, email: Params) -> bool:
    user = self.repository.get_by_email(email)

    return user is not None
