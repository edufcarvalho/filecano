import unittest
from uuid import uuid4

from app.core import ForbiddenError
from app.services.base_service import BaseService


class TestBaseService(unittest.TestCase):
  def setUp(self):
    self.service = BaseService()

  def test_ensure_user_has_rights_same_user(self):
    """_ensure_user_has_rights should not raise when user IDs match."""
    user_id = uuid4()
    try:
      self.service._ensure_user_has_rights(user_id, user_id)
    except ForbiddenError:
      self.fail("_ensure_user_has_rights should not raise when IDs match")

  def test_ensure_user_has_rights_different_user(self):
    """_ensure_user_has_rights should raise ForbiddenError when IDs differ."""
    user_id = uuid4()
    other_id = uuid4()
    with self.assertRaises(
      ForbiddenError, msg="should raise ForbiddenError when user IDs differ"
    ):
      self.service._ensure_user_has_rights(user_id, other_id)

  def test_forbidden_error_message(self):
    """ForbiddenError should have a descriptive message."""
    user_id = uuid4()
    other_id = uuid4()
    with self.assertRaises(ForbiddenError) as ctx:
      self.service._ensure_user_has_rights(user_id, other_id)
    self.assertIn(
      "permission",
      str(ctx.exception.detail).lower(),
      "error message should mention permission",
    )


if __name__ == "__main__":
  unittest.main()
