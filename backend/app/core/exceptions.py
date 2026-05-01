from fastapi import status


class AppError(Exception):
  status_code = status.HTTP_500_INTERNAL_SERVER_ERROR

  def __init__(self, message: str):
    super().__init__(message)

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
