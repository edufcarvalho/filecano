from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def value_error_handler(request: Request, error: ValueError) -> JSONResponse:
  return _unprocessable_content(request, error, message=str(error))


def request_validation_error_handler(
  request: Request, error: RequestValidationError
) -> JSONResponse:
  return _unprocessable_content(request, error, message=str(error))


def _unprocessable_content(
  request: Request, error: ValueError | RequestValidationError, message: str
) -> JSONResponse:
  return JSONResponse(
    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
    content=jsonable_encoder(
      {
        "message": message,
        "path": request.url.path,
      }
    ),
  )


def register_exception_handlers(app: FastAPI) -> None:
  app.add_exception_handler(ValueError, value_error_handler)
  app.add_exception_handler(RequestValidationError, request_validation_error_handler)
