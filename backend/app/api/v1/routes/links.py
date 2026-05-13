from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, status
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_current_user, get_link_service
from app.models import User
from app.schemas import (
  FileResponse,
  LinkCreateParams,
  LinkResponse,
  LinkRestoreParams,
  LinkRestoreResponse,
  LinkUpdateParams,
  LinkUpdateResponse,
  TokenResponse,
)
from app.services import LinkService

router = APIRouter(prefix="/share", tags=["links"])


@router.get("/user/{user_id}", response_model=list[LinkResponse])
def list_user_links(
  user_id: UUID,
  current_user: User = Depends(get_current_user),
  service: LinkService = Depends(get_link_service),
) -> list[LinkResponse]:
  return service.list_user_links(current_user, user_id)


@router.put("/{token}", response_model=LinkUpdateResponse)
def update_link(
  token: str,
  body: Annotated[LinkUpdateParams, Body()],
  current_user: User = Depends(get_current_user),
  service: LinkService = Depends(get_link_service),
) -> LinkUpdateResponse:
  link = service.update_link_name(current_user, token, body.custom_name)

  return link


@router.post("/{token}/restore", response_model=LinkRestoreResponse)
def restore_link(
  token: str,
  params: Annotated[LinkRestoreParams | None, Body()] = None,
  current_user: User = Depends(get_current_user),
  service: LinkService = Depends(get_link_service),
) -> LinkRestoreResponse:
  return service.restore_link(current_user, token, params)


@router.post("", response_model=TokenResponse)
def create_share_link(
  files: Annotated[LinkCreateParams, Body()] = None,
  folders: Annotated[LinkCreateParams, Body()] = None,
  current_user: User = Depends(get_current_user),
  service: LinkService = Depends(get_link_service),
) -> TokenResponse:
  return service.create_link(current_user, files, folders)


@router.get("/{token}", response_model=LinkResponse)
def get_files(
  token: str, service: LinkService = Depends(get_link_service)
) -> LinkResponse:
  return service.authenticate_token(token)


@router.delete("/{token}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(
  token: str,
  current_user: User = Depends(get_current_user),
  service: LinkService = Depends(get_link_service),
):
  service.delete_link(current_user, token)


@router.get("/{token}/preview/{file_id}")
def preview_shared_file(
  token: str,
  file_id: UUID,
  service: LinkService = Depends(get_link_service),
) -> StreamingResponse:
  file, response = service.get_preview_download(token, file_id)

  headers = {}

  if file.preview_size_bytes is not None:
    headers["Content-Length"] = str(file.preview_size_bytes)

  return StreamingResponse(
    service.stream_response(response),
    media_type=file.preview_content_type or "image/jpeg",
    headers=headers,
  )


@router.get("/{token}/{file_id}")
def download_shared_file(
  token: str,
  file_id: UUID,
  service: LinkService = Depends(get_link_service),
) -> StreamingResponse:
  file, response = service.get_download(token, file_id)

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


@router.post("/{link_id}/files/clone", status_code=status.HTTP_201_CREATED)
def clone_files(
  link_id: UUID,
  current_user: User = Depends(get_current_user),
  service: LinkService = Depends(get_link_service),
) -> list[FileResponse]:
  return service.clone_files(current_user, link_id)
