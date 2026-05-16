import hashlib
from contextlib import suppress
from io import BytesIO
from typing import BinaryIO, Optional
from uuid import UUID

import PIL.Image
from fastapi import UploadFile
from PIL import UnidentifiedImageError
from sqlalchemy.exc import SQLAlchemyError
from urllib3.response import BaseHTTPResponse
from uuid6 import uuid7

from app.core import (
  FileTooLargeError,
  GoneError,
  NotFoundError,
  Settings,
  StorageError,
  UnsupportedFileTypeError,
)
from app.models import File, Link, User
from app.repositories import FileRepository, FolderRepository
from app.schemas import (
  FileListParams,
  FileUpdateParams,
  FolderLazyResponse,
  FolderWithFilesResponse,
)
from app.services.base_service import BaseService
from app.services.file_storage_service import FileStorageService
from app.utils.file import is_content_type_supported
from app.utils.time import current_datetime

SUPPORTED_PREVIEW_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

GB_SCALE = 1024 * 1024 * 1024


class FileService(BaseService):
  def __init__(
    self,
    file_repository: FileRepository,
    folder_repository: FolderRepository,
    storage_service: FileStorageService,
    settings: Settings,
  ):
    self.repository = file_repository
    self.folder_repository = folder_repository
    self.storage = storage_service
    self.settings = settings

  def create_file(
    self, user: User, upload: UploadFile, folder_id: Optional[UUID] = None
  ) -> File:
    checksum, size_bytes = self._checksum_and_size(upload.file)
    original_name = upload.filename or "unnamed"
    display_name = self._get_unique_filename(user.id, original_name)

    if size_bytes > self.settings.max_file_size_bytes:
      raise FileTooLargeError(
        f"Uploaded file is bigger than max allowed size ({(self.settings.max_file_size_bytes / GB_SCALE):.2f} GB)"
      )

    self._validate_file_type(upload.content_type)

    if file := self._restore_file_if_deleted(checksum, display_name, user):
      return file

    file = File(
      user_id=user.id,
      checksum=checksum,
      size_bytes=size_bytes,
      original_name=original_name,
      display_name=display_name,
      content_type=upload.content_type,
      folder_id=folder_id,
    )

    file.object_key = f"users/{user.id}/files/{file.id}"

    self.storage.upload(
      file.object_key,
      upload.file,
      size_bytes,
      upload.content_type,
    )

    if self._can_generate_preview(upload.content_type):
      with suppress(UnidentifiedImageError):
        preview_data, preview_size, preview_content_type = self._generate_preview(
          upload.file
        )
        file.preview_object_key = f"users/{user.id}/previews/{file.id}"
        file.preview_content_type = preview_content_type
        file.preview_size_bytes = preview_size

        preview_data.seek(0)
        self.storage.upload(
          file.preview_object_key,
          preview_data,
          preview_size,
          preview_content_type,
        )

    self.repository.add(file)

    try:
      self.repository.commit()
      self.repository.refresh(file)
    except SQLAlchemyError:
      self.repository.rollback()
      with suppress(StorageError):
        self.storage.delete_all_versions(file.object_key)
        if file.preview_object_key:
          self.storage.delete_all_versions(file.preview_object_key)
      raise

    return file

  def clone_files(self, user: User, files: list[File]) -> list[File]:
    clones = [self._duplicate_file(f, user.id) for f in files]

    self.repository.add_all(clones)
    self.repository.commit()

    for clone in clones:
      self.repository.refresh(clone)

    return clones

  def clone_files_by_id(
    self, user: User, link: Link, file_ids: list[UUID]
  ) -> list[File]:
    files = self.repository.get_by_multiple_ids_and_link(file_ids, link.id)
    clones = [self._duplicate_file(f, user.id) for f in files]

    self.repository.add_all(clones)
    self.repository.commit()

    for clone in clones:
      self.repository.refresh(clone)

    return clones

  def get_download(self, user: User, file_id: UUID) -> tuple[File, BaseHTTPResponse]:
    file = self._get_user_file(user, file_id)

    if file.deleted_at is not None:
      raise GoneError("File has been deleted")

    return file, self.storage.download(file.object_key)

  def get_file_for_preview(self, user: User, file_id: UUID) -> File:
    return self._get_user_file(user, file_id)

  def get_preview_download(self, file: File) -> BaseHTTPResponse:
    if not file.preview_object_key:
      raise NotFoundError("Preview not available")

    return self.storage.download(file.preview_object_key)

  def list_files(
    self, user: User, params: FileListParams
  ) -> list[File] | FolderWithFilesResponse | FolderLazyResponse:
    if not params.by_folder:
      return self.repository.list_by_user(user.id, params.deleted)

    folders = self.folder_repository.list_by_user(user.id, params.lazy, params.deleted)
    orphans = self.repository.list_folder_orphans_by_user(user.id, params.deleted)

    return FolderWithFilesResponse(
      folders=folders,
      other_files=orphans,
    )

  def update_file(self, user: User, file_id: UUID, params: FileUpdateParams) -> File:
    file = self._get_user_file(user, file_id)

    if file.deleted_at is not None:
      raise GoneError("File has been deleted")

    if params.original_name is not None:
      file.original_name = params.original_name
      file.display_name = self._get_unique_filename(user.id, params.original_name)

    if "folder_id" in params.model_fields_set:
      if params.folder_id is not None:
        folder = self.folder_repository.get_by_id(params.folder_id)

        if not folder or folder.user_id != user.id or folder.deleted_at is not None:
          raise NotFoundError("Folder not found")

      file.folder_id = params.folder_id

    self.repository.save(file)

    return file

  def delete_file(
    self, user: User, file_id: UUID, permanent: bool = False
  ) -> Optional[File]:
    file = self._get_user_file(user, file_id)

    if permanent:
      return self._delete_file_permanently(file)

    if file.deleted_at is not None:
      return file

    self.storage.soft_delete(file.object_key)
    file.deleted_at = current_datetime()

    self.repository.add(file)
    self.repository.commit()
    self.repository.refresh(file)

    return file

  def restore_file(self, user: User, file_id: UUID) -> File:
    file = self._get_user_file(user, file_id)

    if file.deleted_at is None:
      return file

    self.storage.restore_soft_deleted(file.object_key)
    return self.repository.restore(file)

  def stream_response(self, response: BaseHTTPResponse):
    return self.storage.iter_response(response)

  def _delete_file_permanently(self, file: File) -> None:
    self.storage.delete_all_versions(file.object_key)

    if file.preview_object_key:
      self.storage.delete_all_versions(file.preview_object_key)

    self.repository.hard_delete(file)
    self.repository.commit()

  def _get_user_file(self, user: User, file_id: UUID) -> File:
    file = self.repository.get_by_id(file_id)

    if file is None:
      raise NotFoundError("File not found")

    self._ensure_user_has_rights(user.id, file.user_id)

    return file

  def _checksum_and_size(self, data: BinaryIO) -> tuple[str, int]:
    data.seek(0)
    checksum = hashlib.sha256()
    size_bytes = 0

    while chunk := data.read(1024 * 1024):
      size_bytes += len(chunk)
      checksum.update(chunk)

    data.seek(0)

    return checksum.hexdigest(), size_bytes

  def _can_generate_preview(self, content_type: Optional[str]) -> bool:
    return content_type in SUPPORTED_PREVIEW_TYPES

  def _validate_file_type(self, content_type: str) -> None:
    if is_content_type_supported(content_type):
      return

    raise UnsupportedFileTypeError("File type not supported")

  def _get_unique_filename(self, user_id: UUID, original_name: str) -> str:
    original_name = self._remove_file_extensions(original_name)
    count = self.repository.filename_stored_by_user_count(original_name, user_id)

    if count > 0:
      return f"{original_name} ({count})"

    return original_name

  def _remove_file_extensions(self, filename: str) -> str:
    if (dot_place := filename.find(".")) != -1:
      return filename[:dot_place]

    return filename

  def _restore_file_if_deleted(self, checksum: str, display_name: str, user: User):
    file = self.repository.get_deleted_file_by_checksum_and_user(
      checksum, display_name, user.id
    )
    if file is None:
      return None

    self.storage.restore_soft_deleted(file.object_key)
    return self.repository.restore(file)

  def _generate_preview(self, data: BinaryIO) -> tuple[BinaryIO, int, str]:
    """Generate a thumbnail preview for images."""
    data.seek(0)
    img = PIL.Image.open(data)

    # Convert to RGB if necessary (for PNG with alpha, etc.)
    if img.mode in ("RGBA", "P"):
      img = img.convert("RGB")

    # Create thumbnail (max 200x200)
    img.thumbnail((200, 200))

    preview_data = BytesIO()
    preview_content_type = "image/jpeg"
    img.save(preview_data, format="JPEG", quality=85)
    preview_data.seek(0)

    preview_data.seek(0)
    preview_size = preview_data.getbuffer().nbytes

    # Reset original data
    data.seek(0)

    return preview_data, preview_size, preview_content_type

  def _duplicate_file(self, file: File, user_id: UUID) -> File:
    if file.deleted_at is not None:
      raise GoneError("One or more files you're trying to clone have been deleted")

    display_name = self._get_unique_filename(user_id, file.display_name)
    clone_id = uuid7()
    object_key = f"users/{user_id}/files/{clone_id}"
    preview_object_key = None

    self.storage.copy_object(file.object_key, object_key)

    if file.preview_object_key:
      preview_object_key = f"users/{user_id}/previews/{clone_id}"
      self.storage.copy_object(file.preview_object_key, preview_object_key)

    return File.model_validate(
      file.model_dump()
      | {
        "id": clone_id,
        "user_id": user_id,
        "original_name": file.display_name,
        "display_name": display_name,
        "folder_id": None,
        "created_at": current_datetime(),
        "object_key": object_key,
        "preview_object_key": preview_object_key,
      }
    )
