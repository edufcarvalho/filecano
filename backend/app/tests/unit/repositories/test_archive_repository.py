from datetime import timedelta

from app.models import Archive
from app.repositories import ArchiveRepository
from app.tests.unit.helpers import DatabaseTestCase, get_test_settings
from app.utils.time import current_datetime


class TestArchiveRepository(DatabaseTestCase):
  def setUp(self):
    super().setUp()
    self.repo = ArchiveRepository(self.session, get_test_settings())
    self.user = self._create_user(email="archiverepo@test.com")

  def _create_archive(self, user_id, *, file_ids_hash="abc123", last_downloaded=None):
    archive = Archive(
      user_id=user_id,
      object_key=f"users/{user_id}/archives/{file_ids_hash}.zip",
      file_ids_hash=file_ids_hash,
      file_count=3,
      original_size_bytes=3000,
      compressed_size_bytes=1500,
      last_time_downloaded=last_downloaded or current_datetime(),
    )
    self.session.add(archive)
    self.session.commit()
    self.session.refresh(archive)
    return archive

  def test_get_by_file_ids_hash_returns_matching_archive(self):
    a = self._create_archive(self.user.id, file_ids_hash="hash1")

    result = self.repo.get_by_file_ids_hash(self.user.id, "hash1")
    self.assertIsNotNone(result)
    self.assertEqual(result.id, a.id)

  def test_get_by_file_ids_hash_returns_none_for_wrong_hash(self):
    self._create_archive(self.user.id, file_ids_hash="hash1")

    result = self.repo.get_by_file_ids_hash(self.user.id, "hash2")
    self.assertIsNone(result)

  def test_get_by_file_ids_hash_returns_none_for_wrong_user(self):
    self._create_archive(self.user.id, file_ids_hash="hash1")
    other = self._create_user(email="other@test.com")

    result = self.repo.get_by_file_ids_hash(other.id, "hash1")
    self.assertIsNone(result)

  def test_list_not_retainable_returns_expired_archives(self):
    settings = get_test_settings()
    past = current_datetime() - timedelta(
      days=settings.archive_retention_policy + 1
    )
    a = self._create_archive(self.user.id, file_ids_hash="old", last_downloaded=past)

    result = self.repo.list_not_retainable()
    self.assertEqual(len(result), 1)
    self.assertEqual(result[0].id, a.id)

  def test_list_not_retainable_excludes_recent_archives(self):
    self._create_archive(self.user.id, file_ids_hash="recent")

    result = self.repo.list_not_retainable()
    self.assertEqual(result, [])

  def test_list_not_retainable_excludes_boundary(self):
    settings = get_test_settings()
    boundary = current_datetime() - timedelta(
      days=settings.archive_retention_policy - 1
    )
    self._create_archive(
      self.user.id, file_ids_hash="boundary", last_downloaded=boundary
    )

    result = self.repo.list_not_retainable()
    self.assertEqual(result, [])

  def test_add_and_get(self):
    archive = Archive(
      user_id=self.user.id,
      object_key="users/uid/archives/test.zip",
      file_ids_hash="xyz",
      file_count=1,
      original_size_bytes=100,
      compressed_size_bytes=50,
    )
    self.repo.add(archive)
    self.repo.commit()

    result = self.repo.get_by_id(archive.id)
    self.assertIsNotNone(result)
    self.assertEqual(result.file_ids_hash, "xyz")
