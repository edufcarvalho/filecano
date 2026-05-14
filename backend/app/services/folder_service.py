from typing import Optional
from uuid import UUID

from uuid6 import uuid7

from app.core.exceptions import ConflictError, GoneError, NotFoundError
from app.models import Folder, User
from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository
from app.schemas import FolderParams, FolderUpdateParams, FolderWithFilesResponse
from app.services.base_service import BaseService
from app.services.file_service import FileService
from app.services.file_storage_service import FileStorageService
from app.utils.time import current_datetime


class FolderService(BaseService):
  def __init__(
    self,
    repository: FolderRepository,
    file_repository: FileRepository,
    file_service: FileService,
    storage: Optional[FileStorageService] = None,
  ):
    self.repository = repository
    self.file_repository = file_repository
    self.file_service = file_service
    self.storage = storage

  def list_folders(self, user: User, deleted: bool = False) -> list[Folder]:
    return self.repository.list_by_user(user.id, deleted=deleted)

  def create_folder(self, user: User, params: FolderParams) -> Folder:
    if params.parent_id is not None:
      parent = self._get_folder(params.parent_id)
      self._ensure_user_has_rights(user.id, parent.user_id)

    name = self._get_unique_foldername(user.id, params.name)

    folder = Folder(user=user, name=name, parent_id=params.parent_id)

    return self.repository.add(folder)

  def clone_folder(self, user: User, folder: Folder) -> Folder:
    if folder.deleted_at is not None:
      raise GoneError("One or more folders you're trying to clone have been deleted")

    clone = self._duplicate_folder(user, folder)

    for child in folder.children:
      self.clone_folder(user, child, clone)

    self.repository.add(clone)
    self.repository.commit()
    self.repository.refresh(clone)

    return clone

  def _duplicate_folder(
    self, user: User, folder: Folder, parent: Optional[Folder] = None
  ) -> Folder:
    name = self._get_unique_foldername(user.id, folder.name)

    clone = Folder.model_validate(
      folder.model_dump()
      | {
        "id": uuid7(),
        "user_id": user.id,
        "name": name,
        "parent_id": parent.id if parent else None,
        "created_at": current_datetime(),
      }
    )

    clone.files = self.file_service.clone_files(user, folder.files)

    return clone

  def clone_folders(self, user: User, folder_ids: list[UUID]) -> list[Folder]:
    folders = self.repository.get_by_ids(folder_ids, user.id)

    return list(map(lambda f: self.clone_folder(user, f), folders))

  def update_folder(
    self, user: User, folder_id: UUID, params: FolderUpdateParams
  ) -> Folder:
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

  def delete_folder(
    self, user: User, folder_id: UUID, permanent: bool = False
  ) -> Optional[Folder]:
    folder = self._get_folder(folder_id)

    self._ensure_user_has_rights(user.id, folder.user_id)

    if permanent:
      return self._delete_folder_permanently(folder)

    if folder.deleted_at is not None:
      return folder

    folder.deleted_at = current_datetime()
    self.file_repository.delete_by_folder(folder.id)
    self.repository.delete_children(folder.id)

    self.repository.add(folder)
    self.repository.commit()
    self.repository.refresh(folder)

    return folder

  def _delete_folder_permanently(self, folder: Folder) -> None:
    folder_ids = self.repository.get_all_descendant_ids(folder.id) + [folder.id]
    files = self.repository.get_files_by_folder_ids(folder_ids)

    for file in files:
      self.storage.delete_all_versions(file.object_key)

      if file.preview_object_key:
        self.storage.delete_all_versions(file.preview_object_key)

    self.repository.hard_delete(folder)

  def restore_folder(self, user: User, folder_id: UUID) -> FolderWithFilesResponse:
    folder = self._get_folder(folder_id)

    if folder.deleted_at is not None:
      folder.deleted_at = None

      self.file_repository.restore_by_folder(folder.id)

      self.repository.add(folder)
      self.repository.commit()
      self.repository.refresh(folder)

    folders = self.repository.list_by_user(user.id, deleted=True)
    files = self.file_repository.list_by_user(user.id, deleted=True)

    return FolderWithFilesResponse(
      folders=folders,
      other_files=files,
    )

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
