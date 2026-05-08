from typing import List, Optional
from uuid import UUID

from sqlmodel import Session, or_, select

from app.models import Link


class LinkRepository:
  def __init__(self, session: Session):
    self.session = session

  def add(self, link: Link) -> Link:
    self.session.add(link)

    return self._commit(link)

  def _commit(self, link: Link) -> Link:
    self.session.commit()
    self.session.refresh(link)

    return link

  def get_by_id(self, link_id: UUID) -> Optional[Link]:
    return self.session.get(Link, link_id)

  def get_by_token(self, token: str) -> Optional[Link]:
    query = select(Link).where(or_(Link.token == token, Link.custom_name == token))

    return self.session.exec(query).first()

  def list_by_user_id(self, user_id: UUID) -> List[Link]:
    query = (
      select(Link)
      .where(
        Link.user_id == user_id,
        Link.deleted_at.is_(None),
      )
      .order_by(Link.expires_at.desc())
    )

    return self.session.exec(query).all()

  def update(self, link: Link) -> Link:
    return self._commit(link)

  def delete(self, link: Link) -> None:
    self.session.delete(link)
    self.session.commit()
