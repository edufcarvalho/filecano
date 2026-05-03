from typing import Annotated
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Body, Depends, File, UploadFile, status
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_current_user, get_file_service, get_link_service
from app.core import NotFoundError
from app.models import User
from app.schemas import (
  FileResponse,
  FileUpdateParams,
  LinkResponse,
  MessageResponse,
  TokenResponse,
)
from app.services import FileService as Service
from app.services import LinkService

router = APIRouter(prefix="/files", tags=["files"])


@router.post("", response_model=FileResponse, status_code=status.HTTP_201_CREATED)
def upload_file(
  file: Annotated[UploadFile, File()],
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_file_service),
) -> FileResponse:
  return service.create_file(current_user, file)


@router.get("", response_model=list[FileResponse])
def list_files(
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_file_service),
) -> list[FileResponse]:
  return service.list_files(current_user)


@router.get("/deleted", response_model=list[FileResponse])
def list_deleted_files(
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_file_service),
) -> list[FileResponse]:
  return service.list_deleted_files(current_user)


@router.put("/{file_id}", response_model=FileResponse)
def update_file(
  file_id: UUID,
  params: Annotated[FileUpdateParams, Body()],
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_file_service),
) -> FileResponse:
  return service.update_file(current_user, file_id, params)


@router.get("/{file_id}")
def download_file(
  file_id: UUID,
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_file_service),
) -> StreamingResponse:
  file, response = service.get_download(current_user, file_id)
  encoded_name = quote(file.original_name, safe="")
  headers = {
    "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_name}",
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


@router.delete("/{file_id}", response_model=MessageResponse)
def delete_file(
  file_id: UUID,
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_file_service),
) -> MessageResponse:
  service.delete_file(current_user, file_id)

  return MessageResponse(message="File deleted")


@router.delete("/{file_id}/permanent", response_model=MessageResponse)
def delete_file_permanently(
  file_id: UUID,
  current_user: User = Depends(get_current_user),
  service: Service = Depends(get_file_service),
) -> MessageResponse:
  service.delete_file_permanently(current_user, file_id)

  return MessageResponse(message="File permanently deleted")


@router.post("/share", response_model=TokenResponse)
def create_share_link(
  files: Annotated[list[UUID] | UUID, Body()],
  current_user: User = Depends(get_current_user),
  service: LinkService = Depends(get_link_service),
) -> TokenResponse:
  file_ids = files if isinstance(files, list) else [files]

  return service.create_link(current_user, file_ids)


@router.get("/share/{token}", response_model=LinkResponse)
def get_files(token: str, service: LinkService = Depends(get_link_service)) -> LinkResponse:
  return service.authenticate_token(token)


@router.get("/share/{token}/{file_id}")
def download_shared_file(
  token: str,
  file_id: UUID,
  service: LinkService = Depends(get_link_service),
) -> StreamingResponse:
  file, response = service.get_download(token, file_id)
  encoded_name = quote(file.original_name, safe="")
  headers = {
    "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_name}",
    "X-Checksum-SHA256": file.checksum or "",
  }

  if file.size_bytes is not None:
    headers["Content-Length"] = str(file.size_bytes)

  return StreamingResponse(
    service.stream_response(response),
    media_type=file.content_type or "application/octet-stream",
    headers=headers,
  )
