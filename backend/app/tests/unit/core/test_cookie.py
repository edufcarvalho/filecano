import unittest
from unittest.mock import MagicMock, patch

from app.core.cookie import (
  clear_auth_cookie,
  clear_token_cookie,
  set_auth_cookie,
  set_token_cookie,
)


class TestSetAuthCookie(unittest.TestCase):
  def test_set_auth_cookie_calls_set_cookie(self):
    response = MagicMock()
    set_auth_cookie(
      response=response,
      token="test-token",
      cookie_name="auth",
      max_age=3600,
      secure=False,
      same_site="lax",
    )
    response.set_cookie.assert_called_once_with(
      key="auth",
      value="test-token",
      max_age=3600,
      httponly=True,
      secure=False,
      samesite="lax",
      path="/",
    )


class TestClearAuthCookie(unittest.TestCase):
  def test_clear_auth_cookie_calls_delete_cookie(self):
    response = MagicMock()
    clear_auth_cookie(
      response=response,
      cookie_name="auth",
      secure=True,
      same_site="strict",
    )
    response.delete_cookie.assert_called_once_with(
      key="auth",
      path="/",
      secure=True,
      httponly=True,
      samesite="strict",
    )


class TestSetTokenCookie(unittest.TestCase):
  def test_set_token_cookie_reads_settings_and_delegates(self):
    response = MagicMock()
    with patch("app.core.cookie.get_settings") as mock_get_settings:
      mock_get_settings.return_value.auth_cookie_name = "token"
      mock_get_settings.return_value.auth_cookie_max_age = 7200
      mock_get_settings.return_value.auth_cookie_secure = True
      mock_get_settings.return_value.auth_cookie_same_site = "strict"

      set_token_cookie(response, "my-access-token")

    response.set_cookie.assert_called_once_with(
      key="token",
      value="my-access-token",
      max_age=7200,
      httponly=True,
      secure=True,
      samesite="strict",
      path="/",
    )


class TestClearTokenCookie(unittest.TestCase):
  def test_clear_token_cookie_reads_settings_and_delegates(self):
    response = MagicMock()
    with patch("app.core.cookie.get_settings") as mock_get_settings:
      mock_get_settings.return_value.auth_cookie_name = "token"
      mock_get_settings.return_value.auth_cookie_secure = True
      mock_get_settings.return_value.auth_cookie_same_site = "strict"

      clear_token_cookie(response)

    response.delete_cookie.assert_called_once_with(
      key="token",
      path="/",
      secure=True,
      httponly=True,
      samesite="strict",
    )


if __name__ == "__main__":
  unittest.main()
