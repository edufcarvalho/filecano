from pydantic import BaseModel, ConfigDict


class FolderParams(BaseModel):
  name: str

  model_config = ConfigDict(from_attributes=True)
