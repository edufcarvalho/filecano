from uuid import UUID
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.file_responses import FileResponse
from datetime import datetime
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