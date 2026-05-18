from typing import Optional
from uuid import UUID

from sqlalchemy.orm import selectinload
from sqlmodel import and_, func, or_, select

from app.models import File, Folder
from app.models.file_link_relation import FileLinkRelation
from app.repositories.base_repository import BaseRepository


class FileRepository(BaseRepository[File]):
  model = File

  def list_by_multiple_ids_and_user(
    self, file_ids: list[UUID], user_id: UUID
  ) -> list[File]:
    if not file_ids:
      return []

    query = (
      select(File)
      .where(
        File.id.in_(file_ids),
        File.user_id == user_id,
        File.deleted_at.is_(None),
      )
      .order_by(File.id)
    )

    return self.session.exec(query).all()

  def get_by_id_and_link(self, file_id: UUID, link_id: UUID) -> Optional[File]:
    query = (
      select(File)
      .join(FileLinkRelation, FileLinkRelation.file_id == File.id)
      .where(
        File.id == file_id,
        File.deleted_at.is_(None),
        FileLinkRelation.link_id == link_id,
      )
    )

    return self.session.exec(query).first()

  def get_by_multiple_ids_and_link(
    self, file_ids: list[UUID], link_id: UUID
  ) -> list[File]:
    query = (
      select(File)
      .join(
        FileLinkRelation,
        FileLinkRelation.file_id == File.id,
        FileLinkRelation.link_id == link_id,
      )
      .where(
        File.id.in_(file_ids),
        File.deleted_at.is_(None),
      )
    )

    return self.session.exec(query).all()

  def list_by_link(
    self,
    link_id: UUID,
    file_ids: Optional[list[UUID]] = None,
    include_deleted: Optional[bool] = False,
  ) -> list[File]:
    query = (
      select(File)
      .join(FileLinkRelation, FileLinkRelation.file_id == File.id)
      .where(FileLinkRelation.link_id == link_id)
      .order_by(File.id)
    )

    if not include_deleted:
      query = query.where(File.deleted_at.is_(None))

    if file_ids is not None:
      query = query.where(File.id.in_(file_ids))

    return self.session.exec(query).all()

  def list_by_link_with_folder(
    self,
    link_id: UUID,
    include_deleted: bool = False,
  ) -> list[File]:
    query = (
      select(File)
      .options(selectinload(File.folder))
      .join(FileLinkRelation, FileLinkRelation.file_id == File.id)
      .where(FileLinkRelation.link_id == link_id)
      .order_by(File.id)
    )

    if not include_deleted:
      query = query.where(File.deleted_at.is_(None))

    return self.session.exec(query).all()

  def list_by_user(self, user_id: UUID, deleted: bool = False) -> list[File]:
    query = (
      select(File)
      .where(File.user_id == user_id, File.folder_id.is_(None))
      .order_by(File.id.desc())
    )

    if not deleted:
      query = query.where(File.deleted_at.is_(None))
    else:
      query = query.where(File.deleted_at.is_not(None))

    return self.session.exec(query).all()

  def list_deleted_by_user(self, user_id: UUID) -> list[File]:
    query = (
      select(File)
      .where(File.user_id == user_id, File.deleted_at.is_not(None))
      .order_by(File.deleted_at.desc())
    )

    return self.session.exec(query).all()

  def filename_stored_by_user_count(self, original_name: str, user_id: UUID) -> int:
    pattern = rf"^{original_name} \([0-9]+\)$"

    query = select(func.count()).where(
      File.deleted_at.is_(None),
      File.user_id == user_id,
      or_(
        File.original_name == original_name,
        File.display_name.op("~")(pattern),
      ),
    )

    return self.session.exec(query).one()

  def delete_by_folder(self, folder_id: UUID) -> None:
    self.soft_delete_by_parent(File, "folder_id", folder_id)

  def get_deleted_file_by_checksum_and_user(
    self, checksum: str, display_name: str, user_id: UUID
  ) -> File:
    query = select(File).where(
      File.user_id == user_id,
      File.checksum == checksum,
      File.display_name == display_name,
      File.deleted_at.is_not(None),
    )

    return self.session.exec(query).first()

  def list_folder_orphans_by_user(
    self, user_id: UUID, deleted: bool = False
  ) -> list[File]:
    query = (
      select(File)
      .join(Folder, File.folder_id == Folder.id)
      .where(
        File.user_id == user_id,
        or_(
          File.deleted_at.is_not(None),
          and_(File.deleted_at.is_not(None), Folder.deleted_at.is_(None)),
        ),
      )
      .order_by(File.id.desc())
    )

    if deleted:
      query = query.where(File.deleted_at.is_not(None))
    else:
      query = query.where(File.deleted_at.is_(None))

    return self.session.exec(query).all()

  def restore(self, file: File) -> File:
    file.deleted_at = None
    folder = file.folder

    if folder is not None and folder.deleted_at is not None:
      file.folder_id = None

    self.add(file)
    self.commit()
    self.refresh(file)

    return file

  def restore_by_folder(self, folder_id: UUID) -> None:
    self.restore_by_parent(File, "folder_id", folder_id)
