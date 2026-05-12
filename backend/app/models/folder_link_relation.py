from uuid import UUID

from sqlmodel import Field, SQLModel


class FolderLinkRelation(SQLModel, table=True):
  __tablename__ = "folder_link_relations"

  folder_id: UUID = Field(default=None, foreign_key="folders.id", primary_key=True)
  link_id: UUID = Field(
    default=None, foreign_key="links.id", primary_key=True, ondelete="CASCADE"
  )
