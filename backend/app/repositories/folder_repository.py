from typing import Optional
from uuid import UUID

from sqlmodel import delete, func, or_, select

from app.models import File, Folder
from app.repositories.base_repository import BaseRepository


class FolderRepository(BaseRepository[Folder]):
  model = Folder

  def get_by_ids(self, folder_ids: list[UUID], user_id: UUID) -> list[Folder]:
    if not folder_ids:
      return []

    query = select(Folder).where(
      Folder.id.in_(folder_ids),
      Folder.user_id == user_id,
      Folder.deleted_at.is_(None),
    )

    return self.session.exec(query).all()

  def list_by_user(self, user_id: UUID, deleted: bool = False) -> list[Folder]:
    query = select(Folder).where(Folder.user_id == user_id).order_by(Folder.id.desc())

    if deleted:
      query = query.where(Folder.deleted_at.is_not(None))
    else:
      query = query.where(
        Folder.deleted_at.is_(None),
        Folder.parent_id.is_(None),
      )

    return self.session.exec(query).all()

  def delete_children(self, parent_id: UUID) -> None:
    self.soft_delete_by_parent(Folder, "parent_id", parent_id)

  def delete_by_id(self, folder_id: UUID) -> None:
    folder = self.session.get(Folder, folder_id)
    if folder:
      self.session.delete(folder)

  def get_all_descendant_ids(self, folder_id: UUID) -> list[UUID]:
    descendants: list[UUID] = {folder_id}
    pending: list[UUID] = [folder_id]

    while pending:
      current = pending.pop()

      children = self.session.exec(
        select(Folder.id).where(Folder.parent_id == current)
      ).all()

      new_child_ids = [child_id for child_id in children if child_id not in descendants]

      descendants.update(new_child_ids)
      pending.extend(new_child_ids)

    return descendants

  def get_files_by_folder_ids(self, folder_ids: list[UUID]) -> list[File]:
    query = select(File).where(File.folder_id.in_(folder_ids))

    return self.session.exec(query).all()

  def foldername_stored_by_user_count(self, name: str, user_id: UUID) -> int:
    pattern = rf"^{name} \([0-9]+\)$"

    query = select(func.count()).where(
      Folder.deleted_at.is_(None),
      Folder.user_id == user_id,
      or_(
        Folder.name == name,
        Folder.name.op("~")(pattern),
      ),
    )

    return self.session.exec(query).one()

  def list_by_multiple_ids_and_user(
    self, folder_ids: Optional[list[UUID]], user_id: UUID
  ) -> list[Folder]:
    if not folder_ids:
      return []

    query = select(Folder).where(
      Folder.id.in_(folder_ids),
      Folder.user_id == user_id,
      Folder.deleted_at.is_(None),
    )

    return self.session.exec(query).all()

  def delete_permanently(self, folder_id: UUID) -> None:
    query = delete(Folder).where(Folder.id == folder_id)

    self.session.exec(query)
    self.session.commit()
