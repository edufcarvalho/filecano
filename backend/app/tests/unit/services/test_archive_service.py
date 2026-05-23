import unittest
from datetime import timedelta
from io import BytesIO
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.core import NotFoundError, Settings, StorageError
from app.models import Archive, File
from app.repositories import ArchiveRepository, FileRepository, FolderRepository
from app.services.archive_service import ArchiveService
from app.services.file_storage_service import FileStorageService
from app.tests.unit.helpers import get_test_settings, make_s3_error
from app.utils.time import current_datetime


class TestArchiveService(unittest.TestCase):
  def setUp(self):
    self.settings = get_test_settings()

    self.mock_archive_repo = MagicMock(spec=ArchiveRepository)
    self.mock_file_repo = MagicMock(spec=FileRepository)
    self.mock_folder_repo = MagicMock(spec=FolderRepository)
    self.mock_storage = MagicMock(spec=FileStorageService)

    self.service = ArchiveService(
      self.mock_archive_repo,
      self.mock_file_repo,
      self.mock_folder_repo,
      self.mock_storage,
      self.settings,
    )

    self.user = MagicMock()
    self.user.id = uuid4()

  def _make_file(self, file_id=None, object_key="test/key", size=1024, name="test.txt"):
    f = MagicMock(spec=File)
    f.id = file_id or uuid4()
    f.object_key = object_key
    f.size_bytes = size
    f.original_name = name
    f.parent_id = None
    return f

  def test_compute_file_ids_hash_is_deterministic(self):
    from uuid import UUID

    ids = [UUID("00000000-0000-0000-0000-000000000001")]
    h1 = self.service._compute_file_ids_hash(ids)
    h2 = self.service._compute_file_ids_hash(ids)
    self.assertEqual(h1, h2)

  def test_compute_file_ids_hash_is_order_independent(self):
    from uuid import UUID

    a = UUID("00000000-0000-0000-0000-000000000001")
    b = UUID("00000000-0000-0000-0000-000000000002")
    h1 = self.service._compute_file_ids_hash([a, b])
    h2 = self.service._compute_file_ids_hash([b, a])
    self.assertNotEqual(h1, h2, "hash should differ for different sorted order")

  def test_get_or_create_archive_returns_existing(self):
    f1 = self._make_file(name="a.txt")
    f2 = self._make_file(name="b.txt")
    file_ids = sorted([f1.id, f2.id])
    file_hash = self.service._compute_file_ids_hash(file_ids)

    existing = MagicMock(spec=Archive)
    self.mock_archive_repo.get_by_file_ids_hash.return_value = existing
    self.mock_file_repo.list_by_multiple_ids_and_user.return_value = []

    result, created = self.service.get_or_create_archive(self.user, file_ids)

    self.assertFalse(created)
    self.mock_archive_repo.get_by_file_ids_hash.assert_called_once_with(
      self.user.id, file_hash
    )
    self.assertIsNotNone(existing.last_time_downloaded)

  def test_get_or_create_archive_creates_new(self):
    f1 = self._make_file(name="a.txt", size=500)
    f2 = self._make_file(name="b.txt", size=700)
    file_ids = sorted([f1.id, f2.id])
    file_hash = self.service._compute_file_ids_hash(file_ids)

    self.mock_archive_repo.get_by_file_ids_hash.return_value = None
    self.mock_file_repo.list_by_multiple_ids_and_user.return_value = [f1, f2]

    mock_response = MagicMock()
    mock_response.stream.return_value = [b"chunk1", b"chunk2"]
    self.mock_storage.download.return_value.__enter__.return_value = mock_response

    result, created = self.service.get_or_create_archive(self.user, file_ids)

    self.assertTrue(created)
    self.assertIsNotNone(result)
    self.mock_storage.upload.assert_called_once()
    self.mock_archive_repo.add.assert_called_once()
    self.mock_archive_repo.commit.assert_called()

  def test_get_or_create_archive_no_files_found(self):
    f1 = self._make_file(name="a.txt")
    file_ids = [f1.id]

    self.mock_archive_repo.get_by_file_ids_hash.return_value = None
    self.mock_file_repo.list_by_multiple_ids_and_user.return_value = []

    with self.assertRaises(NotFoundError):
      self.service.get_or_create_archive(self.user, file_ids)

  def test_get_or_create_archive_partial_files_with_existing_cache(self):
    f1 = self._make_file(name="a.txt")
    f2 = self._make_file(name="b.txt")
    f3 = self._make_file(name="c.txt")
    file_ids = sorted([f1.id, f2.id, f3.id])
    found_ids = sorted([f1.id, f2.id])
    found_hash = self.service._compute_file_ids_hash(found_ids)

    self.mock_archive_repo.get_by_file_ids_hash.side_effect = [
      None,
      MagicMock(spec=Archive),
    ]
    self.mock_file_repo.list_by_multiple_ids_and_user.return_value = [f1, f2]

    result, created = self.service.get_or_create_archive(self.user, file_ids)

    self.assertFalse(created)

  def test_get_or_create_folder_archive_creates_new(self):
    from unittest.mock import MagicMock as Mock

    folder = Mock()
    folder.id = uuid4()
    folder.name = "MyFolder"
    folder.parent_id = None
    folder.user_id = self.user.id

    self.mock_folder_repo.get_all_descendant_ids.return_value = []
    self.mock_folder_repo.list_by_multiple_ids_and_user.return_value = [folder]
    self.mock_archive_repo.get_by_file_ids_hash.return_value = None

    f1 = self._make_file(name="inside.txt", size=100)
    f1.parent_id = folder.id
    self.mock_file_repo.list_by_folder_ids.return_value = [f1]

    mock_response = MagicMock()
    mock_response.stream.return_value = [b"chunk"]
    self.mock_storage.download.return_value.__enter__.return_value = mock_response

    result, created = self.service.get_or_create_folder_archive(self.user, folder)

    self.assertTrue(created)
    self.assertIsNotNone(result)
    self.mock_storage.upload.assert_called_once()

  def test_get_or_create_folder_archive_returns_existing(self):
    from unittest.mock import MagicMock as Mock

    folder = Mock()
    folder.id = uuid4()

    self.mock_folder_repo.get_all_descendant_ids.return_value = []
    self.mock_folder_repo.list_by_multiple_ids_and_user.return_value = [folder]

    f1 = self._make_file(name="f.txt")
    f1.parent_id = folder.id
    self.mock_file_repo.list_by_folder_ids.return_value = [f1]

    existing = MagicMock(spec=Archive)
    self.mock_archive_repo.get_by_file_ids_hash.return_value = existing

    result, created = self.service.get_or_create_folder_archive(self.user, folder)

    self.assertFalse(created)

  def test_get_or_create_folder_archive_empty_folder(self):
    from unittest.mock import MagicMock as Mock

    folder = Mock()
    folder.id = uuid4()

    self.mock_folder_repo.get_all_descendant_ids.return_value = []
    self.mock_folder_repo.list_by_multiple_ids_and_user.return_value = [folder]
    self.mock_file_repo.list_by_folder_ids.return_value = []
    self.mock_archive_repo.get_by_file_ids_hash.return_value = None

    with self.assertRaises(NotFoundError):
      self.service.get_or_create_folder_archive(self.user, folder)

  def test_enforce_retention_policy_deletes_expired(self):
    a1 = MagicMock(spec=Archive)
    a2 = MagicMock(spec=Archive)
    self.mock_archive_repo.list_not_retainable.return_value = [a1, a2]

    self.service.enforce_retention_policy()

    self.assertEqual(self.mock_storage.delete_all_versions.call_count, 2)
    self.assertEqual(self.mock_archive_repo.hard_delete.call_count, 2)
    self.mock_archive_repo.commit.assert_called_once()

  def test_enforce_retention_policy_no_expired(self):
    self.mock_archive_repo.list_not_retainable.return_value = []

    self.service.enforce_retention_policy()

    self.mock_storage.delete_all_versions.assert_not_called()
    self.mock_archive_repo.hard_delete.assert_not_called()
    self.mock_archive_repo.commit.assert_called_once()

  def test_get_archive_download(self):
    archive = MagicMock(spec=Archive)
    archive.object_key = "test/key"
    mock_response = MagicMock()
    self.mock_storage.download.return_value = mock_response

    result = self.service.get_archive_download(archive)

    self.mock_storage.download.assert_called_once_with("test/key")
    self.assertEqual(result, mock_response)

  def test_stream_response(self):
    mock_response = MagicMock()
    self.mock_storage.iter_response.return_value = iter([b"x"])

    result = list(self.service.stream_response(mock_response))
    self.assertEqual(result, [b"x"])

  def test_create_archive_skips_storage_errors(self):
    f1 = self._make_file(name="a.txt", size=500)
    f2 = self._make_file(name="b.txt", size=700)
    file_ids = sorted([f1.id, f2.id])
    file_hash = self.service._compute_file_ids_hash(file_ids)
    name_map = {f1.id: (f1, "a.txt"), f2.id: (f2, "b.txt")}

    mock_ok = MagicMock()
    mock_ok.stream.return_value = [b"data"]
    mock_ok.__enter__.return_value = mock_ok

    mock_bad = MagicMock()
    mock_bad.__enter__.side_effect = StorageError("download failed")

    self.mock_storage.download.side_effect = [mock_ok, mock_bad]

    archive = self.service._create_archive(self.user, file_ids, file_hash, name_map)
    self.assertIsNotNone(archive)
    self.assertEqual(archive.file_count, 2)
    self.mock_storage.upload.assert_called_once()

  def test_get_or_create_folder_archive_folder_not_in_db(self):
    from unittest.mock import MagicMock as Mock

    folder = Mock()
    folder.id = uuid4()
    folder.name = "GhostFolder"
    folder.parent_id = None
    folder.user_id = self.user.id

    self.mock_folder_repo.get_all_descendant_ids.return_value = []
    self.mock_folder_repo.list_by_multiple_ids_and_user.return_value = []
    self.mock_archive_repo.get_by_file_ids_hash.return_value = None

    f1 = self._make_file(name="f.txt", size=100)
    f1.parent_id = folder.id
    self.mock_file_repo.list_by_folder_ids.return_value = [f1]

    mock_response = MagicMock()
    mock_response.stream.return_value = [b"chunk"]
    self.mock_storage.download.return_value.__enter__.return_value = mock_response

    result, created = self.service.get_or_create_folder_archive(self.user, folder)
    self.assertTrue(created)

  def test_delete_archive_permanently(self):
    archive = MagicMock(spec=Archive)
    archive.object_key = "test/key"

    self.service._delete_archive_permanently(archive)

    self.mock_storage.delete_all_versions.assert_called_once_with("test/key")
    self.mock_archive_repo.hard_delete.assert_called_once_with(archive)
    self.mock_archive_repo.commit.assert_called_once()
