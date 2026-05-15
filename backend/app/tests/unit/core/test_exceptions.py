import unittest

from fastapi import status

from app.core.exceptions import (
  AppError,
  AuthenticationError,
  BadRequestError,
  ConflictError,
  FileTooLargeError,
  ForbiddenError,
  GoneError,
  NotFoundError,
  PasswordValidationError,
  StorageError,
  UnsupportedFileTypeError,
)


class TestAppError(unittest.TestCase):
  def test_default_status_code(self):
    """AppError should default to 500."""
    error = AppError("something went wrong")
    self.assertEqual(error.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
    self.assertEqual(error.detail, "something went wrong")

  def test_with_headers(self):
    """AppError should accept custom headers."""
    error = AppError("msg", headers={"X-Custom": "value"})
    self.assertEqual(error.headers, {"X-Custom": "value"})


class TestPasswordValidationError(unittest.TestCase):
  def test_status_code_400(self):
    error = PasswordValidationError("weak password")
    self.assertEqual(error.status_code, status.HTTP_400_BAD_REQUEST)


class TestBadRequestError(unittest.TestCase):
  def test_status_code_400(self):
    error = BadRequestError("bad")
    self.assertEqual(error.status_code, status.HTTP_400_BAD_REQUEST)


class TestAuthenticationError(unittest.TestCase):
  def test_status_code_401(self):
    error = AuthenticationError("unauthorized")
    self.assertEqual(error.status_code, status.HTTP_401_UNAUTHORIZED)


class TestConflictError(unittest.TestCase):
  def test_status_code_409(self):
    error = ConflictError("conflict")
    self.assertEqual(error.status_code, status.HTTP_409_CONFLICT)


class TestGoneError(unittest.TestCase):
  def test_status_code_410(self):
    error = GoneError("gone")
    self.assertEqual(error.status_code, status.HTTP_410_GONE)


class TestNotFoundError(unittest.TestCase):
  def test_status_code_404(self):
    error = NotFoundError("not found")
    self.assertEqual(error.status_code, status.HTTP_404_NOT_FOUND)


class TestStorageError(unittest.TestCase):
  def test_status_code_502(self):
    error = StorageError("storage failed")
    self.assertEqual(error.status_code, status.HTTP_502_BAD_GATEWAY)


class TestFileTooLargeError(unittest.TestCase):
  def test_status_code_413(self):
    error = FileTooLargeError("too large")
    self.assertEqual(error.status_code, status.HTTP_413_CONTENT_TOO_LARGE)


class TestUnsupportedFileTypeError(unittest.TestCase):
  def test_status_code_415(self):
    error = UnsupportedFileTypeError("unsupported")
    self.assertEqual(error.status_code, status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)


class TestForbiddenError(unittest.TestCase):
  def test_status_code_403(self):
    error = ForbiddenError("forbidden")
    self.assertEqual(error.status_code, status.HTTP_403_FORBIDDEN)


if __name__ == "__main__":
  unittest.main()
