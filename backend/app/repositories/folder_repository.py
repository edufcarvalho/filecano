from typing import Optional
from uuid import UUID

from sqlmodel import Session, func, or_, select, update

from app.models import Folder
from app.utils.time import current_datetime


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

  def refresh(self, folder: Folder) -> None:
    self.session.refresh(folder)

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
      .where(
        Folder.user_id == user_id,
        Folder.deleted_at.is_(None),
        Folder.parent_id.is_(None),
      )
      .order_by(Folder.id.desc())
    )

    return self.session.exec(query).all()

  def delete_children(self, parent_id: UUID) -> None:
    query = (
      update(Folder)
      .where(Folder.parent_id == parent_id)
      .values(deleted_at=current_datetime())
    )

    self.session.exec(query)
    self.session.commit()


  def foldername_stored_by_user_count(self, name: str, user_id: UUID) -> int:
    pattern = rf"^{name} \([0-9]+\)$"

    query = (
      select(func.count())
      .where(
        Folder.deleted_at.is_(None),
        Folder.user_id == user_id,
        or_(
          Folder.name == name,
          Folder.name.op("~")(pattern),
        ),
      )
    )

    return self.session.exec(query).one()
