from pydantic import BaseModel, Field


class PaginateParams(BaseModel):
  page: int = Field(default=0, ge=0)
  page_size: int = Field(default=100, ge=0)
  total: int
