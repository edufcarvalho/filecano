from datetime import timedelta
from typing import Optional
from uuid import UUID

from urllib3.response import BaseHTTPResponse

from app.core import (
  AuthenticationError,
  NotFoundError,
  Settings,
  create_token,
  decode_token,
)
from app.models import File, Link, User
from app.repositories import FileRepository, LinkRepository
from app.services.file_storage_service import FileStorageService
from app.utils.time import current_datetime


class LinkService:
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
      token="pending",
      expires_at=current_datetime()
      + timedelta(seconds=self.settings.shared_url_expire_seconds),
      files=files,
    )

    token = create_token(
      payload={
        "sub": str(link.id),
      },
      secret_key=self.settings.jwt_secret_key,
      algorithm=self.settings.jwt_algorithm,
      expire_in=self.settings.shared_url_expire_seconds,
    )
    link.token = token

    link = self.repository.add(link)

    return {
      "access_token": token,
      "token_type": "bearer",
      "expires_in": self.settings.shared_url_expire_seconds,
    }

  def authenticate_token(self, token: str) -> Link:
    payload = self._decode_token(token)
    link_id = self._get_token_subject(payload)
    link = self.repository.get_by_id(link_id)

    if link is None or link.token != token:
      raise AuthenticationError("Share link not found")

    if link.expires_at <= current_datetime():
      raise AuthenticationError("Share link expired")

    return link

  def get_files(self, token: str, files_id: Optional[list[UUID]] = None) -> list[File]:
    link = self.authenticate_token(token)
    files = self.file_repository.list_by_link(link.id, files_id)

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

  def _decode_token(self, token: str) -> dict[str, object]:
    try:
      return decode_token(
        token,
        secret_key=self.settings.jwt_secret_key,
        algorithm=self.settings.jwt_algorithm,
      )
    except ValueError as error:
      raise AuthenticationError(str(error)) from error

  def _get_token_subject(self, payload: dict[str, object]) -> UUID:
    link_id = payload.get("sub")

    try:
      return UUID(link_id)
    except (TypeError, ValueError) as error:
      raise AuthenticationError("Invalid share token") from error
