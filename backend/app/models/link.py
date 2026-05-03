from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlmodel import DateTime, Field, Relationship, SQLModel
from uuid6 import uuid7

from app.models.file_link_relation import FileLinkRelation

if TYPE_CHECKING:
  from app.models.file import File

class Link(SQLModel, table=True):
  __tablename__ = "links"

  id: UUID = Field(default_factory=uuid7, primary_key=True)
  token: str = Field(nullable=False, unique=True)
  expires_at: datetime = Field(nullable=False, sa_type=DateTime(timezone=True))
  files: list["File"] = Relationship(back_populates="links", link_model=FileLinkRelation)
