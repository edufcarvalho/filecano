from fastapi import Depends
from sqlmodel import Session

from app.core import Settings, get_settings
from app.db import get_session
from app.repositories import FileRepository, UserRepository
from app.services import AuthService, FileService, FileStorageService, UserService


def get_file_repository(
  session: Session = Depends(get_session)
) -> FileRepository:
  return FileRepository(session)


def get_file_storage_service(
  settings: Settings = Depends(get_settings),
) -> FileStorageService:
  return FileStorageService(settings)


def get_file_service(
  repository: FileRepository = Depends(get_file_repository),
  storage_service: FileStorageService = Depends(get_file_storage_service),
  session: Session = Depends(get_session),
) -> FileService:
  return FileService(repository, storage_service, session)


def get_user_repository(
  session: Session = Depends(get_session)
) -> UserRepository:
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
