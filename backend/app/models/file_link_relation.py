from uuid import UUID

from sqlmodel import Field, SQLModel


class FileLinkRelation(SQLModel, table=True):
  __tablename__ = "file_link_relations"

  file_id: UUID = Field(default=None, foreign_key="files.id", primary_key=True)
  link_id: UUID = Field(default=None, foreign_key="links.id", primary_key=True)
