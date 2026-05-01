from uuid import UUID

from sqlmodel import Session, select

from app.models.user import User


class UserRepository:
  def __init__(self, session: Session):
    self.session = session

  def create(self, user: User) -> User:
    self.session.add(user)
    self.session.commit()
    self.session.refresh(user)

    return user

  def get_by_email(self, email: str) -> User:
    query = select(User).where(User.email == email)

    return self.session.exec(query).first()

  def get_by_id(self, user_id: UUID) -> User:
    return self.session.get(User, user_id)

  def update(self, user: User) -> User:
    self.session.add(user)
    self.session.commit()
    self.session.refresh(user)

    return user
