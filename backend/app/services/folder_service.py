from typing import Optional
from uuid import UUID

from app.core.exceptions import ConflictError, NotFoundError
from app.models import Folder, User
from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository
from app.schemas import FolderParams, FolderUpdateParams
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

  def create_folder(self, user: User, params: FolderParams) -> Folder:
    if params.parent_id is not None:
      parent = self._get_folder(params.parent_id)
      self._ensure_user_has_rights(user.id, parent.user_id)

    name = self._get_unique_foldername(user.id, params.name)

    folder = Folder(user=user, name=name, parent_id=params.parent_id)

    return self.repository.add(folder)

  def update_folder(self, user: User, folder_id: UUID, params: FolderUpdateParams) -> Folder:
    folder = self._get_folder(folder_id)

    self._ensure_user_has_rights(user.id, folder.user_id)

    if params.name is not None:
      folder.name = params.name

    if "parent_id" in params.model_fields_set:
      if params.parent_id is not None:
        parent = self._get_folder(params.parent_id)

        self._ensure_user_has_rights(user.id, parent.user_id)

        if params.parent_id == folder_id:
          raise ConflictError("A folder cannot be its own parent")

        self._ensure_not_descendant(folder_id, params.parent_id)

      folder.parent_id = params.parent_id

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
    self.repository.delete_children(folder.id)

    self.repository.add(folder)
    self.repository.commit()
    self.repository.refresh(folder)

    return folder

  def _get_folder(self, folder_id: UUID) -> Folder:
    folder = self.repository.get_by_id(folder_id)

    if not folder:
      raise NotFoundError("Folder not found")

    return folder

  def _get_unique_foldername(self, user_id: UUID, original_name: str) -> str:
    count = self.repository.foldername_stored_by_user_count(original_name, user_id)

    if count > 0:
      return f"{original_name} ({count})"

    return original_name

  def _ensure_not_descendant(self, folder_id: UUID, potential_parent_id: UUID) -> None:
    folder = self._get_folder(potential_parent_id)

    while folder.parent_id is not None:
      if folder.parent_id == folder_id:
        raise ConflictError("Cannot move a folder into its own descendant")

      folder = self._get_folder(folder.parent_id)
