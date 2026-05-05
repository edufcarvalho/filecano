from typing import Annotated
from uuid import UUID
from urllib.parse import quote
from fastapi import APIRouter, Body, Depends, File, UploadFile, status
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_current_user, get_file_service, get_link_service
from app.models import User
from app.services import LinkService
from app.schemas import (
  LinkResponse,
  TokenResponse,
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
