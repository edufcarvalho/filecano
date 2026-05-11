from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .file_responses import FileResponse


class FolderWithFilesResponse(BaseModel):
  folders: list[FolderResponse]
  other_files: Optional[list[FileResponse]] = None

  model_config = ConfigDict(from_attributes=True)


class FolderResponse(BaseModel):
  id: UUID
  user_id: UUID
  name: str
  files: Optional[list[FileResponse]] = None
  created_at: datetime
  deleted_at: Optional[datetime] = None

  model_config = ConfigDict(from_attributes=True)
