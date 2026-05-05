from pydantic import BaseModel, ConfigDict


class LinkUpdateParams(BaseModel):
  custom_name: str

  model_config = ConfigDict(from_attributes=True)