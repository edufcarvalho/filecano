from uuid import UUID

from pydantic import BaseModel


class BulkParams(BaseModel):
  ids: list[UUID]
