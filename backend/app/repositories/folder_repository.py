from uuid import UUID

from sqlmodel import Session, select

from app.models import Folder


class FolderRepository:
  def __init__(self, session: Session):
    self.session = session

  def create_folder(self, user_id: UUID, name: str) -> Folder:
    folder = Folder(user_id=user_id, name=name)
    self.session.add(folder)

    self.session.commit()
    self.session.refresh(folder)

    return folder

  def get_by_ids(self, folder_ids: list[UUID], user_id: UUID) -> list[Folder]:
    if not folder_ids:
      return []

    query = select(Folder).where(
      Folder.id.in_(folder_ids),
      Folder.user_id == user_id,
      Folder.deleted_at.is_(None),
    )

    return self.session.exec(query).all()

  def list_by_user(self, user_id: UUID) -> list[Folder]:
    query = (
      select(Folder)
      .where(Folder.user_id == user_id, Folder.deleted_at.is_(None))
      .order_by(Folder.id.desc())
    )

    return self.session.exec(query).all()
