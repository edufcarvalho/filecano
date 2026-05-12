from uuid import UUID
from typing import Optional
from sqlmodel import Session, select

from app.models import Folder


class FolderRepository:
  def __init__(self, session: Session):
    self.session = session

  def add(self, folder: Folder) -> Folder:
    self.session.add(folder)

    self.session.commit()
    self.session.refresh(folder)

    return folder

  def commit(self) -> None:
    self.session.commit()

  def refresh(self, file: File) -> None:
    self.session.refresh(file)

  def rollback(self) -> None:
    self.session.rollback()

  def get_by_ids(self, folder_ids: list[UUID], user_id: UUID) -> list[Folder]:
    if not folder_ids:
      return []

    query = select(Folder).where(
      Folder.id.in_(folder_ids),
      Folder.user_id == user_id,
      Folder.deleted_at.is_(None),
    )

    return self.session.exec(query).all()

  def get_by_id(self, folder_id: UUID) -> Optional[Folder]:
    return self.session.get(Folder, folder_id)

  def list_by_user(self, user_id: UUID) -> list[Folder]:
    query = (
      select(Folder)
      .where(Folder.user_id == user_id, Folder.deleted_at.is_(None))
      .order_by(Folder.id.desc())
    )

    return self.session.exec(query).all()
