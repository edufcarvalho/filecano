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
  parent_id: Optional[UUID] = None
  files: Optional[list[FileResponse]] = None
  children: Optional[list[FolderResponse]] = None
  created_at: datetime
  deleted_at: Optional[datetime] = None

  model_config = ConfigDict(from_attributes=True)

class FolderLazyResponse(BaseModel):
  id: UUID
  user_id: UUID
  name: str
  parent_id: Optional[UUID] = None
  files_count: int
  children: Optional[list[FolderLazyResponse]] = None
  created_at: datetime
  deleted_at: Optional[datetime] = None

  model_config = ConfigDict(from_attributes=True)
