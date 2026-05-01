from pydantic import EmailStr as Email, BaseModel, field_validator
import re

class UserParams(BaseModel):
  name: str
  email: Email
  password: str

  @field_validator("password")
  @classmethod
  def password_should_be_valid(cls, password: str) -> str:
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