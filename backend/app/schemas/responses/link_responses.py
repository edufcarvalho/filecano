from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .file_responses import FileResponse


class LinkResponse(BaseModel):
  id: UUID
  token: str
  custom_name: Optional[str] = None
  expires_at: datetime
  files: list[FileResponse]

  model_config = ConfigDict(from_attributes=True)

class LinkUpdateResponse(BaseModel):
  id: UUID
  custom_name: str

  model_config = ConfigDict(from_attributes=True)
