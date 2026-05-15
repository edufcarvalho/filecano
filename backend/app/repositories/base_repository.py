from typing import Generic, Optional, TypeVar
from uuid import UUID

from sqlmodel import Session, SQLModel

from app.utils.time import current_datetime

Model = TypeVar("Model", bound="SQLModel")


class BaseRepository(Generic[Model]):
  model: type[Model]

  def __init__(self, session: Session):
    self.session = session

  def get_by_id(self, id: UUID) -> Optional[Model]:
    return self.session.get(self.model, id)

  def add(self, entity: Model) -> Model:
    self.session.add(entity)
    return entity

  def add_all(self, entities: list[Model]) -> list[Model]:
    self.session.add_all(entities)
    return entities

  def commit(self) -> None:
    self.session.commit()

  def refresh(self, entity: Model) -> None:
    self.session.refresh(entity)

  def rollback(self) -> None:
    self.session.rollback()

  def save(self, entity: Model) -> Model:
    self.add(entity)
    self.commit()
    self.refresh(entity)
    return entity

  def save_all(self, entities: list[Model]) -> list[Model]:
    self.add_all(entities)
    self.commit()
    for entity in entities:
      self.refresh(entity)
    return entities

  def hard_delete(self, entity: Model) -> None:
    self.session.delete(entity)

  def soft_delete_by_parent(
    self, model: type, parent_field: str, parent_id: UUID
  ) -> None:
    from sqlmodel import update

    query = (
      update(model)
      .where(getattr(model, parent_field) == parent_id)
      .values(deleted_at=current_datetime())
    )
    self.session.exec(query)
    self.session.commit()

  def restore_by_parent(self, model: type, parent_field: str, parent_id: UUID) -> None:
    from sqlmodel import update

    query = (
      update(model)
      .where(getattr(model, parent_field) == parent_id)
      .values(deleted_at=None)
    )
    self.session.exec(query)
    self.session.commit()

  @staticmethod
  def _active_filter(model: type, include_deleted: bool = False):
    if include_deleted:
      return model.deleted_at.is_not(None)
    return model.deleted_at.is_(None)
