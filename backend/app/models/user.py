from datetime import datetime
from typing import Optional, TYPE_CHECKING
from uuid import UUID

from pydantic import EmailStr as Email
from sqlmodel import DateTime, Field, Relationship, SQLModel
from uuid6 import uuid7

if TYPE_CHECKING:
  from app.models.file import File
  from app.models.link import Link
  from app.models.folder import Folder

from app.utils.time import current_datetime


class User(SQLModel, table=True):
  __tablename__ = "users"

  id: UUID = Field(default_factory=uuid7, primary_key=True)
  name: str = Field(nullable=False)
  email: Email = Field(index=True, unique=True, nullable=False)
  hashed_password: str = Field(nullable=False)

  created_at: datetime = Field(
    default_factory=current_datetime,
    nullable=False,
    sa_type=DateTime(timezone=True),
  )
  deleted_at: Optional[datetime] = Field(
    default=None,
    sa_type=DateTime(timezone=True),
  )

  files: list["File"] = Relationship(back_populates="user")
  links: list["Link"] = Relationship(back_populates="user")
  folders: list["Folder"] = Relationship(back_populates="user")
