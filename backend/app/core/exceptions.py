from fastapi import HTTPException, status
from typing import Optional


class AppError(HTTPException):
  status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

  def __init__(self, message: str, headers: Optional[dict] = None):
    super().__init__(status_code=self.status_code, detail=message, headers=headers)

class PasswordValidationError(AppError):
  status_code = status.HTTP_400_BAD_REQUEST

class AuthenticationError(AppError):
  status_code = status.HTTP_401_UNAUTHORIZED


class ConflictError(AppError):
  status_code = status.HTTP_409_CONFLICT


class GoneError(AppError):
  status_code = status.HTTP_410_GONE


class NotFoundError(AppError):
  status_code = status.HTTP_404_NOT_FOUND


class StorageError(AppError):
  status_code = status.HTTP_502_BAD_GATEWAY

class FileTooLargeError(AppError):
  status_code = status.HTTP_413_CONTENT_TOO_LARGE
