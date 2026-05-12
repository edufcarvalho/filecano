from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FolderParams(BaseModel):
  name: str
  parent_id: Optional[UUID] = None
  children_ids: Optional[list[UUID]] = None

  model_config = ConfigDict(from_attributes=True)
