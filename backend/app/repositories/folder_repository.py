from uuid import UUID

from sqlmodel import Session, select

from app.models import Folder


class FolderRepository:
  def __init__(self, session: Session):
    self.session = session

  def get_by_ids(self, folder_ids: list[UUID], user_id: UUID) -> list[Folder]:
    if not folder_ids:
      return []

    query = select(Folder).where(
      Folder.id.in_(folder_ids),
      Folder.user_id == user_id,
      Folder.deleted_at.is_(None),
    )

    return list(self.session.exec(query).all())

  def list_by_user(self, user_id: UUID) -> list[Folder]:
    query = (
      select(Folder)
      .where(Folder.user_id == user_id, Folder.deleted_at.is_(None))
      .order_by(Folder.created_at.desc())
    )

    return list(self.session.exec(query).all())
