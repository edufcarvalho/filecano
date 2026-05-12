from typing import Optional
from uuid import UUID

from sqlmodel import Session, func, select, update

from app.models import File
from app.models.file_link_relation import FileLinkRelation
from app.utils.time import current_datetime


class FileRepository:
  def __init__(self, session: Session):
    self.session = session

  def add(self, file: File) -> File:
    self.session.add(file)

    return file

  def add_all(self, files: list[File]) -> list[File]:
    self.session.add_all(files)

    return files

  def commit(self) -> None:
    self.session.commit()

  def refresh(self, file: File) -> None:
    self.session.refresh(file)

  def rollback(self) -> None:
    self.session.rollback()

  def get_by_id(self, file_id: UUID) -> Optional[File]:
    return self.session.get(File, file_id)

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

  def list_by_user(self, user_id: UUID) -> list[File]:
    query = (
      select(File)
      .where(File.user_id == user_id, File.deleted_at.is_(None))
      .order_by(File.id.desc())
    )

    return self.session.exec(query).all()

  def list_deleted_by_user(self, user_id: UUID) -> list[File]:
    query = (
      select(File)
      .where(File.user_id == user_id, File.deleted_at.is_not(None))
      .order_by(File.deleted_at.desc())
    )

    return self.session.exec(query).all()

  def filename_stored_by_user_count(self, original_name: str, user_id: UUID) -> int:
    query = (
      select(func.count())
      .select_from(File)
      .where(
        File.user_id == user_id,
        File.display_name == original_name,
        File.deleted_at.is_(None),
      )
    )

    return self.session.exec(query).one()

  def delete(self, file: File) -> None:
    self.session.delete(file)

  def delete_by_folder(self, folder_id: UUID) -> None:
    query = (
      update(File)
      .where(File.folder_id == folder_id)
      .values(deleted_at=current_datetime())
    )

    self.session.exec(query)
    self.session.commit()

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

  def list_folder_orphans_by_user(self, user_id: UUID) -> list[File]:
    query = (
      select(File)
      .where(
        File.user_id == user_id,
        File.folder_id.is_(None),
        File.deleted_at.is_(None),
      )
      .order_by(File.id.desc())
    )

    return self.session.exec(query).all()

  def restore(self, file: File) -> File:
    file.deleted_at = None
    file.folder_id = None

    self.session.add(file)
    self.session.commit()
    self.session.refresh(file)

    return file
