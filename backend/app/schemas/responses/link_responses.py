from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .file_responses import FileResponse
from .folder_responses import FolderResponse


class LinkResponse(BaseModel):
  id: UUID
  token: str
  custom_name: Optional[str] = None
  expires_at: datetime
  files: Optional[list[FileResponse]] = None
  folders: Optional[list[FolderResponse]] = None

  model_config = ConfigDict(from_attributes=True)


class LinkUpdateResponse(BaseModel):
  id: UUID
  custom_name: str

  model_config = ConfigDict(from_attributes=True)


class LinkRestoreResponse(BaseModel):
  id: UUID
  expires_at: datetime

  model_config = ConfigDict(from_attributes=True)
