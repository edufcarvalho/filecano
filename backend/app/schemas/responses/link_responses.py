from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .file_responses import FileResponse
from .folder_responses import FolderResponse


class LinkResponse(BaseModel):
  id: UUID
  token: str
  custom_name: Optional[str] = None
  expires_at: datetime
  files: list[FileResponse] = Field(default_factory=list)
  folders: list[FolderResponse] = Field(default_factory=list)

  model_config = ConfigDict(from_attributes=True)


class LinkUpdateResponse(BaseModel):
  id: UUID
  custom_name: str

  model_config = ConfigDict(from_attributes=True)


class LinkRestoreResponse(BaseModel):
  id: UUID
  expires_at: datetime

  model_config = ConfigDict(from_attributes=True)
