from typing import TypeVar

from pydantic import BaseModel

Model = TypeVar("Response", bound="BaseModel")


class PaginatedResponse(BaseModel):
  items: list[Model] | Model
  total: int
  page: int
  size: int
  pages: int
