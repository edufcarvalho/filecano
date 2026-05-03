from typing import Optional
from uuid import UUID

from sqlmodel import Session, select

from app.models import File
from app.models.file_link_relation import FileLinkRelation


class FileRepository:
  def __init__(self, session: Session):
    self.session = session

  def add(self, file: File) -> File:
    self.session.add(file)

    return file

  def get_by_id_and_user(self, file_id: UUID, user_id: UUID) -> Optional[File]:
    query = select(File).where(File.id == file_id, File.user_id == user_id)

    return self.session.exec(query).first()

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

    return list(self.session.exec(query).all())

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

    return list(self.session.exec(query).all())

  def list_by_user(self, user_id: UUID) -> list[File]:
    query = (
      select(File)
      .where(File.user_id == user_id, File.deleted_at.is_(None))
      .order_by(File.created_at.desc())
    )

    return list(self.session.exec(query).all())

  def list_deleted_by_user(self, user_id: UUID) -> list[File]:
    query = (
      select(File)
      .where(File.user_id == user_id, File.deleted_at.is_not(None))
      .order_by(File.deleted_at.desc())
    )

    return list(self.session.exec(query).all())

  def delete(self, file: File) -> None:
    self.session.delete(file)
