from uuid import UUID
from typing import Optional
from sqlmodel import Session

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
