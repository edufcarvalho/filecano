from typing import Optional
from uuid import UUID

from app.core.exceptions import NotFoundError
from app.models import Folder, User
from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository
from app.schemas import FolderParams
from app.services.base_service import BaseService
from app.utils.time import current_datetime


class FolderService(BaseService):
  def __init__(
    self,
    repository: FolderRepository,
    file_repository: FileRepository,
  ):
    self.repository = repository
    self.file_repository = file_repository

  def list_folders(self, user: User) -> list[Folder]:
    return self.repository.list_by_user(user.id)

  def create_folder(self, user: User, name: str) -> Folder:
    folder = Folder(user_id=user.id, name=name)

    return self.repository.add(folder)

  def update_folder(self, user: User, folder_id: UUID, params: FolderParams) -> Folder:
    folder = self._get_folder(folder_id)

    self._ensure_user_has_rights(user.id, folder.user_id)

    folder.name = params.name

    self.repository.add(folder)
    self.repository.commit()
    self.repository.refresh(folder)

    return folder

  def delete_folder(self, user: User, folder_id: UUID) -> Optional[Folder]:
    folder = self._get_folder(folder_id)

    self._ensure_user_has_rights(user.id, folder.user_id)

    if folder.deleted_at is not None:
      return folder

    folder.deleted_at = current_datetime()
    self.file_repository.delete_by_folder(folder.id)

    self.repository.add(folder)
    self.repository.commit()
    self.repository.refresh(folder)

    return folder

  def _get_folder(self, folder_id: UUID) -> Folder:
    folder = self.repository.get_by_id(folder_id)

    if not folder:
      raise NotFoundError("Folder not found")

    return folder
