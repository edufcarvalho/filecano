import hashlib
from contextlib import suppress
from io import BytesIO
from typing import BinaryIO
from uuid import UUID

import PIL.Image
from fastapi import UploadFile
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session
from urllib3.response import BaseHTTPResponse

from app.core import GoneError, NotFoundError, StorageError
from app.models import File, User
from app.repositories import FileRepository
from app.schemas import FileUpdateParams
from app.services.file_storage_service import FileStorageService
from app.utils.time import current_datetime


class FileService:
  def __init__(
    self,
    file_repository: FileRepository,
    storage_service: FileStorageService,
    session: Session,
  ):
    self.repository = file_repository
    self.storage = storage_service
    self.session = session

  def create_file(self, user: User, upload: UploadFile) -> File:
    original_name = upload.filename or "unnamed"
    file = File(
      user_id=user.id,
      original_name=original_name,
      content_type=upload.content_type,
    )
    file.object_key = f"users/{user.id}/files/{file.id}"

    checksum, size_bytes = self._checksum_and_size(upload.file)
    file.checksum = checksum
    file.size_bytes = size_bytes

    self.storage.upload(
      file.object_key,
      upload.file,
      size_bytes,
      upload.content_type,
    )

    if upload.content_type and upload.content_type.startswith("image/"):
      preview_data, preview_size, preview_content_type = self._generate_preview(
        upload.file, upload.content_type
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
      self.session.commit()
      self.session.refresh(file)
    except SQLAlchemyError:
      self.session.rollback()
      with suppress(StorageError):
        self.storage.delete_all_versions(file.object_key)
        if file.preview_object_key:
          self.storage.delete_all_versions(file.preview_object_key)
      raise

    return file

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

  def list_files(self, user: User) -> list[File]:
    return self.repository.list_by_user(user.id)

  def list_deleted_files(self, user: User) -> list[File]:
    return self.repository.list_deleted_by_user(user.id)

  def update_file(self, user: User, file_id: UUID, params: FileUpdateParams) -> File:
    file = self._get_user_file(user, file_id)

    if file.deleted_at is not None:
      raise GoneError("File has been deleted")

    file.original_name = params.original_name

    self.repository.add(file)
    self.session.commit()
    self.session.refresh(file)

    return file

  def delete_file(self, user: User, file_id: UUID) -> File:
    file = self._get_user_file(user, file_id)

    if file.deleted_at is not None:
      return file

    self.storage.soft_delete(file.object_key)
    file.deleted_at = current_datetime()

    self.repository.add(file)
    self.session.commit()
    self.session.refresh(file)

    return file

  def delete_file_permanently(self, user: User, file_id: UUID) -> None:
    file = self._get_user_file(user, file_id)

    self.storage.delete_all_versions(file.object_key)
    if file.preview_object_key:
      self.storage.delete_all_versions(file.preview_object_key)
    self.repository.delete(file)
    self.session.commit()

  def stream_response(self, response: BaseHTTPResponse):
    return self.storage.iter_response(response)

  def _get_user_file(self, user: User, file_id: UUID) -> File:
    file = self.repository.get_by_id_and_user(file_id, user.id)

    if file is None:
      raise NotFoundError("File not found")

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

  def _generate_preview(self, data: BinaryIO, content_type: str) -> tuple[BinaryIO, int, str, str]:
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
