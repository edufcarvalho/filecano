from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FileResponse(BaseModel):
  id: UUID
  user_id: UUID
  original_name: str
  content_type: Optional[str]
  size_bytes: Optional[int]
  checksum: Optional[str]
  created_at: datetime
  deleted_at: Optional[datetime]

  model_config = ConfigDict(from_attributes=True)


class LinkResponse(BaseModel):
  id: UUID
  token: str
  expires_at: datetime
  files: list[FileResponse]

  model_config = ConfigDict(from_attributes=True)
