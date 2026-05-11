from app.models import Folder, User
from app.repositories.folder_repository import FolderRepository


class FolderService:
  def __init__(
    self,
    repository: FolderRepository,
  ):
    self.repository = repository

  def create_folder(self, user: User, name: str) -> Folder:
    folder = Folder(user_id=user.id, name=name)

    return self.repository.create(folder)
