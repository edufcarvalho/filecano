from fastapi import APIRouter, Depends, Body, status
from typing import Annotated
from uuid import UUID

from app.models import User
from app.api.dependencies.services import get_folder_service
from app.services.folder_service import FolderService
from app.schemas import FolderParams, FolderResponse
from app.api.dependencies.auth import get_current_user

router = APIRouter(prefix="/folders", tags=["folders"])

@router.post("", response_model=FolderResponse)
def create_folder(
  params: Annotated[FolderParams, Body()],
  current_user: User = Depends(get_current_user),
  service: FolderService = Depends(get_folder_service),
):
  folder = service.create_folder(current_user, params.name)

  return folder

@router.get("", response_model=list[FolderResponse])
def list_folders(
  current_user: User = Depends(get_current_user),
  service: FolderService = Depends(get_folder_service),
):
  folders = service.list_folders(current_user)

  return folders

@router.put("/{folder_id}", response_model=FolderResponse)
def update_folder(
  folder_id: UUID,
  params: Annotated[FolderParams, Body()],
  current_user: User = Depends(get_current_user),
  service: FolderService = Depends(get_folder_service),
):
  folder = service.update_folder(current_user, folder_id, params)

  return folder

@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
  folder_id: UUID,
  current_user: User = Depends(get_current_user),
  service: FolderService = Depends(get_folder_service),
):
  service.delete_folder(current_user, folder_id)
