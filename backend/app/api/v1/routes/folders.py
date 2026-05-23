from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, status
from fastapi.responses import StreamingResponse

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.services import get_archive_service, get_folder_service
from app.models import User
from app.schemas import (
  BulkParams,
  FolderParams,
  FolderResponse,
  FolderUpdateParams,
  FolderWithFilesResponse,
)
from app.services.archive_service import ArchiveService
from app.services.folder_service import FolderService

router = APIRouter(prefix="/folders", tags=["folders"])


@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
def create_folder(
  params: Annotated[FolderParams, Body()],
  current_user: User = Depends(get_current_user),
  service: FolderService = Depends(get_folder_service),
):
  folder = service.create_folder(current_user, params)

  return folder


@router.get("", response_model=list[FolderResponse], status_code=status.HTTP_200_OK)
def list_folders(
  deleted: bool = False,
  current_user: User = Depends(get_current_user),
  service: FolderService = Depends(get_folder_service),
):
  folders = service.list_folders(current_user, deleted=deleted)

  return folders


@router.put(
  "/{folder_id}", response_model=FolderResponse, status_code=status.HTTP_200_OK
)
def update_folder(
  folder_id: UUID,
  params: Annotated[FolderUpdateParams, Body()],
  current_user: User = Depends(get_current_user),
  service: FolderService = Depends(get_folder_service),
):
  folder = service.update_folder(current_user, folder_id, params)

  return folder


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
  folder_id: UUID,
  permanent: bool = False,
  current_user: User = Depends(get_current_user),
  service: FolderService = Depends(get_folder_service),
):
  service.delete_folder(current_user, folder_id, permanent)


@router.post("/{folder_id}/restore", response_model=FolderWithFilesResponse)
def restore_folder(
  folder_id: UUID,
  current_user: User = Depends(get_current_user),
  service: FolderService = Depends(get_folder_service),
) -> FolderWithFilesResponse:
  return service.restore_folder(current_user, folder_id)


@router.post("/delete/bulk", status_code=status.HTTP_204_NO_CONTENT)
def bulk_delete_folders(
  params: Annotated[BulkParams, Body()],
  permanent: bool = False,
  current_user: User = Depends(get_current_user),
  service: FolderService = Depends(get_folder_service),
) -> None:
  service.delete_folders(current_user, params.ids, permanent)


@router.post("/restore/bulk", status_code=status.HTTP_204_NO_CONTENT)
def bulk_restore_folders(
  params: Annotated[BulkParams, Body()],
  current_user: User = Depends(get_current_user),
  service: FolderService = Depends(get_folder_service),
) -> None:
  service.restore_folders(current_user, params.ids)


@router.get("/{folder_id}/download")
def download_folder(
  folder_id: UUID,
  current_user: User = Depends(get_current_user),
  folder_service: FolderService = Depends(get_folder_service),
  archive_service: ArchiveService = Depends(get_archive_service),
) -> StreamingResponse:
  folder = folder_service.get_folder(folder_id)
  folder_service.ensure_user_has_rights(current_user.id, folder.user_id)

  archive, _ = archive_service.get_or_create_folder_archive(current_user, folder)
  response = archive_service.get_archive_download(archive)

  headers = {
    "Content-Disposition": f"attachment; filename*=UTF-8''{folder.name}.zip",
  }

  if archive.compressed_size_bytes is not None:
    headers["Content-Length"] = str(archive.compressed_size_bytes)

  return StreamingResponse(
    archive_service.stream_response(response),
    media_type="application/zip",
    headers=headers,
  )
