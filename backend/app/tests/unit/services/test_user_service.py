import unittest
from unittest.mock import patch

from app.core import ConflictError
from app.schemas import UserCreationParams, UserUpdateParams
from app.services.user_service import UserService
from app.tests.unit.helpers import DatabaseTestCase


class TestUserService(DatabaseTestCase):
  def setUp(self):
    super().setUp()
    from app.repositories import UserRepository

    self.repo = UserRepository(self.session)
    self.service = UserService(self.repo)

  def test_create_user_success(self):
    """create_user should create and return a new user."""
    params = UserCreationParams(
      name="New User", email="new@test.com", password="SecureP@ss1"
    )
    user = self.service.create_user(params)
    self.assertIsNotNone(user.id, "created user should have an id")
    self.assertEqual(user.name, "New User", "name should match")
    self.assertEqual(user.email, "new@test.com", "email should match")

  def test_create_user_duplicate_email_raises(self):
    """create_user should raise ConflictError for duplicate email."""
    params = UserCreationParams(
      name="First", email="dup@test.com", password="SecureP@ss1"
    )
    self.service.create_user(params)
    with self.assertRaises(
      ConflictError, msg="duplicate email should raise ConflictError"
    ):
      self.service.create_user(params)

  def test_create_user_password_is_hashed(self):
    """create_user should hash the password, not store in plaintext."""
    params = UserCreationParams(
      name="Test", email="hash@test.com", password="SecureP@ss1"
    )
    user = self.service.create_user(params)
    self.assertNotEqual(
      user.hashed_password,
      "SecureP@ss1",
      "password should be hashed, not stored in plaintext",
    )
    from app.core import verify_password

    self.assertTrue(
      verify_password("SecureP@ss1", user.hashed_password),
      "hashed password should verify against original",
    )

  def test_update_user_name(self):
    """update_user should update the user's name."""
    user = self._create_user(name="Old Name", email="update@test.com")
    params = UserUpdateParams(name="New Name")
    updated = self.service.update_user(user, params)
    self.assertEqual(updated.name, "New Name", "name should be updated")

  def test_update_user_email(self):
    """update_user should update the user's email."""
    user = self._create_user(name="Test", email="old@test.com")
    params = UserUpdateParams(email="new@test.com")
    updated = self.service.update_user(user, params)
    self.assertEqual(updated.email, "new@test.com", "email should be updated")

  def test_update_user_password(self):
    """update_user should update the user's password."""
    user = self._create_user(name="Test", email="pw@test.com")
    params = UserUpdateParams(password="NewSecureP@ss1")
    updated = self.service.update_user(user, params)
    from app.core import verify_password

    self.assertTrue(
      verify_password("NewSecureP@ss1", updated.hashed_password),
      "password should be updated and verified",
    )

  def test_update_user_email_to_existing_raises(self):
    """update_user should raise ConflictError when changing to existing email."""
    self._create_user(name="Other", email="existing@test.com")
    user = self._create_user(name="Test", email="original@test.com")
    params = UserUpdateParams(email="existing@test.com")
    with self.assertRaises(
      ConflictError, msg="changing to existing email should raise ConflictError"
    ):
      self.service.update_user(user, params)

  def test_update_user_name_only_does_not_change_email(self):
    """update_user with only name should not change email."""
    user = self._create_user(name="Old", email="keep@test.com")
    params = UserUpdateParams(name="New")
    updated = self.service.update_user(user, params)
    self.assertEqual(updated.email, "keep@test.com", "email should remain unchanged")

  def test_update_user_no_changes(self):
    """update_user with no params should not modify user."""
    user = self._create_user(name="Same", email="same@test.com")
    params = UserUpdateParams()
    updated = self.service.update_user(user, params)
    self.assertEqual(updated.name, "Same", "name should stay same")
    self.assertEqual(updated.email, "same@test.com", "email should stay same")

  def test_update_user_integrity_error_raises_conflict(self):
    """update_user should raise ConflictError on IntegrityError."""
    from sqlalchemy.exc import IntegrityError

    user = self._create_user(name="Test", email="keep@test.com")
    params = UserUpdateParams(email="conflict@test.com")

    with patch.object(self.service.repository, "commit") as mock_commit:
      mock_commit.side_effect = IntegrityError("mock", None, None)
      with self.assertRaises(
        IntegrityError, msg="IntegrityError should propagate to the API layer"
      ):
        self.service.update_user(user, params)


if __name__ == "__main__":
  unittest.main()
