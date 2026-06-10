from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .file_responses import FileResponse


class FolderWithFilesResponse(BaseModel):
  folders: list[FolderResponse]
  other_files: list[FileResponse] = Field(default_factory=list)

  model_config = ConfigDict(from_attributes=True)


class FolderResponse(BaseModel):
  id: UUID
  user_id: UUID
  name: str
  parent_id: Optional[UUID] = None
  files: list[FileResponse] = Field(default_factory=list)
  children: list[FolderResponse] = Field(default_factory=list)
  created_at: datetime
  deleted_at: Optional[datetime] = None

  model_config = ConfigDict(from_attributes=True)
