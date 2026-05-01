from uuid import UUID
from typing import Optional
from sqlmodel import Session, select

from app.models import User


class UserRepository:
  def __init__(self, session: Session):
    self.session = session

  def add(self, user: User) -> User:
    self.session.add(user)

    return user

  def get_by_email(self, email: str) -> Optional[User]:
    query = select(User).where(User.email == email)

    return self.session.exec(query).first()

  def get_by_id(self, user_id: UUID) -> Optional[User]:
    return self.session.get(User, user_id)
