from datetime import timedelta
from typing import Optional

from sqlmodel import delete, select

from app.models import User
from app.repositories.base_repository import BaseRepository
from app.utils.time import current_datetime


class UserRepository(BaseRepository[User]):
  model = User

  def get_by_email(self, email: str) -> Optional[User]:
    query = select(User).where(User.email == email)

    return self.session.exec(query).first()

  def delete_not_retainable(self) -> None:
    query = delete(User).where(
      User.deleted_at + timedelta(days=self.settings.data_retention_policy)
      <= current_datetime()
    )

    return self.session.exec(query)
