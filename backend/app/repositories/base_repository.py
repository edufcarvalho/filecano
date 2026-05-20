from datetime import timedelta
from typing import Generic, Optional, TypeVar
from uuid import UUID

from sqlmodel import Session, SQLModel, select, update

from app.core import Settings
from app.utils.time import current_datetime

Model = TypeVar("Model", bound="SQLModel")


class BaseRepository(Generic[Model]):
  model: type[Model]

  def __init__(self, session: Session, settings: Settings):
    self.session = session
    self.settings = settings

  def get_by_id(self, id: UUID) -> Optional[Model]:
    return self.session.get(self.model, id)

  def add(self, entity: Model) -> Model:
    self.session.add(entity)
    self.session.flush()

    return entity

  def add_all(self, entities: list[Model]) -> list[Model]:
    self.session.add_all(entities)
    self.session.flush()

    return entities

  def commit(self) -> None:
    self.session.commit()

  def refresh(self, entity: Model) -> None:
    self.session.refresh(entity)

  def rollback(self) -> None:
    self.session.rollback()

  def save(self, entity: Model) -> Model:
    self.add(entity)
    self.refresh(entity)

    return entity

  def save_all(self, entities: list[Model]) -> list[Model]:
    self.add_all(entities)
    self.session.flush()

    for entity in entities:
      self.refresh(entity)

    return entities

  def hard_delete(self, entity: Model) -> None:
    self.session.delete(entity)
    self.session.flush()

  def soft_delete_by_parent(self, parent_id: UUID) -> None:
    query = (
      update(self.model)
      .where(self.model.parent_id == parent_id)
      .values(deleted_at=current_datetime())
    )

    self.session.exec(query)

  def soft_delete_by_parents(self, parent_ids: list[UUID]) -> None:
    query = (
      update(self.model)
      .where(self.model.parent_id.in_(parent_ids))
      .values(deleted_at=current_datetime())
    )

    self.session.exec(query)

  def restore_by_parent(self, parent_id: UUID) -> None:
    query = (
      update(self.model)
      .where(self.model.parent_id == parent_id)
      .values(deleted_at=None)
    )

    self.session.exec(query)

  def list_not_retainable(self):
    query = select(self.model).where(
      self.model.deleted_at.is_not(None),
      self.model.deleted_at + timedelta(days=self.settings.data_retention_policy)
      <= current_datetime(),
    )

    return self.session.exec(query).all()
