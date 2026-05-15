import unittest
from unittest.mock import MagicMock

from app.services.file_storage_service import FileStorageService


def _make_s3error(code="Error", message="test error"):
  from minio.error import S3Error

  mock_response = MagicMock()
  mock_response.data = b""
  mock_response.status = 500
  mock_response.headers = {}
  return S3Error(
    response=mock_response,
    code=code,
    message=message,
    resource="test-resource",
    request_id="test-id",
    host_id="test-host",
    bucket_name="test-bucket",
    object_name="test-object",
  )


class TestFileStorageAdvanced(unittest.TestCase):
  """Additional tests for FileStorageService coverage gaps."""

  def setUp(self):
    from unittest.mock import patch

    from app.core import Settings

    self.settings = Settings(
      minio_endpoint="localhost:9000",
      minio_access_key="minioadmin",
      minio_secret_key="minioadmin",
      minio_bucket="filecano-test",
      minio_secure=False,
      jwt_secret_key="test-key",
    )
    self.patcher = patch("app.services.file_storage_service.Minio")
    self.mock_minio = self.patcher.start()
    self.minio_instance = MagicMock()
    self.mock_minio.return_value = self.minio_instance

    self.storage = FileStorageService(self.settings)

  def tearDown(self):
    self.patcher.stop()

  def test_restore_soft_deleted_removes_delete_marker(self):
    """restore_soft_deleted should remove the delete marker for a deleted object."""
    item = MagicMock()
    item.object_name = "test/key"
    item.is_latest = True
    item.is_delete_marker = True
    item.version_id = "v1"
    self.minio_instance.list_objects.return_value = [item]

    self.storage.restore_soft_deleted("test/key")
    self.minio_instance.remove_object.assert_called_once_with(
      "filecano-test", "test/key", version_id="v1"
    )

  def test_restore_soft_deleted_skips_non_delete_marker(self):
    """restore_soft_deleted should skip items that are not delete markers."""
    item = MagicMock()
    item.object_name = "test/key"
    item.is_latest = True
    item.is_delete_marker = False
    item.version_id = "v1"
    self.minio_instance.list_objects.return_value = [item]

    self.storage.restore_soft_deleted("test/key")
    self.minio_instance.remove_object.assert_not_called()

  def test_restore_soft_deleted_skips_non_latest(self):
    """restore_soft_deleted should skip non-latest versions."""
    item = MagicMock()
    item.object_name = "test/key"
    item.is_latest = False
    item.is_delete_marker = True
    item.version_id = "v1"
    self.minio_instance.list_objects.return_value = [item]

    self.storage.restore_soft_deleted("test/key")
    self.minio_instance.remove_object.assert_not_called()

  def test_restore_soft_deleted_skips_other_objects(self):
    """restore_soft_deleted should skip objects not matching the key."""
    item = MagicMock()
    item.object_name = "other/key"
    item.is_latest = True
    item.is_delete_marker = True
    item.version_id = "v1"
    self.minio_instance.list_objects.return_value = [item]

    self.storage.restore_soft_deleted("test/key")
    self.minio_instance.remove_object.assert_not_called()

  def test_restore_soft_deleted_is_latest_string_true(self):
    """restore_soft_deleted should handle is_latest as string 'true'."""
    item = MagicMock()
    item.object_name = "test/key"
    item.is_latest = "true"
    item.is_delete_marker = True
    item.version_id = "v1"
    self.minio_instance.list_objects.return_value = [item]

    self.storage.restore_soft_deleted("test/key")
    self.minio_instance.remove_object.assert_called_once()

  def test_restore_soft_deleted_no_such_key_returns(self):
    """restore_soft_deleted should return silently for NoSuchKey."""
    self.minio_instance.list_objects.side_effect = _make_s3error(code="NoSuchKey")
    try:
      self.storage.restore_soft_deleted("test/key")
    except Exception:
      self.fail("restore_soft_deleted should not raise for NoSuchKey")

  def test_restore_soft_deleted_s3error_raises_storage_error(self):
    """restore_soft_deleted should raise StorageError for generic S3Error."""
    from app.core import StorageError

    self.minio_instance.list_objects.side_effect = _make_s3error(code="ServerError")
    with self.assertRaises(StorageError, msg="S3Error should raise StorageError"):
      self.storage.restore_soft_deleted("test/key")

  def test_restore_soft_deleted_no_matching_object_returns(self):
    """restore_soft_deleted should return if no matching delete marker found."""
    item = MagicMock()
    item.object_name = "other/key"
    self.minio_instance.list_objects.return_value = [item]

    result = self.storage.restore_soft_deleted("test/key")
    self.assertIsNone(result)

  def test_delete_all_versions_no_such_key_returns(self):
    """delete_all_versions should return silently for NoSuchKey."""
    self.minio_instance.list_objects.side_effect = _make_s3error(code="NoSuchKey")
    try:
      self.storage.delete_all_versions("test/key")
    except Exception:
      self.fail("delete_all_versions should not raise for NoSuchKey")

  def test_delete_all_versions_s3error_raises_storage_error(self):
    """delete_all_versions should raise StorageError for generic S3Error."""
    from app.core import StorageError

    self.minio_instance.list_objects.side_effect = _make_s3error(code="ServerError")
    with self.assertRaises(StorageError, msg="S3Error should raise StorageError"):
      self.storage.delete_all_versions("test/key")

  def test_delete_all_versions_errors_from_remove_objects(self):
    """delete_all_versions should raise StorageError when remove_objects returns errors."""
    from minio.error import S3Error

    from app.core import StorageError

    item = MagicMock()
    item.object_name = "test/key"
    item.version_id = "v1"
    self.minio_instance.list_objects.return_value = [item]

    err_response = MagicMock()
    err_response.data = b""
    err_response.status = 500
    err_response.headers = {}
    s3_err = S3Error(
      response=err_response,
      code="InternalError",
      message="removal failed",
      resource="test-resource",
      request_id="test-id",
      host_id="test-host",
      bucket_name="test-bucket",
      object_name="test-object",
    )
    self.minio_instance.remove_objects.return_value = [s3_err]

    with self.assertRaises(
      StorageError, msg="remove_objects errors should raise StorageError"
    ):
      self.storage.delete_all_versions("test/key")

  def test_delete_all_versions_no_matching_items(self):
    """delete_all_versions should call remove_object when no matching items."""
    item = MagicMock()
    item.object_name = "other/key"
    item.version_id = "v1"
    self.minio_instance.list_objects.return_value = [item]

    self.storage.delete_all_versions("test/key")
    self.minio_instance.remove_object.assert_called_once_with(
      "filecano-test", "test/key"
    )

  def test_delete_all_versions_filters_by_object_name(self):
    """delete_all_versions should only delete versions of the target object."""
    matching = MagicMock()
    matching.object_name = "test/key"
    matching.version_id = "v1"
    non_matching = MagicMock()
    non_matching.object_name = "test/key/subkey"
    non_matching.version_id = "v2"
    self.minio_instance.list_objects.return_value = [matching, non_matching]
    self.minio_instance.remove_objects.return_value = []

    self.storage.delete_all_versions("test/key")
    call_args = self.minio_instance.remove_objects.call_args
    delete_list = call_args[0][1]
    self.assertEqual(len(delete_list), 1, "should only include matching object")
    self.assertEqual(delete_list[0].name, "test/key")

  def test_ensure_bucket_s3error_raises_storage_error(self):
    """_ensure_bucket should raise StorageError on S3Error."""
    from app.core import StorageError

    self.minio_instance.bucket_exists.side_effect = _make_s3error(code="ServerError")
    with self.assertRaises(
      StorageError, msg="S3Error in validate should raise StorageError"
    ):
      self.storage._ensure_bucket()

  def test_soft_delete_s3error_raises_storage_error(self):
    """soft_delete should raise StorageError for generic S3Error."""
    from app.core import StorageError

    self.minio_instance.remove_object.side_effect = _make_s3error(code="ServerError")
    with self.assertRaises(
      StorageError, msg="generic S3Error should raise StorageError"
    ):
      self.storage.soft_delete("test/key")

  def test_restore_soft_deleted_skips_no_version_id(self):
    """restore_soft_deleted should skip items without version_id."""
    item = MagicMock()
    item.object_name = "test/key"
    item.is_latest = True
    item.is_delete_marker = True
    item.version_id = None
    self.minio_instance.list_objects.return_value = [item]

    self.storage.restore_soft_deleted("test/key")
    self.minio_instance.remove_object.assert_not_called()

  def test_restore_soft_deleted_no_such_object_returns(self):
    """restore_soft_deleted should return silently for NoSuchObject."""
    self.minio_instance.list_objects.side_effect = _make_s3error(code="NoSuchObject")
    try:
      self.storage.restore_soft_deleted("test/key")
    except Exception:
      self.fail("restore_soft_deleted should not raise for NoSuchObject")

  def test_delete_all_versions_no_such_object_returns(self):
    """delete_all_versions should return silently for NoSuchObject."""
    self.minio_instance.list_objects.side_effect = _make_s3error(code="NoSuchObject")
    try:
      self.storage.delete_all_versions("test/key")
    except Exception:
      self.fail("delete_all_versions should not raise for NoSuchObject")

  def test_soft_delete_no_such_object_is_silent(self):
    """soft_delete should not raise for NoSuchObject."""
    self.minio_instance.remove_object.side_effect = _make_s3error(code="NoSuchObject")
    try:
      self.storage.soft_delete("test/key")
    except Exception:
      self.fail("soft_delete should not raise for NoSuchObject")


if __name__ == "__main__":
  unittest.main()
