from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FolderParams(BaseModel):
  name: str
  parent_id: Optional[UUID] = None

  model_config = ConfigDict(from_attributes=True)


class FolderUpdateParams(BaseModel):
  name: Optional[str] = None
  parent_id: Optional[UUID] = None

  model_config = ConfigDict(from_attributes=True)
