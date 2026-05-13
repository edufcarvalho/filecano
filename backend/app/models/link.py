from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlmodel import DateTime, Field, Relationship, SQLModel
from uuid6 import uuid7

from app.models.file_link_relation import FileLinkRelation
from app.models.folder_link_relation import FolderLinkRelation
from app.utils.time import current_datetime

if TYPE_CHECKING:
  from app.models.file import File
  from app.models.folder import Folder
  from app.models.user import User


class Link(SQLModel, table=True):
  __tablename__ = "links"

  id: UUID = Field(default_factory=uuid7, primary_key=True)
  token: str = Field(nullable=False, unique=True)
  custom_name: Optional[str] = Field(default=None, unique=True)
  user_id: UUID = Field(nullable=False, foreign_key="users.id", ondelete="CASCADE")
  expires_at: datetime = Field(nullable=False, sa_type=DateTime(timezone=True))
  created_at: datetime = Field(
    nullable=False, default_factory=current_datetime, sa_type=DateTime(timezone=True)
  )
  deleted_at: Optional[datetime] = Field(default=None, sa_type=DateTime(timezone=True))

  files: list["File"] = Relationship(
    back_populates="links", link_model=FileLinkRelation
  )
  folders: list["Folder"] = Relationship(
    back_populates="links", link_model=FolderLinkRelation
  )
  user: "User" = Relationship(back_populates="links")
