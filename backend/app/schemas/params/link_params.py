from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator


class LinkUpdateParams(BaseModel):
  custom_name: str

  model_config = ConfigDict(from_attributes=True)


class LinkCreateParams(BaseModel):
  files: Optional[list[UUID]] = None
  folders: Optional[list[UUID]] = None
  expires_at: Optional[datetime] = None

  @model_validator(mode="after")
  def should_have_folders_or_files(self) -> LinkCreateParams:
    if not self.files and not self.folders:
      raise ValueError("At least one file or folder must be provided.")

    return self

  model_config = ConfigDict(from_attributes=True)


class LinkRestoreParams(BaseModel):
  expires_at: Optional[datetime] = None

  model_config = ConfigDict(from_attributes=True)


class CloningParams(BaseModel):
  files: Optional[list[UUID]] = None
  folders: Optional[list[UUID]] = None

  model_config = ConfigDict(from_attributes=True)
