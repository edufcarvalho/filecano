from sqlmodel import Field, Relationship, SQLModel
from uuid6 import uuid7
from uuid import UUID
from pydantic import EmailStr as Email
from typing import TYPE_CHECKING, Optional
from datetime import datetime

from app.utils.time import current_datetime



from app.models.file import File


class User(SQLModel, table=True):
  __tablename__ = "users"

  id: UUID = Field(default_factory=uuid7, primary_key=True)
  name: str = Field(nullable=False)
  email: Email = Field(index=True, unique=True, nullable=False)
  hashed_password: str = Field(nullable=False)

  created_at: datetime = Field(default_factory=current_datetime, nullable=False)
  deleted_at: Optional[datetime] = Field(default=None)

  files: list["File"] = Relationship(back_populates="user")
