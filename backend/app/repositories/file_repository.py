from uuid import UUID
from typing import Optional
from sqlmodel import Session, select

from app.models import File


class FileRepository:
  def __init__(self, session: Session):
    self.session = session

  def add(self, file: File) -> File:
    self.session.add(file)

    return file

  def get_by_id_and_user(self, file_id: UUID, user_id: UUID) -> Optional[File]:
    query = select(File).where(File.id == file_id, File.user_id == user_id)

    return self.session.exec(query).first()

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
