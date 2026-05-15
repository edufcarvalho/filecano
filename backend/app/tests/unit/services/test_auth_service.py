import unittest
from unittest.mock import MagicMock
from uuid import uuid4

from app.core import AuthenticationError
from app.core.config import Settings
from app.services.auth_service import AuthService


class TestAuthService(unittest.TestCase):
  def setUp(self):
    self.mock_repo = MagicMock()
    self.settings = Settings(
      jwt_secret_key="test-secret",
      access_token_expire_seconds=3600,
      access_token_refresh_grace_seconds=86400,
    )
    self.service = AuthService(self.mock_repo, self.settings)

  def test_login_user_success(self):
    """login_user should return token for valid credentials."""
    from app.core import hash_password
    from app.models import User

    user = User(
      name="Test",
      email="login@test.com",
      hashed_password=hash_password("SecureP@ss1"),
    )
    self.mock_repo.get_by_email.return_value = user

    result = self.service.login_user(
      MagicMock(email="login@test.com", password="SecureP@ss1")
    )
    self.assertIn("access_token", result, "login_user should return access_token")
    self.assertEqual(result["token_type"], "bearer", "token_type should be 'bearer'")
    self.assertEqual(result["expires_in"], 3600, "expires_in should match settings")

  def test_login_user_invalid_email(self):
    """login_user should raise AuthenticationError for unknown email."""
    self.mock_repo.get_by_email.return_value = None
    with self.assertRaises(
      AuthenticationError, msg="unknown email should raise AuthenticationError"
    ):
      self.service.login_user(
        MagicMock(email="unknown@test.com", password="SecureP@ss1")
      )

  def test_login_user_wrong_password(self):
    """login_user should raise AuthenticationError for wrong password."""
    from app.core import hash_password
    from app.models import User

    user = User(
      name="Test",
      email="login@test.com",
      hashed_password=hash_password("CorrectP@ss1"),
    )
    self.mock_repo.get_by_email.return_value = user

    with self.assertRaises(
      AuthenticationError, msg="wrong password should raise AuthenticationError"
    ):
      self.service.login_user(MagicMock(email="login@test.com", password="WrongP@ss1"))

  def test_authenticate_token_success(self):
    """authenticate_token should return User for valid token."""
    from app.models import User

    token = self.service._create_user_access_token(
      User(name="T", email="t@t.com", hashed_password="h")
    )
    user = User(
      id=uuid4(),
      name="T",
      email="t@t.com",
      hashed_password="h",
    )
    self.mock_repo.get_by_id.return_value = user

    result = self.service.authenticate_token(token)
    self.assertIsNotNone(result, "authenticate_token should return a User")

  def test_authenticate_token_invalid(self):
    """authenticate_token should raise AuthenticationError for invalid token."""
    with self.assertRaises(
      AuthenticationError, msg="invalid token should raise AuthenticationError"
    ):
      self.service.authenticate_token("invalid.token.here")

  def test_authenticate_token_expired(self):
    """authenticate_token should raise AuthenticationError for expired token."""
    from app.core import create_token

    expired = create_token(
      {"sub": str(uuid4()), "name": "T", "email": "t@t.com"},
      self.settings.jwt_secret_key,
      -1,
    )
    with self.assertRaises(
      AuthenticationError, msg="expired token should raise AuthenticationError"
    ):
      self.service.authenticate_token(expired)

  def test_refresh_token_success(self):
    """refresh_token should return new token for valid expired token."""
    from app.models import User

    token = self.service._create_user_access_token(
      User(name="T", email="t@t.com", hashed_password="h")
    )
    user = User(
      id=uuid4(),
      name="T",
      email="t@t.com",
      hashed_password="h",
    )
    self.mock_repo.get_by_id.return_value = user

    result = self.service.refresh_token(token)
    self.assertIn("access_token", result, "refresh_token should return access_token")
    self.assertNotEqual(
      result["access_token"], token, "new token should differ from old token"
    )

  def test_refresh_token_outside_grace_period(self):
    """refresh_token should raise AuthenticationError outside grace period."""
    from app.core import create_token

    self.settings.access_token_refresh_grace_seconds = 1
    old_token = create_token(
      {"sub": str(uuid4()), "name": "T", "email": "t@t.com"},
      self.settings.jwt_secret_key,
      -3600,
    )
    with self.assertRaises(
      AuthenticationError, msg="token outside grace period should raise"
    ):
      self.service.refresh_token(old_token)

  def test_refresh_token_with_non_integer_exp(self):
    """refresh_token should raise AuthenticationError when exp is not an integer."""
    self.service._decode_token = MagicMock(
      return_value={
        "sub": str(uuid4()),
        "name": "T",
        "email": "t@t.com",
        "exp": "not-int",
      }
    )
    with self.assertRaises(
      AuthenticationError, msg="non-integer exp should raise AuthenticationError"
    ):
      self.service.refresh_token("some.token.here")

  def test_get_authenticated_user_found(self):
    """get_authenticated_user should return user when found."""
    from app.models import User

    uid = uuid4()
    user = User(id=uid, name="T", email="t@t.com", hashed_password="h")
    self.mock_repo.get_by_id.return_value = user
    result = self.service.get_authenticated_user(uid)
    self.assertEqual(result.id, uid, "returned user id should match")

  def test_get_authenticated_user_not_found(self):
    """get_authenticated_user should raise AuthenticationError when not found."""
    self.mock_repo.get_by_id.return_value = None
    with self.assertRaises(
      AuthenticationError, msg="user not found should raise AuthenticationError"
    ):
      self.service.get_authenticated_user(uuid4())

  def test_decode_token_invalid_algorithm(self):
    """_decode_token should handle unsupported algorithm."""
    with self.assertRaises(
      AuthenticationError, msg="unsupported algorithm should raise AuthenticationError"
    ):
      self.service._decode_token("a.b.c")

  def test_get_token_subject_invalid_uuid(self):
    """_get_token_subject should raise for non-UUID subject."""
    with self.assertRaises(
      AuthenticationError, msg="non-UUID sub should raise AuthenticationError"
    ):
      self.service._get_token_subject({"sub": "not-a-uuid"})

  def test_get_token_subject_missing(self):
    """_get_token_subject should raise for missing sub claim."""
    with self.assertRaises(
      AuthenticationError, msg="missing sub should raise AuthenticationError"
    ):
      self.service._get_token_subject({})


if __name__ == "__main__":
  unittest.main()
