from fastapi import Depends
from sqlmodel import Session

from app.db.session import get_session
from app.repositories.user_repository import UserRepository
from app.services.user_service import UserService


def get_user_repository(
  session: Session = Depends(get_session)
) -> UserRepository:
  return UserRepository(session)

def get_user_service(
  repository: UserRepository = Depends(get_user_repository),
) -> UserService:
  return UserService(repository)