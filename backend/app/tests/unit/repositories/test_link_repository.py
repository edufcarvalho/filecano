import unittest
from datetime import datetime, timedelta, timezone

from app.models import Link
from app.repositories import LinkRepository
from app.tests.unit.helpers import DatabaseTestCase, get_test_settings
from app.utils.time import current_datetime


class TestLinkRepository(DatabaseTestCase):
  def setUp(self):
    super().setUp()
    self.repo = LinkRepository(self.session, get_test_settings())
    self.user = self._create_user(email="linkrepo@test.com")

  def test_get_by_token_finds_by_token(self):
    """get_by_token should find link by its token."""
    link = self._create_link(self.user.id, token="mytoken123")
    result = self.repo.get_by_token("mytoken123")
    self.assertIsNotNone(result, "should find link by token")
    self.assertEqual(result.id, link.id, "link id should match")

  def test_get_by_token_finds_by_custom_name(self):
    """get_by_token should find link by custom_name."""
    link = self._create_link(self.user.id, token="tok", custom_name="my-custom-link")
    result = self.repo.get_by_token("my-custom-link")
    self.assertIsNotNone(result, "should find link by custom_name")
    self.assertEqual(result.id, link.id, "link id should match")

  def test_get_by_token_returns_none_for_unknown(self):
    """get_by_token should return None for unknown token."""
    result = self.repo.get_by_token("nonexistent")
    self.assertIsNone(result, "should return None for unknown token")

  def test_list_by_user_id(self):
    """list_by_user_id should return non-deleted links for a user."""
    self._create_link(self.user.id, token="tok1")
    self._create_link(self.user.id, token="tok2")
    result = self.repo.list_by_user_id(self.user.id)
    self.assertEqual(len(result), 2, "should return both links")

  def test_list_by_user_id_excludes_deleted(self):
    """list_by_user_id should exclude soft-deleted links."""
    link = self._create_link(self.user.id, token="tok_deleted")
    link.deleted_at = link.created_at
    self.session.add(link)
    self.session.commit()
    result = self.repo.list_by_user_id(self.user.id)
    self.assertEqual(result, [], "should exclude deleted links")

  def test_list_by_user_id_orders_by_expires_at_desc(self):
    """list_by_user_id should order links by expires_at descending."""
    l1 = self._create_link(self.user.id, token="tok_a")
    l2 = self._create_link(self.user.id, token="tok_b")
    l1.expires_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
    l2.expires_at = datetime(2030, 1, 1, tzinfo=timezone.utc)
    self.session.add(l1)
    self.session.add(l2)
    self.session.commit()
    result = self.repo.list_by_user_id(self.user.id)
    self.assertGreater(
      result[0].expires_at,
      result[1].expires_at,
      "links should be ordered by expires_at descending",
    )

  def test_update(self):
    """update should save link changes."""
    link = self._create_link(self.user.id, token="tok_to_update")
    link.custom_name = "updated-name"
    updated = self.repo.update(link)
    self.assertEqual(
      updated.custom_name, "updated-name", "custom_name should be updated"
    )
    retrieved = self.repo.get_by_token("tok_to_update")
    self.assertEqual(
      retrieved.custom_name, "updated-name", "change should persist in database"
    )

  def test_delete(self):
    """delete should hard-delete the link."""
    link = self._create_link(self.user.id, token="tok_to_delete")
    link_id = link.id
    self.repo.delete(link)
    result = self.session.get(Link, link_id)
    self.assertIsNone(result, "link should be hard-deleted")

  def test_delete_not_retainable_deletes_old_expired_links(self):
    """delete_not_retainable should delete links past the retention period."""
    old = self._create_link(self.user.id, token="old-link-tok")
    old.expires_at = current_datetime() - timedelta(days=100)
    self.session.add(old)
    self.session.commit()

    recent = self._create_link(self.user.id, token="recent-link-tok")
    recent.expires_at = current_datetime() - timedelta(days=1)
    self.session.add(recent)
    self.session.commit()

    self.repo.delete_not_retainable()

    self.assertIsNone(self.session.get(Link, old.id), "old link should be deleted")
    self.assertIsNotNone(self.session.get(Link, recent.id), "recent link should remain")


if __name__ == "__main__":
  unittest.main()
