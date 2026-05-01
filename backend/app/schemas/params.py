import re
from typing import Optional

from pydantic import BaseModel, field_validator
from pydantic import EmailStr as Email


def _validate_password(password: str) -> str:
  errors: list[str] = []

  if len(password) < 8:
    errors.append("Password must have at least 8 characters")

  if len(password) > 128:
    errors.append("Password must have at most 128 characters")

  if not re.search(r"[a-z]", password):
    errors.append("Password must contain at least one lowercase letter")

  if not re.search(r"[A-Z]", password):
    errors.append("Password must contain at least one uppercase letter")

  if not re.search(r"\d", password):
    errors.append("Password must contain at least one digit")

  if not re.search(r"[@$!%*#?&.,]", password):
    errors.append("Password must contain at least one special character: @$!%*#?&.,")

  if not re.fullmatch(r"[A-Za-z\d@$!#%*?&.,]+", password):
    errors.append(
      "Password contains invalid characters. Allowed characters are letters, digits, and special characters (@$!%*#?&.,)"
    )

  if errors:
    raise ValueError("; ".join(errors))

  return password


class UserParams(BaseModel):
  email: Email
  password: str

  @field_validator("password")
  @classmethod
  def password_should_be_valid(cls, password: str) -> str:
    return _validate_password(password)

class UserCreationParams(UserParams):
  name: str

class UserLoginParams(UserParams):
  pass


class UserUpdateParams(BaseModel):
  name: Optional[str] = None
  email: Optional[Email] = None
  password: Optional[str] = None

  @field_validator("password")
  @classmethod
  def password_should_be_valid(cls, password: Optional[str]) -> Optional[str]:
    if password is None:
      return password

    return _validate_password(password)
