
from pydantic import BaseModel, ConfigDict, field_validator


class FileUpdateParams(BaseModel):
  original_name: str

  @field_validator("original_name")
  @classmethod
  def original_name_should_not_be_blank(cls, original_name: str) -> str:
    original_name = original_name.strip()

    if not original_name:
      raise ValueError("Original name must not be blank")

    return original_name

  model_config = ConfigDict(from_attributes=True)
