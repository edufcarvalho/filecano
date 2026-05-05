from typing import Annotated, Optional
from uuid import UUID
from urllib.parse import quote
from fastapi import APIRouter, Body, Depends, File, UploadFile, status
from fastapi.exceptions import HTTPException
from fastapi.responses import StreamingResponse

from app.services import LinkService
from app.api.dependencies import get_current_user, get_file_service, get_link_service
from app.core import NotFoundError, ForbiddenError
from app.models import User
from app.schemas import (
  LinkResponse,
  TokenResponse,
  LinkUpdateParams,
  LinkUpdateResponse
)

router = APIRouter(prefix="/share", tags=["links"])


@router.post("", response_model=TokenResponse)
def create_share_link(
  files: Annotated[list[UUID] | UUID, Body()],
  current_user: User = Depends(get_current_user),
  service: LinkService = Depends(get_link_service),
) -> TokenResponse:
  file_ids = files if isinstance(files, list) else [files]

  return service.create_link(current_user, file_ids)


@router.get("/{token}", response_model=LinkResponse)
def get_files(token: str, service: LinkService = Depends(get_link_service)) -> LinkResponse:
  return service.authenticate_token(token)


@router.get("/user/{user_id}", response_model=list[LinkResponse])
def list_user_links(
  user_id: UUID,
  current_user: User = Depends(get_current_user),
  service: LinkService = Depends(get_link_service),
) -> list[LinkResponse]:
  if current_user.id != user_id:
    raise ForbiddenError("Not authorized to view these links")

  return service.list_user_links(user_id)


@router.put("/{token}")
def update_link(
  token: str,
  body: Annotated[LinkUpdateParams, Body()],
  service: LinkService = Depends(get_link_service),
) -> LinkUpdateParams:
  link = service.update_link_name(token, body.custom_name)

  return link


@router.delete("/{token}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(
  token: str,
  current_user: User = Depends(get_current_user),
  service: LinkService = Depends(get_link_service),
) -> None:
  return service.delete_link(current_user, token)


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


router = APIRouter(prefix="/share", tags=["links"])


@router.post("", response_model=TokenResponse)
def create_share_link(
  files: Annotated[list[UUID] | UUID, Body()],
  current_user: User = Depends(get_current_user),
  service: LinkService = Depends(get_link_service),
) -> TokenResponse:
  file_ids = files if isinstance(files, list) else [files]

  return service.create_link(current_user, file_ids)


@router.get("/{token}", response_model=LinkResponse)
def get_files(token: str, service: LinkService = Depends(get_link_service)) -> LinkResponse:
  return service.authenticate_token(token)


@router.get("/user/{user_id}", response_model=list[LinkResponse])
def list_user_links(
  user_id: UUID,
  current_user: User = Depends(get_current_user),
  service: LinkService = Depends(get_link_service),
) -> list[LinkResponse]:
  return service.list_user_links(user_id)


@router.put("/{token}")
def update_link(
  token: str,
  custom_name: str,
  current_user: User = Depends(get_current_user),
  service: LinkService = Depends(get_link_service),
) -> LinkUpdateResponse:
  link = service.update_link_name(current_user, token, custom_name)

  return link


@router.delete("/{token}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(
  token: str,
  current_user: User = Depends(get_current_user),
  service: LinkService = Depends(get_link_service),
):
  service.delete_link(current_user, token)


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
