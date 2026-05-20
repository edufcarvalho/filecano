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
from app.tests.unit.helpers import get_test_settings


class TestAuthDependencies(unittest.TestCase):
  def setUp(self):
    self.mock_auth = MagicMock()
    self.user = MagicMock()

  def test_raise_unauthorized_raises_authentication_error(self):
    """_raise_unauthorized should raise AuthenticationError."""
    with self.assertRaises(AuthenticationError) as ctx:
      _raise_unauthorized("test message")
    self.assertEqual(ctx.exception.detail, "test message")

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
    ) as ctx:
      get_current_user(credentials=None, auth_service=self.mock_auth)
    self.assertEqual(ctx.exception.detail, "Authorization header is required")
    self.mock_auth.authenticate_token.assert_not_called()

  def test_get_current_user_catches_authentication_error_from_service(self):
    """get_current_user should raise new AuthenticationError when service raises."""
    self.mock_auth.authenticate_token.side_effect = AuthenticationError("bad token")
    mock_cred = MagicMock()
    mock_cred.credentials = "bad.token.value"

    with self.assertRaises(
      AuthenticationError, msg="should raise AuthenticationError from service"
    ) as ctx:
      get_current_user(credentials=mock_cred, auth_service=self.mock_auth)
    self.assertIn("bad token", ctx.exception.detail)
    self.mock_auth.authenticate_token.assert_called_once_with("bad.token.value")


class TestDIProviderFunctions(unittest.TestCase):
  def setUp(self):
    self.mock_session = MagicMock()
    self.settings = get_test_settings()

  def test_get_file_repository_returns_file_repository(self):
    from app.repositories import FileRepository

    result = get_file_repository(session=self.mock_session, settings=self.settings)
    self.assertIsInstance(result, FileRepository, "should return a FileRepository")
    self.assertIs(result.session, self.mock_session)

  def test_get_folder_repository_returns_folder_repository(self):
    from app.repositories import FolderRepository

    result = get_folder_repository(session=self.mock_session, settings=self.settings)
    self.assertIsInstance(result, FolderRepository, "should return a FolderRepository")
    self.assertIs(result.session, self.mock_session)

  def test_get_link_repository_returns_link_repository(self):
    from app.repositories import LinkRepository

    result = get_link_repository(session=self.mock_session, settings=self.settings)
    self.assertIsInstance(result, LinkRepository, "should return a LinkRepository")
    self.assertIs(result.session, self.mock_session)

  def test_get_user_repository_returns_user_repository(self):
    from app.repositories import UserRepository

    result = get_user_repository(session=self.mock_session, settings=self.settings)
    self.assertIsInstance(result, UserRepository, "should return a UserRepository")
    self.assertIs(result.session, self.mock_session)

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
    from fastapi.exceptions import RequestValidationError
    from sqlalchemy.exc import IntegrityError

    from app.core import AppError

    self.assertEqual(
      [call.args[0] for call in app.add_exception_handler.call_args_list],
      [AppError, IntegrityError, RequestValidationError],
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
    mock_json.assert_called_once_with(
      status_code=404,
      content={"message": "Not found", "path": "/test"},
      headers=None,
    )

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
    call_args = mock_json.call_args.kwargs
    self.assertEqual(call_args["status_code"], 422)
    self.assertEqual(call_args["content"]["path"], "/test")
    self.assertIn("message", call_args["content"])

  def test_integrity_error_handler_returns_json_response(self):
    """integrity_error_handler should return a JSONResponse with 409."""
    from fastapi import Request
    from sqlalchemy.exc import IntegrityError

    from app.api.dependencies.exception_handling import integrity_error_handler

    mock_request = MagicMock(spec=Request)
    mock_request.url.path = "/test"
    error = IntegrityError("mock", None, None)

    with patch("app.api.dependencies.exception_handling.JSONResponse") as mock_json:
      integrity_error_handler(mock_request, error)
    mock_json.assert_called_once()

    call_args = mock_json.call_args.kwargs
    self.assertEqual(call_args["status_code"], 409)
    self.assertEqual(
      call_args["content"],
      {"message": "Resource is causing conflicts", "path": "/test"},
    )


if __name__ == "__main__":
  unittest.main()
