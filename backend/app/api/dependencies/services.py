from fastapi import Depends
from sqlmodel import Session

from app.core import Settings, get_settings
from app.db import get_session
from app.repositories import (
  ArchiveRepository,
  FileRepository,
  FolderRepository,
  LinkRepository,
  UserRepository,
)
from app.services import (
  ArchiveService,
  AuthService,
  FileService,
  FileStorageService,
  FolderService,
  LinkService,
  UserService,
)


def get_file_repository(
  session: Session = Depends(get_session), settings: Settings = Depends(get_settings)
) -> FileRepository:
  return FileRepository(session, settings)


def get_file_storage_service(
  settings: Settings = Depends(get_settings),
) -> FileStorageService:
  return FileStorageService(settings)


def get_folder_repository(
  session: Session = Depends(get_session), settings: Settings = Depends(get_settings)
) -> FolderRepository:
  return FolderRepository(session, settings)


def get_file_service(
  repository: FileRepository = Depends(get_file_repository),
  folder_repository: FolderRepository = Depends(get_folder_repository),
  storage_service: FileStorageService = Depends(get_file_storage_service),
  settings: Settings = Depends(get_settings),
) -> FileService:
  return FileService(repository, folder_repository, storage_service, settings)


def get_archive_repository(
  session: Session = Depends(get_session), settings: Settings = Depends(get_settings)
) -> ArchiveRepository:
  return ArchiveRepository(session, settings)


def get_archive_service(
  repository: ArchiveRepository = Depends(get_archive_repository),
  file_repository: FileRepository = Depends(get_file_repository),
  folder_repository: FolderRepository = Depends(get_folder_repository),
  storage_service: FileStorageService = Depends(get_file_storage_service),
  settings: Settings = Depends(get_settings),
) -> ArchiveService:
  return ArchiveService(
    repository, file_repository, folder_repository, storage_service, settings
  )


def get_folder_service(
  repository: FolderRepository = Depends(get_folder_repository),
  file_repository: FileRepository = Depends(get_file_repository),
  file_service: FileService = Depends(get_file_service),
  archive_service: ArchiveService = Depends(get_archive_service),
  storage_service: FileStorageService = Depends(get_file_storage_service),
) -> FolderService:
  return FolderService(
    repository, file_repository, file_service, archive_service, storage_service
  )


def get_link_repository(
  session: Session = Depends(get_session), settings: Settings = Depends(get_settings)
) -> LinkRepository:
  return LinkRepository(session, settings)


def get_link_service(
  repository: LinkRepository = Depends(get_link_repository),
  file_repository: FileRepository = Depends(get_file_repository),
  folder_repository: FolderRepository = Depends(get_folder_repository),
  file_service: FileService = Depends(get_file_service),
  folder_service: FolderService = Depends(get_folder_service),
  storage_service: FileStorageService = Depends(get_file_storage_service),
  settings: Settings = Depends(get_settings),
) -> LinkService:
  return LinkService(
    repository,
    file_repository,
    folder_repository,
    file_service,
    folder_service,
    storage_service,
    settings,
  )


def get_user_repository(
  session: Session = Depends(get_session), settings: Settings = Depends(get_settings)
) -> UserRepository:
  return UserRepository(session, settings)


def get_user_service(
  repository: UserRepository = Depends(get_user_repository),
) -> UserService:
  return UserService(repository)


def get_auth_service(
  repository: UserRepository = Depends(get_user_repository),
  settings: Settings = Depends(get_settings),
) -> AuthService:
  return AuthService(repository, settings)
