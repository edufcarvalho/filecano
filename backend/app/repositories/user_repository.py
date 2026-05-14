from typing import Optional

from sqlmodel import select

from app.models import User
from app.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):
  model = User

  def get_by_email(self, email: str) -> Optional[User]:
    query = select(User).where(User.email == email)
    return self.session.exec(query).first()
