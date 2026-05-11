import hashlib
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from urllib3.response import BaseHTTPResponse

from app.core import (
  BadRequestError,
  ConflictError,
  GoneError,
  NotFoundError,
  Settings,
)
from app.models import File, Link, User
from app.repositories import FileRepository, LinkRepository
from app.schemas import LinkCreateParams, LinkRestoreParams
from app.services.base_service import BaseService
from app.services.file_service import FileService
from app.services.file_storage_service import FileStorageService
from app.utils.time import current_datetime


class LinkService(BaseService):
  def __init__(
    self,
    repository: LinkRepository,
    file_repository: FileRepository,
    file_service: FileService,
    storage_service: FileStorageService,
    settings: Settings,
  ):
    self.repository = repository
    self.file_repository = file_repository
    self.file_service = file_service
    self.storage = storage_service
    self.settings = settings

  def create_link(self, user: User, params: LinkCreateParams) -> dict[str, object]:
    files = self.file_repository.list_by_multiple_ids_and_user(params.files, user.id)

    expires_at = self._resolve_expires_at(params.expires_at)

    link = Link(
      expires_at=expires_at,
      files=files,
      user=user,
    )

    link.token = self._generate_token(link)

    link = self.repository.add(link)

    return {
      "access_token": link.token,
      "token_type": "bearer",
      "expires_in": self.settings.shared_url_expire_seconds,
    }

  def authenticate_token(self, token: str) -> Link:
    link = self.repository.get_by_token(token)

    if link is None:
      raise NotFoundError("Share link not found")

    if link.deleted_at is not None:
      raise NotFoundError("Link deleted by creator")

    if link.expires_at <= current_datetime():
      raise GoneError("Share link expired")

    return link

  def get_files(self, token: str, files_id: Optional[list[UUID]] = None) -> list[File]:
    link = self.authenticate_token(token)
    files = self.file_repository.list_by_link(
      link.id,
      files_id,
      include_deleted=True,
    )

    return files

  def get_file(self, token: str, file_id: UUID) -> Optional[File]:
    link = self.authenticate_token(token)
    file = self.file_repository.get_by_id_and_link(file_id, link.id)

    return file

  def get_download(self, token: str, file_id: UUID) -> tuple[File, BaseHTTPResponse]:
    file = self.get_file(token, file_id)

    if file is None:
      raise NotFoundError("File not found")

    return file, self.storage.download(file.object_key)

  def get_preview_download(
    self, token: str, file_id: UUID
  ) -> tuple[File, BaseHTTPResponse]:
    file = self.get_file(token, file_id)

    if file is None:
      raise NotFoundError("File not found")

    if not file.preview_object_key:
      raise NotFoundError("Preview not available for this file")

    return file, self.storage.download(file.preview_object_key)

  def stream_response(self, response: BaseHTTPResponse):
    return self.storage.iter_response(response)

  def list_user_links(self, user: User, user_id: UUID) -> list[Link]:
    self._ensure_user_has_rights(user.id, user_id)

    return self.repository.list_by_user_id(user_id)

  def update_link_name(self, user: User, token: str, custom_name: str) -> Link:
    existing = self.repository.get_by_token(custom_name)

    if existing and existing.token != token:
      raise ConflictError("Link already taken")

    link = self.repository.get_by_token(token)
    if not link:
      raise NotFoundError("Link not found")

    self._ensure_user_has_rights(user.id, link.user_id)

    link.custom_name = custom_name
    return self.repository.update(link)

  def restore_link(
    self, user: User, token: str, params: LinkRestoreParams | None = None
  ) -> Link:
    link = self.repository.get_by_token(token)
    if not link:
      raise NotFoundError("Link not found")

    self._ensure_user_has_rights(user.id, link.user_id)

    if params:
      link.expires_at = self._resolve_expires_at(params.expires_at)
    else:
      link.expires_at = self._resolve_expires_at()

    return self.repository.update(link)

  def delete_link(self, user: User, token: str) -> None:
    link = self.repository.get_by_token(token)
    if not link:
      raise NotFoundError("Link not found")

    self._ensure_user_has_rights(user.id, link.user_id)

    self.repository.delete(link)

  def clone_files(self, user: User, link_id: UUID) -> list[File]:
    link = self.repository.get_by_id(link_id)

    if not link:
      raise NotFoundError("Link not found")

    if link.deleted_at is not None:
      raise NotFoundError("Link deleted by creator")

    if link.expires_at <= current_datetime():
      raise GoneError("Share link expired")

    return self.file_service.clone_files(user, link.files)

  def _generate_token(self, link: Link) -> str:
    return hashlib.shake_256(str(link.id).encode()).hexdigest(
      self.settings.share_token_length
    )

  def _resolve_expires_at(
    self,
    expires_at: Optional[datetime] = None,
  ) -> datetime:
    if expires_at:
      now = current_datetime()
      if expires_at < now:
        raise BadRequestError("Expiration date must be in the future")
      return expires_at
    return current_datetime() + timedelta(
      seconds=self.settings.shared_url_expire_seconds
    )
