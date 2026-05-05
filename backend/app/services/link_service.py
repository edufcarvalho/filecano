import hashlib
from datetime import timedelta
from typing import Optional
from uuid import UUID

from urllib3.response import BaseHTTPResponse

from app.core import (
  GoneError,
  NotFoundError,
  Settings,
)
from app.models import File, Link, User
from app.repositories import FileRepository, LinkRepository
from app.services.base_service import BaseService
from app.services.file_storage_service import FileStorageService
from app.utils.time import current_datetime


class LinkService(BaseService):
  def __init__(
    self,
    repository: LinkRepository,
    file_repository: FileRepository,
    storage_service: FileStorageService,
    settings: Settings,
  ):
    self.repository = repository
    self.file_repository = file_repository
    self.storage = storage_service
    self.settings = settings

  def create_link(self, user: User, file_ids: list[UUID]) -> dict[str, object]:
    files = self.file_repository.list_by_multiple_ids_and_user(file_ids, user.id)

    link = Link(
      expires_at=current_datetime()
      + timedelta(seconds=self.settings.shared_url_expire_seconds),
      files=files,
      user=user
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

  def stream_response(self, response: BaseHTTPResponse):
    return self.storage.iter_response(response)

  def _generate_token(self, link: Link) -> str:
    return hashlib.shake_256(str(link.id).encode()).hexdigest(self.settings.share_token_length)

  def list_user_links(self, user: User, user_id: UUID) -> list[Link]:
    self._ensure_user_has_rights(user, user_id)

    return self.repository.list_by_user_id(user_id)

  def update_link_name(self, user: User, token: str, custom_name: str) -> Link:
    existing = self.repository.get_by_token(custom_name)
    if existing and existing.token != token:
      raise ValueError("Link name already taken")

    link = self.repository.get_by_token(token)
    if not link:
      raise NotFoundError("Link not found")

    self._ensure_user_has_rights(user, link.user_id)

    link.custom_name = custom_name
    return self.repository.update(link)

  def delete_link(self, user: User, token: str) -> None:
    link = self.repository.get_by_token(token)
    if not link:
      raise NotFoundError("Link not found")

    self._ensure_user_has_rights(user, link.user_id)

    self.repository.delete(link)
