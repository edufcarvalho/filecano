from fastapi import Depends
from sqlmodel import Session

from app.core import Settings, get_settings
from app.db import get_session
from app.repositories import (
  FileRepository,
  FolderRepository,
  LinkRepository,
  UserRepository,
)
from app.services import (
  AuthService,
  FileService,
  FileStorageService,
  FolderService,
  LinkService,
  UserService,
)


def get_file_repository(session: Session = Depends(get_session)) -> FileRepository:
  return FileRepository(session)


def get_file_storage_service(
  settings: Settings = Depends(get_settings),
) -> FileStorageService:
  return FileStorageService(settings)


def get_folder_repository(session: Session = Depends(get_session)) -> FolderRepository:
  return FolderRepository(session)


def get_file_service(
  repository: FileRepository = Depends(get_file_repository),
  folder_repository: FolderRepository = Depends(get_folder_repository),
  storage_service: FileStorageService = Depends(get_file_storage_service),
  settings: Settings = Depends(get_settings),
) -> FileService:
  return FileService(repository, folder_repository, storage_service, settings)


def get_folder_service(
  repository: FolderRepository = Depends(get_folder_repository),
  file_repository: FileRepository = Depends(get_file_repository),
  file_service: FileService = Depends(get_file_service),
  storage_service: FileStorageService = Depends(get_file_storage_service),
) -> FolderService:
  return FolderService(repository, file_repository, file_service, storage_service)


def get_link_repository(session: Session = Depends(get_session)) -> LinkRepository:
  return LinkRepository(session)


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
    repository, file_repository, folder_repository, file_service, folder_service, storage_service, settings
  )


def get_user_repository(session: Session = Depends(get_session)) -> UserRepository:
  return UserRepository(session)


def get_user_service(
  repository: UserRepository = Depends(get_user_repository),
  session: Session = Depends(get_session),
) -> UserService:
  return UserService(repository, session)


def get_auth_service(
  repository: UserRepository = Depends(get_user_repository),
  settings: Settings = Depends(get_settings),
) -> AuthService:
  return AuthService(repository, settings)
