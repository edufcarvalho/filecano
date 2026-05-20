from typing import Optional
from uuid import UUID

from sqlalchemy.orm import aliased
from sqlmodel import and_, delete, func, or_, select, update

from app.models import File, Folder, FolderLinkRelation
from app.repositories.base_repository import BaseRepository
from app.utils.time import current_datetime


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

  def get_by_ids_and_link(self, folder_ids: list[UUID], link_id: UUID) -> list[Folder]:
    if not folder_ids:
      return []

    query = (
      select(Folder)
      .join(
        FolderLinkRelation,
        and_(
          FolderLinkRelation.link_id == link_id,
          FolderLinkRelation.folder_id == Folder.id,
        ),
      )
      .where(
        Folder.id.in_(folder_ids),
        Folder.deleted_at.is_(None),
      )
    )

    return self.session.exec(query).all()

  def list_by_user(self, user_id: UUID, deleted: bool = False) -> list[Folder]:
    query = select(Folder).where(Folder.user_id == user_id).order_by(Folder.id.desc())

    if not deleted:
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

    parent = aliased(Folder)

    query = (
      select(Folder)
      .join(
        parent,
        and_(
          Folder.parent_id == parent.id,
          parent.deleted_at.is_not(None),
        ),
        isouter=True,
      )
      .where(
        Folder.user_id == user_id,
        Folder.deleted_at.is_not(None),
        parent.id.is_(None),
      )
    )

    return self.session.exec(query).all()

  def delete_children(self, parent_id: UUID) -> None:
    self.soft_delete_by_parent(parent_id)

  def soft_delete_by_ids(self, folder_ids: list[UUID]) -> None:
    query = (
      update(Folder)
      .where(Folder.id.in_(folder_ids))
      .values(deleted_at=current_datetime())
    )

    self.session.exec(query)

  def delete_by_id(self, folder_id: UUID) -> None:
    folder = self.session.get(Folder, folder_id)

    if folder:
      self.session.delete(folder)

  def get_all_descendant_ids(self, folder_id: UUID) -> list[UUID]:
    descendants: set[UUID] = {folder_id}
    pending: list[UUID] = [folder_id]

    while pending:
      current = pending.pop()

      children = self.session.exec(
        select(Folder.id).where(Folder.parent_id == current)
      ).all()

      new_child_ids = [child_id for child_id in children if child_id not in descendants]

      descendants.update(new_child_ids)
      pending.extend(new_child_ids)

    return list(descendants)

  def get_files_by_folder_ids(self, folder_ids: list[UUID]) -> list[File]:
    query = select(File).where(File.parent_id.in_(folder_ids))

    return self.session.exec(query).all()

  def foldername_stored_by_user_count(
    self, name: str, user_id: UUID, parent_id: UUID | None
  ) -> int:
    pattern = rf"^{name} \([0-9]+\)$"

    query = select(func.count()).where(
      Folder.deleted_at.is_(None),
      Folder.user_id == user_id,
      Folder.parent_id == parent_id,
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

  def restore_by_ids(self, folder_ids: list[UUID]) -> None:
    if not folder_ids:
      return

    query = update(Folder).where(Folder.id.in_(folder_ids)).values(deleted_at=None)
    self.session.exec(query)
