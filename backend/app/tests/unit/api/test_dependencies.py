import unittest
from unittest.mock import MagicMock, patch

from fastapi import FastAPI

from app.api.dependencies.auth import _raise_unauthorized, get_current_user
from app.api.dependencies.exception_handling import (
  app_error_handler,
  register_exception_handlers,
  request_validation_error_handler,
)
from app.api.dependencies.services import (
  get_file_repository,
  get_file_storage_service,
  get_folder_repository,
  get_link_repository,
  get_user_repository,
)
from app.core import AuthenticationError, Settings


class TestAuthDependencies(unittest.TestCase):
  def setUp(self):
    self.mock_auth = MagicMock()
    self.user = MagicMock()

  def test_raise_unauthorized_raises_authentication_error(self):
    """_raise_unauthorized should raise AuthenticationError."""
    with self.assertRaises(AuthenticationError, msg="should raise AuthenticationError"):
      _raise_unauthorized("test message")

  def test_raise_unauthorized_includes_headers(self):
    """_raise_unauthorized should include WWW-Authenticate headers."""
    with self.assertRaises(AuthenticationError) as ctx:
      _raise_unauthorized("test")
    self.assertIsNotNone(ctx.exception.headers, "headers should be set")
    self.assertIn(
      "WWW-Authenticate",
      ctx.exception.headers,
      "should include WWW-Authenticate header",
    )

  def test_get_current_user_without_credentials(self):
    """get_current_user should raise when no credentials are provided."""
    with self.assertRaises(
      AuthenticationError, msg="no credentials should raise AuthenticationError"
    ):
      get_current_user(credentials=None, auth_service=self.mock_auth)

  def test_get_current_user_catches_authentication_error_from_service(self):
    """get_current_user should raise new AuthenticationError when service raises."""
    self.mock_auth.authenticate_token.side_effect = AuthenticationError("bad token")
    mock_cred = MagicMock()
    mock_cred.credentials = "bad.token.value"

    with self.assertRaises(
      AuthenticationError, msg="should raise AuthenticationError from service"
    ):
      get_current_user(credentials=mock_cred, auth_service=self.mock_auth)


class TestDIProviderFunctions(unittest.TestCase):
  def setUp(self):
    self.mock_session = MagicMock()

  def test_get_file_repository_returns_file_repository(self):
    from app.repositories import FileRepository

    result = get_file_repository(session=self.mock_session)
    self.assertIsInstance(result, FileRepository, "should return a FileRepository")

  def test_get_folder_repository_returns_folder_repository(self):
    from app.repositories import FolderRepository

    result = get_folder_repository(session=self.mock_session)
    self.assertIsInstance(result, FolderRepository, "should return a FolderRepository")

  def test_get_link_repository_returns_link_repository(self):
    from app.repositories import LinkRepository

    result = get_link_repository(session=self.mock_session)
    self.assertIsInstance(result, LinkRepository, "should return a LinkRepository")

  def test_get_user_repository_returns_user_repository(self):
    from app.repositories import UserRepository

    result = get_user_repository(session=self.mock_session)
    self.assertIsInstance(result, UserRepository, "should return a UserRepository")

  def test_get_file_storage_service_returns_storage_service(self):
    from app.services import FileStorageService

    settings = Settings(jwt_secret_key="test-key")
    result = get_file_storage_service(settings=settings)
    self.assertIsInstance(
      result, FileStorageService, "should return a FileStorageService"
    )
    self.assertEqual(
      type(result).__name__, "FileStorageService", "should be the right type"
    )


class TestExceptionHandlers(unittest.TestCase):
  def test_register_exception_handlers(self):
    """register_exception_handlers should register handlers on the app."""
    app = MagicMock(spec=FastAPI)
    register_exception_handlers(app)
    self.assertEqual(
      app.add_exception_handler.call_count, 3, "should register 3 exception handlers"
    )

  def test_app_error_handler_returns_json_response(self):
    """app_error_handler should return a JSONResponse."""
    from fastapi import Request

    from app.core import NotFoundError

    mock_request = MagicMock(spec=Request)
    mock_request.url.path = "/test"
    error = NotFoundError("Not found")

    with patch("app.api.dependencies.exception_handling.JSONResponse") as mock_json:
      app_error_handler(mock_request, error)
      mock_json.assert_called_once()

  def test_request_validation_error_handler_returns_json_response(self):
    """request_validation_error_handler should return a JSONResponse."""
    from fastapi import Request
    from fastapi.exceptions import RequestValidationError

    mock_request = MagicMock(spec=Request)
    mock_request.url.path = "/test"
    error = RequestValidationError(errors=[])

    with patch("app.api.dependencies.exception_handling.JSONResponse") as mock_json:
      request_validation_error_handler(mock_request, error)
      mock_json.assert_called_once()


if __name__ == "__main__":
  unittest.main()
