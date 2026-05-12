from pydantic import BaseModel, ConfigDict, field_validator


class FolderParams(BaseModel):
  name: str

  model_config = ConfigDict(from_attributes=True)
