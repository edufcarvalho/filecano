import unittest

from app.services.file_storage_service import FileStorageService
from app.tests.unit.helpers import make_s3_error, make_versioned_object


class TestFileStorageAdvanced(unittest.TestCase):
  """Additional tests for FileStorageService coverage gaps."""

  def setUp(self):
    from unittest.mock import MagicMock, patch

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
    item = make_versioned_object()
    self.minio_instance.list_objects.return_value = [item]

    self.storage.restore_soft_deleted("test/key")
    self.minio_instance.remove_object.assert_called_once_with(
      "filecano-test", "test/key", version_id="v1"
    )

  def test_restore_soft_deleted_skips_non_delete_marker(self):
    """restore_soft_deleted should skip items that are not delete markers."""
    item = make_versioned_object(is_delete_marker=False)
    self.minio_instance.list_objects.return_value = [item]

    self.storage.restore_soft_deleted("test/key")
    self.minio_instance.remove_object.assert_not_called()

  def test_restore_soft_deleted_skips_non_latest(self):
    """restore_soft_deleted should skip non-latest versions."""
    item = make_versioned_object(is_latest=False)
    self.minio_instance.list_objects.return_value = [item]

    self.storage.restore_soft_deleted("test/key")
    self.minio_instance.remove_object.assert_not_called()

  def test_restore_soft_deleted_skips_other_objects(self):
    """restore_soft_deleted should skip objects not matching the key."""
    item = make_versioned_object(object_name="other/key")
    self.minio_instance.list_objects.return_value = [item]

    self.storage.restore_soft_deleted("test/key")
    self.minio_instance.remove_object.assert_not_called()

  def test_restore_soft_deleted_is_latest_string_true(self):
    """restore_soft_deleted should handle is_latest as string 'true'."""
    item = make_versioned_object(is_latest="true")
    self.minio_instance.list_objects.return_value = [item]

    self.storage.restore_soft_deleted("test/key")
    self.minio_instance.remove_object.assert_called_once_with(
      "filecano-test",
      "test/key",
      version_id="v1",
    )

  def test_restore_soft_deleted_no_such_key_returns(self):
    """restore_soft_deleted should return silently for NoSuchKey."""
    self.minio_instance.list_objects.side_effect = make_s3_error(code="NoSuchKey")
    self.assertIsNone(self.storage.restore_soft_deleted("test/key"))
    self.minio_instance.remove_object.assert_not_called()

  def test_restore_soft_deleted_s3error_raises_storage_error(self):
    """restore_soft_deleted should raise StorageError for generic S3Error."""
    from app.core import StorageError

    self.minio_instance.list_objects.side_effect = make_s3_error(code="ServerError")
    with self.assertRaises(StorageError, msg="S3Error should raise StorageError"):
      self.storage.restore_soft_deleted("test/key")

  def test_restore_soft_deleted_no_matching_object_returns(self):
    """restore_soft_deleted should return if no matching delete marker found."""
    item = make_versioned_object(object_name="other/key")
    self.minio_instance.list_objects.return_value = [item]

    result = self.storage.restore_soft_deleted("test/key")
    self.assertIsNone(result)

  def test_delete_all_versions_no_such_key_returns(self):
    """delete_all_versions should return silently for NoSuchKey."""
    self.minio_instance.list_objects.side_effect = make_s3_error(code="NoSuchKey")
    self.assertIsNone(self.storage.delete_all_versions("test/key"))
    self.minio_instance.remove_object.assert_not_called()
    self.minio_instance.remove_objects.assert_not_called()

  def test_delete_all_versions_s3error_raises_storage_error(self):
    """delete_all_versions should raise StorageError for generic S3Error."""
    from app.core import StorageError

    self.minio_instance.list_objects.side_effect = make_s3_error(code="ServerError")
    with self.assertRaises(StorageError, msg="S3Error should raise StorageError"):
      self.storage.delete_all_versions("test/key")

  def test_delete_all_versions_errors_from_remove_objects(self):
    """delete_all_versions should raise StorageError when remove_objects returns errors."""
    from unittest.mock import MagicMock

    from minio.error import S3Error

    from app.core import StorageError

    item = make_versioned_object()
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
    item = make_versioned_object(object_name="other/key")
    self.minio_instance.list_objects.return_value = [item]

    self.storage.delete_all_versions("test/key")
    self.minio_instance.remove_object.assert_called_once_with(
      "filecano-test", "test/key"
    )

  def test_delete_all_versions_filters_by_object_name(self):
    """delete_all_versions should only delete versions of the target object."""
    matching = make_versioned_object(version_id="v1")
    non_matching = make_versioned_object(
      object_name="test/key/subkey",
      version_id="v2",
    )
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

    self.minio_instance.bucket_exists.side_effect = make_s3_error(code="ServerError")
    with self.assertRaises(
      StorageError, msg="S3Error in validate should raise StorageError"
    ):
      self.storage._ensure_bucket()

  def test_soft_delete_s3error_raises_storage_error(self):
    """soft_delete should raise StorageError for generic S3Error."""
    from app.core import StorageError

    self.minio_instance.remove_object.side_effect = make_s3_error(code="ServerError")
    with self.assertRaises(
      StorageError, msg="generic S3Error should raise StorageError"
    ):
      self.storage.soft_delete("test/key")

  def test_restore_soft_deleted_skips_no_version_id(self):
    """restore_soft_deleted should skip items without version_id."""
    item = make_versioned_object(version_id=None)
    self.minio_instance.list_objects.return_value = [item]

    self.storage.restore_soft_deleted("test/key")
    self.minio_instance.remove_object.assert_not_called()

  def test_restore_soft_deleted_no_such_object_returns(self):
    """restore_soft_deleted should return silently for NoSuchObject."""
    self.minio_instance.list_objects.side_effect = make_s3_error(code="NoSuchObject")
    self.assertIsNone(self.storage.restore_soft_deleted("test/key"))
    self.minio_instance.remove_object.assert_not_called()

  def test_delete_all_versions_no_such_object_returns(self):
    """delete_all_versions should return silently for NoSuchObject."""
    self.minio_instance.list_objects.side_effect = make_s3_error(code="NoSuchObject")
    self.assertIsNone(self.storage.delete_all_versions("test/key"))
    self.minio_instance.remove_object.assert_not_called()
    self.minio_instance.remove_objects.assert_not_called()

  def test_soft_delete_no_such_object_is_silent(self):
    """soft_delete should not raise for NoSuchObject."""
    self.minio_instance.remove_object.side_effect = make_s3_error(code="NoSuchObject")
    self.assertIsNone(self.storage.soft_delete("test/key"))
    self.minio_instance.remove_object.assert_called_once_with(
      "filecano-test",
      "test/key",
    )


if __name__ == "__main__":
  unittest.main()
