from datetime import timedelta
from typing import Optional
from uuid import UUID

from sqlmodel import select

from app.models import Archive
from app.repositories.base_repository import BaseRepository
from app.utils.time import current_datetime


class ArchiveRepository(BaseRepository[Archive]):
  model = Archive

  def get_by_file_ids_hash(
    self, user_id: UUID, file_ids_hash: str
  ) -> Optional[Archive]:
    query = select(Archive).where(
      Archive.user_id == user_id,
      Archive.file_ids_hash == file_ids_hash,
    )

    return self.session.exec(query).first()

  def list_not_retainable(self) -> list[Archive]:
    query = select(Archive).where(
      Archive.last_time_downloaded
      + timedelta(days=self.settings.archive_retention_policy)
      <= current_datetime(),
    )

    return self.session.exec(query).all()
