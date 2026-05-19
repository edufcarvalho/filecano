from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlmodel import BigInteger, Column, DateTime, Field, Index, Relationship, SQLModel
from uuid6 import uuid7

from app.models.file_link_relation import FileLinkRelation
from app.utils.time import current_datetime

if TYPE_CHECKING:
  from app.models.folder import Folder
  from app.models.link import Link
  from app.models.user import User


class File(SQLModel, table=True):
  __tablename__ = "files"

  id: UUID = Field(default_factory=uuid7, primary_key=True)
  user_id: UUID = Field(foreign_key="users.id", nullable=False, ondelete="CASCADE")
  folder_id: Optional[UUID] = Field(
    foreign_key="folders.id", nullable=True, ondelete="CASCADE"
  )
  object_key: str = Field(nullable=False, unique=True)
  original_name: str = Field(nullable=False)
  display_name: str = Field(nullable=False)

  content_type: Optional[str] = Field(default=None)
  size_bytes: Optional[int] = Field(sa_column=Column(BigInteger, nullable=True))
  checksum: Optional[str] = Field(default=None)

  preview_object_key: Optional[str] = Field(default=None)
  preview_content_type: Optional[str] = Field(default=None)
  preview_size_bytes: Optional[int] = Field(default=None)

  created_at: datetime = Field(
    default_factory=current_datetime,
    nullable=False,
    sa_type=DateTime(timezone=True),
  )
  deleted_at: Optional[datetime] = Field(
    default=None,
    sa_type=DateTime(timezone=True),
  )

  user: "User" = Relationship(back_populates="files")
  links: list["Link"] = Relationship(
    back_populates="files", link_model=FileLinkRelation
  )
  folder: "Folder" = Relationship(back_populates="files")

  __table_args__ = (
    Index(
      "ix_original_name_trgm",
      "original_name",
      postgresql_using="gin",
      postgresql_ops={"original_name": "gin_trgm_ops"},
    ),
    Index(
      "ix_display_name_trgm",
      "display_name",
      postgresql_using="gin",
      postgresql_ops={"display_name": "gin_trgm_ops"},
    ),
  )
