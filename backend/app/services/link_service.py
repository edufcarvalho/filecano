from uuid import UUID
from datetime import timedelta

from app.repositories import LinkRepository
from app.core import (
  AuthenticationError,
  Settings,
  create_token,
  decode_token,
)

from app.models import File, Link
from app.utils.time import current_datetime

class LinkService:
  def __init__(self, repository: LinkRepository, settings: Settings):
    self.repository = repository
    self.settings = settings

  def create_link(self, files: list[File] | list[UUID]):
    link = Link(
      files=files,
      expires_at=current_datetime + timedelta(seconds=self.settings.shared_url_expire_seconds)
    )

    return create_token(
      self,
      payload={
        "sub": link.id,
      },
      secret_key=self.settings.jwt_secret_key,
      algorithm=self.settings.jwt_algorithm,
      expire_in=self.settings.access_token_expire_seconds,
    )

  def authenticate_token(self, token: str) -> Link:
    payload = self._decode_token(token)
    link_id = self._get_token_subject(payload)

    return self.get_authorized_link(link_id)
  
  def get_authorized_link(self, link_id: UUID) -> Link:
    link = self.repository.get_by_id(link_id)

    if link is None:
      raise AuthenticationError("Link not found")

    return link

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
      raise AuthenticationError("Invalid access token") from error