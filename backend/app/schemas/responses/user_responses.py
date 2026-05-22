from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic import EmailStr as Email


class MessageResponse(BaseModel):
  message: str

  model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
  access_token: str
  token_type: str
  expires_in: int

  model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
  id: UUID
  name: str
  email: Email
  expires_in: int
  access_token: str
  token_type: str

  model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
  id: UUID
  name: str
  email: Email
  created_at: datetime
  deleted_at: Optional[datetime]

  model_config = ConfigDict(from_attributes=True)
