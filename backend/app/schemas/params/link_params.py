from datetime import datetime
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional


class LinkUpdateParams(BaseModel):
  custom_name: str

  model_config = ConfigDict(from_attributes=True)


class LinkCreateParams(BaseModel):
  files: list[UUID]
  expires_at: Optional[datetime] = None

  model_config = ConfigDict(from_attributes=True)


class LinkRestoreParams(BaseModel):
  expires_at: Optional[datetime] = None

  model_config = ConfigDict(from_attributes=True)
