from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlmodel import DateTime, Field, Relationship, SQLModel
from uuid6 import uuid7

from app.utils.time import current_datetime

if TYPE_CHECKING:
  from app.models.user import User


class File(SQLModel, table=True):
  __tablename__ = "files"

  id: UUID = Field(default_factory=uuid7, primary_key=True)
  user_id: UUID = Field(foreign_key="users.id", nullable=False, ondelete="CASCADE")
  object_key: str = Field(nullable=False, unique=True)
  original_name: str = Field(nullable=False)

  content_type: Optional[str] = Field(default=None)
  size_bytes: Optional[int] = Field(default=None)
  checksum: Optional[str] = Field(default=None)

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
