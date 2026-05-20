from typing import Annotated, Optional, Union
from uuid import UUID

from fastapi import APIRouter, Body, Depends, File, Form, Header, UploadFile, status
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_current_user, get_file_service
from app.core import FileTooLargeError, NotFoundError, Settings, get_settings
from app.models import User
from app.schemas import (
  FileListParams,
  FileResponse,
  FileUpdateParams,
  FolderWithFilesResponse,
)
from app.services import FileService as Service
from app.utils.file import GB_SCALE

router = APIRouter(prefix="/files", tags=["files"])


def ensure_upload_size_allowed(
  file_size_bytes: Annotated[int, Header(alias="Content-Length")],
  settings: Settings = Depends(get_settings),
) -> None:
  if file_size_bytes <= settings.max_file_size_bytes:
    return

  raise FileTooLargeError(
    f"Uploaded file is bigger than max allowed size ({(settings.max_file_size_bytes / GB_SCALE):.2f} GB)"
  )


@router.post(
  "",
  response_model=FileResponse,
  status_code=status.HTTP_201_CREATED,
  dependencies=[Depends(ensure_upload_size_allowed)],
)
def upload_file(
  file: Annotated[UploadFile, File()],
  folder_id: Annotated[Optional[UUID], Form()] = None,
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_file_service),
) -> FileResponse:

  return service.create_file(current_user, file, folder_id)


@router.get("", response_model=Union[list[FileResponse], FolderWithFilesResponse])
def list_files(
  params: FileListParams = Depends(FileListParams),
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_file_service),
) -> Union[list[FileResponse], FolderWithFilesResponse]:
  return service.list_files(current_user, params)


@router.put("/{file_id}", response_model=FileResponse)
def update_file(
  file_id: UUID,
  params: Annotated[FileUpdateParams, Body()],
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_file_service),
) -> FileResponse:
  return service.update_file(current_user, file_id, params)


@router.post("/{file_id}/restore", response_model=FileResponse)
def restore_file(
  file_id: UUID,
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_file_service),
) -> FileResponse:
  return service.restore_file(current_user, file_id)


@router.get("/{file_id}")
def download_file(
  file_id: UUID,
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_file_service),
) -> StreamingResponse:
  file, response = service.get_download(current_user, file_id)

  headers = {
    "Content-Disposition": f"attachment; filename*=UTF-8''{file.original_name.encode()}",
    "X-Checksum-SHA256": file.checksum or "",
  }

  if file.size_bytes is not None:
    headers["Content-Length"] = str(file.size_bytes)

  return StreamingResponse(
    service.stream_response(response),
    media_type=file.content_type or "application/octet-stream",
    headers=headers,
  )


@router.get("/{file_id}/preview")
def preview_file(
  file_id: UUID,
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_file_service),
) -> StreamingResponse:
  file = service.get_file_for_preview(current_user, file_id)

  if not file.preview_object_key:
    raise NotFoundError("Preview not available for this file")

  response = service.get_preview_download(file)
  headers = {}

  if file.preview_size_bytes is not None:
    headers["Content-Length"] = str(file.preview_size_bytes)

  return StreamingResponse(
    service.stream_response(response),
    media_type=file.preview_content_type or "image/jpeg",
    headers=headers,
  )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
  file_id: UUID,
  permanent: bool = False,
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_file_service),
) -> None:
  service.delete_file(current_user, file_id, permanent)
