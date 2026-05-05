from typing import Optional

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core import AppError


def app_error_handler(request: Request, error: AppError) -> JSONResponse:
  return _error_response(request, status_code=error.status_code, message=error.detail, headers=error.headers)


def request_validation_error_handler(
  request: Request, error: RequestValidationError
) -> JSONResponse:
  return _error_response(
    request,
    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
    message=str(error),
  )


def _error_response(
  request: Request,
  status_code: int,
  message: str,
  headers: Optional[dict] = None,
) -> JSONResponse:
  return JSONResponse(
    status_code=status_code,
    content=jsonable_encoder(
      {
        "message": message,
        "path": request.url.path,
      }
    ),
    headers=headers,
  )


def register_exception_handlers(app: FastAPI) -> None:
  app.add_exception_handler(AppError, app_error_handler)
  app.add_exception_handler(RequestValidationError, request_validation_error_handler)
