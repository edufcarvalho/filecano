from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


class FileUpdateParams(BaseModel):
  original_name: Optional[str] = None
  folder_id: Optional[UUID] = None

  @field_validator("original_name")
  @classmethod
  def original_name_should_not_be_blank(cls, original_name: str) -> str:
    original_name = original_name.strip()

    if not original_name:
      raise ValueError("Original name must not be blank")

    return original_name

  model_config = ConfigDict(from_attributes=True)


class FileListParams(BaseModel):
  deleted: bool = False
  by_folder: bool = False
  lazy: bool = True

  model_config = ConfigDict(from_attributes=True)
