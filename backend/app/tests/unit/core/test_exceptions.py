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


class TestSpecializedErrors(unittest.TestCase):
  def test_status_codes(self):
    cases = (
      (PasswordValidationError, "weak password", status.HTTP_400_BAD_REQUEST),
      (BadRequestError, "bad", status.HTTP_400_BAD_REQUEST),
      (AuthenticationError, "unauthorized", status.HTTP_401_UNAUTHORIZED),
      (ConflictError, "conflict", status.HTTP_409_CONFLICT),
      (GoneError, "gone", status.HTTP_410_GONE),
      (NotFoundError, "not found", status.HTTP_404_NOT_FOUND),
      (StorageError, "storage failed", status.HTTP_502_BAD_GATEWAY),
      (FileTooLargeError, "too large", status.HTTP_413_CONTENT_TOO_LARGE),
      (
        UnsupportedFileTypeError,
        "unsupported",
        status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
      ),
      (ForbiddenError, "forbidden", status.HTTP_403_FORBIDDEN),
    )

    for error_cls, detail, expected_status in cases:
      with self.subTest(error_cls=error_cls.__name__):
        error = error_cls(detail)
        self.assertEqual(error.status_code, expected_status)
        self.assertEqual(error.detail, detail)


if __name__ == "__main__":
  unittest.main()
