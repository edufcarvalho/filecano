from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlmodel import BigInteger, Column, DateTime, Field, Relationship, SQLModel
from uuid6 import uuid7

from app.utils.time import current_datetime

if TYPE_CHECKING:
  from app.models.user import User


class Archive(SQLModel, table=True):
  __tablename__ = "archives"

  id: UUID = Field(default_factory=uuid7, primary_key=True)
  user_id: UUID = Field(foreign_key="users.id", nullable=False, ondelete="CASCADE")

  object_key: str = Field(nullable=False, unique=True)
  file_ids_hash: str = Field(nullable=False)
  file_count: int = Field(nullable=False)

  original_size_bytes: int = Field(sa_column=Column(BigInteger, nullable=True))
  compressed_size_bytes: int = Field(sa_column=Column(BigInteger, nullable=True))

  last_time_downloaded: datetime = Field(
    default_factory=current_datetime,
    nullable=False,
    sa_type=DateTime(timezone=True),
  )
  created_at: datetime = Field(
    default_factory=current_datetime,
    nullable=False,
    sa_type=DateTime(timezone=True),
  )

  user: "User" = Relationship(back_populates="archives")
