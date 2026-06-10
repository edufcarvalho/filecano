from __future__ import annotations

from datetime import timedelta
from typing import Optional
from uuid import UUID

from sqlmodel import delete, or_, select

from app.models import Link
from app.repositories.base_repository import BaseRepository
from app.utils.time import current_datetime


class LinkRepository(BaseRepository[Link]):
  model = Link

  def get_by_token(self, token: str) -> Optional[Link]:
    query = select(Link).where(or_(Link.token == token, Link.custom_name == token))
    return self.session.exec(query).first()

  def list_by_user_id(self, user_id: UUID) -> list[Link]:
    query = (
      select(Link)
      .where(
        Link.user_id == user_id,
        Link.deleted_at.is_(None),
      )
      .order_by(Link.expires_at.desc())
    )

    return self.session.exec(query).all()

  def delete_not_retainable(self) -> None:
    query = delete(self.model).where(
      self.model.expires_at + timedelta(days=self.settings.data_retention_policy)
      <= current_datetime(),
    )

    return self.session.exec(query)

  def update(self, link: Link) -> Link:
    return self.save(link)

  def delete(self, link: Link) -> None:
    self.hard_delete(link)
