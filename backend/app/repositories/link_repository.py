from uuid import UUID

from sqlmodel import Session
from app.models import Link

class LinkRepository:
  def __init__(self, session: Session):
    self.session = session

  def add(self, link: Link) -> Link:
    self.session.add(link)

    return link
  
  def get_by_id(self, link_id: UUID) -> Link:
    self.session.get(Link, link_id)
