from sqlmodel import Session

from app.core import get_settings
from app.db.session import engine
from app.repositories import (
  FileRepository,
  FolderRepository,
  LinkRepository,
  UserRepository,
)
from app.services import (
  FileService,
  FileStorageService,
  FolderService,
  LinkService,
  UserService,
)
from app.tasks.celery import celery


@celery.task(name="clean.not_retainable")
def enforce_retention_policies() -> None:
  settings = get_settings()

  with Session(engine, expire_on_commit=False) as session:
    user_repository = UserRepository(session, settings)
    file_repository = FileRepository(session, settings)
    folder_repository = FolderRepository(session, settings)
    link_repository = LinkRepository(session, settings)
    storage_service = FileStorageService(settings)

    file_service = FileService(
      file_repository, folder_repository, storage_service, settings
    )
    folder_service = FolderService(
      folder_repository, file_repository, file_service, storage_service
    )
    link_service = LinkService(
      link_repository,
      file_repository,
      folder_repository,
      file_service,
      folder_service,
      storage_service,
      settings,
    )
    user_service = UserService(user_repository)

    try:
      user_service.enforce_retention_policy()
      link_service.enforce_retention_policy()
      folder_service.enforce_retention_policy()
      file_service.enforce_retention_policy()

      session.commit()
    except Exception:
      session.rollback()
      raise
