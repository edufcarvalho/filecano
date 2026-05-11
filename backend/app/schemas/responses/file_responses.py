from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FileResponse(BaseModel):
  id: UUID
  user_id: UUID
  original_name: str
  display_name: str
  content_type: Optional[str] = None
  size_bytes: Optional[int] = None
  checksum: Optional[str] = None
  folder_id: Optional[UUID] = None
  created_at: datetime
  deleted_at: Optional[datetime]

  model_config = ConfigDict(from_attributes=True)
