from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlmodel import DateTime, Field, Relationship, SQLModel
from uuid6 import uuid7

from app.models.folder_link_relation import FolderLinkRelation
from app.utils.time import current_datetime

if TYPE_CHECKING:
  from app.models.file import File
  from app.models.link import Link
  from app.models.user import User


class Folder(SQLModel, table=True):
  __tablename__ = "folders"

  id: UUID = Field(default_factory=uuid7, primary_key=True)
  name: str = Field(default_factory=uuid7, nullable=False)
  user_id: UUID = Field(nullable=False, foreign_key="users.id", ondelete="CASCADE")
  parent_id: Optional[UUID] = Field(
    default=None, foreign_key="folders.id", ondelete="CASCADE"
  )

  created_at: datetime = Field(
    default_factory=current_datetime, nullable=False, sa_type=DateTime(timezone=True)
  )
  deleted_at: Optional[datetime] = Field(default=None, sa_type=DateTime(timezone=True))

  user: User = Relationship(back_populates="folders")
  files: list[File] = Relationship(
    back_populates="folder",
    sa_relationship_kwargs={
      "lazy": "selectin",
      "primaryjoin": "and_(Folder.id == File.folder_id, File.deleted_at == None)",
    },
  )
  parent: Optional[Folder] = Relationship(
    back_populates="children", sa_relationship_kwargs={"remote_side": "Folder.id"}
  )
  children: Optional[list[Folder]] = Relationship(
    back_populates="parent",
    sa_relationship_kwargs={
      "lazy": "selectin",
      "primaryjoin": "and_(Folder.parent_id == Folder.id, Folder.deleted_at == None)",
    },
  )
  links: list["Link"] = Relationship(
    back_populates="folders", link_model=FolderLinkRelation
  )
