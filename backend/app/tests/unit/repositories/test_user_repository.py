import unittest
from datetime import timedelta

from app.models import User
from app.repositories import UserRepository
from app.tests.unit.helpers import DatabaseTestCase, get_test_settings
from app.utils.time import current_datetime


class TestUserRepository(DatabaseTestCase):
  def setUp(self):
    super().setUp()
    self.repo = UserRepository(self.session, get_test_settings())

  def test_get_by_email_returns_user(self):
    """get_by_email should return user when email matches."""
    user = self._create_user(name="Test", email="repo@test.com")
    result = self.repo.get_by_email("repo@test.com")
    self.assertIsNotNone(result, "get_by_email should find existing user")
    self.assertEqual(result.id, user.id, "returned user id should match")
    self.assertEqual(result.name, "Test", "returned user name should match")

  def test_get_by_email_returns_none_for_unknown(self):
    """get_by_email should return None when email does not exist."""
    result = self.repo.get_by_email("unknown@test.com")
    self.assertIsNone(result, "get_by_email should return None for unknown email")

  def test_get_by_email_is_case_sensitive(self):
    """get_by_email should be case-sensitive (or insensitive, depending on DB collation)."""
    self._create_user(name="Test", email="case@test.com")
    result = self.repo.get_by_email("CASE@TEST.COM")
    self.assertIsNone(result, "get_by_email should be case-sensitive by default")

  def test_get_by_email_with_special_characters(self):
    """get_by_email should handle emails with special characters."""
    email = "user+tag@test.com"
    self._create_user(name="Test", email=email)
    result = self.repo.get_by_email(email)
    self.assertIsNotNone(result, "get_by_email should find emails with special chars")
    self.assertEqual(result.email, email, "email should match exactly")

  def test_get_by_id_returns_user(self):
    """get_by_id should return user when ID matches."""
    user = self._create_user(name="Test", email="id@test.com")
    result = self.repo.get_by_id(user.id)
    self.assertIsNotNone(result, "get_by_id should find existing user")
    self.assertEqual(result.email, "id@test.com", "email should match")

  def test_multiple_users_same_email_raises(self):
    """Adding two users with same email should raise IntegrityError."""
    self._create_user(name="First", email="dup@test.com")
    from sqlalchemy.exc import IntegrityError

    with self.assertRaises(
      IntegrityError, msg="duplicate email should raise IntegrityError"
    ):
      self._create_user(name="Second", email="dup@test.com")

  def test_delete_not_retainable_deletes_old_deleted_users(self):
    """delete_not_retainable should delete users past the retention period."""
    old = self._create_user(name="Old", email="old@test.com")
    old.deleted_at = current_datetime() - timedelta(days=100)
    self.session.add(old)
    self.session.commit()

    recent = self._create_user(name="Recent", email="recent@test.com")
    recent.deleted_at = current_datetime() - timedelta(days=1)
    self.session.add(recent)
    self.session.commit()

    self.repo.delete_not_retainable()

    self.assertIsNone(self.session.get(User, old.id), "old user should be deleted")
    self.assertIsNotNone(self.session.get(User, recent.id), "recent user should remain")


if __name__ == "__main__":
  unittest.main()
