import unittest
from io import BytesIO
from unittest.mock import MagicMock, patch

from app.core import NotFoundError, Settings, StorageError
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


class TestFileStorageService(unittest.TestCase):
  def setUp(self):
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

  def test_init_creates_minio_client(self):
    """__init__ should create a Minio client with settings."""
    self.mock_minio.assert_called_once()

  def test_upload_calls_put_object(self):
    """upload should call put_object on the Minio client."""
    data = BytesIO(b"test data")
    self.storage.upload("test/key", data, 9, "text/plain")
    self.minio_instance.put_object.assert_called_once()

  def test_upload_creates_bucket_if_missing(self):
    """upload should ensure bucket exists before uploading."""
    data = BytesIO(b"test data")
    self.storage.upload("test/key", data, 9, "text/plain")
    self.minio_instance.bucket_exists.assert_called_once()

  def test_upload_s3error_raises_storage_error(self):
    """upload should raise StorageError on S3Error."""
    self.minio_instance.put_object.side_effect = _make_s3error()
    data = BytesIO(b"test data")
    with self.assertRaises(
      StorageError, msg="S3Error should be wrapped as StorageError"
    ):
      self.storage.upload("test/key", data, 9, "text/plain")

  def test_download_calls_get_object(self):
    """download should call get_object on the Minio client."""
    mock_response = MagicMock()
    self.minio_instance.get_object.return_value = mock_response
    result = self.storage.download("test/key")
    self.assertEqual(result, mock_response, "download should return the S3 response")
    self.minio_instance.get_object.assert_called_once_with(
      "filecano-test",
      "test/key",
    )

  def test_download_no_such_key_raises_not_found(self):
    """download should raise NotFoundError for NoSuchKey."""
    self.minio_instance.get_object.side_effect = _make_s3error(code="NoSuchKey")
    with self.assertRaises(NotFoundError, msg="NoSuchKey should raise NotFoundError"):
      self.storage.download("test/key")

  def test_download_s3error_raises_storage_error(self):
    """download should raise StorageError for generic S3Error."""
    self.minio_instance.get_object.side_effect = _make_s3error(code="ServerError")
    with self.assertRaises(
      StorageError, msg="generic S3Error should raise StorageError"
    ):
      self.storage.download("test/key")

  def test_soft_delete_calls_remove_object(self):
    """soft_delete should call remove_object on the Minio client."""
    self.storage.soft_delete("test/key")
    self.minio_instance.remove_object.assert_called_once_with(
      "filecano-test",
      "test/key",
    )

  def test_soft_delete_no_such_key_is_silent(self):
    """soft_delete should not raise for NoSuchKey."""
    self.minio_instance.remove_object.side_effect = _make_s3error(code="NoSuchKey")
    try:
      self.storage.soft_delete("test/key")
    except Exception:
      self.fail("soft_delete should not raise for NoSuchKey")

  def test_delete_all_versions_no_objects(self):
    """delete_all_versions should handle no objects gracefully."""
    self.minio_instance.list_objects.return_value = []
    try:
      self.storage.delete_all_versions("test/key")
    except Exception:
      self.fail("delete_all_versions should not raise for no objects")

  def test_delete_all_versions_with_objects(self):
    """delete_all_versions should delete all versions of an object."""
    from unittest.mock import MagicMock

    item1 = MagicMock()
    item1.object_name = "test/key"
    item1.version_id = "v1"
    item2 = MagicMock()
    item2.object_name = "test/key"
    item2.version_id = "v2"
    self.minio_instance.list_objects.return_value = [item1, item2]
    self.minio_instance.remove_objects.return_value = []

    self.storage.delete_all_versions("test/key")
    self.minio_instance.remove_objects.assert_called_once()

  def test_copy_object_calls_copy_object(self):
    """copy_object should call copy_object on the Minio client."""
    self.storage.copy_object("source/key", "dest/key")
    self.minio_instance.copy_object.assert_called_once()

  def test_copy_object_s3error_raises_storage_error(self):
    """copy_object should raise StorageError on S3Error."""
    self.minio_instance.copy_object.side_effect = _make_s3error()
    with self.assertRaises(StorageError, msg="S3Error should raise StorageError"):
      self.storage.copy_object("src", "dst")

  def test_iter_response_streams_data(self):
    """iter_response should yield data chunks from the response."""
    mock_response = MagicMock()
    mock_response.stream.return_value = iter([b"chunk1", b"chunk2"])
    chunks = list(self.storage.iter_response(mock_response))
    self.assertEqual(
      chunks, [b"chunk1", b"chunk2"], "should yield all chunks from stream"
    )
    mock_response.close.assert_called_once()
    mock_response.release_conn.assert_called_once()

  def test_iter_response_closes_on_exception(self):
    """iter_response should close/release even on streaming error."""
    mock_response = MagicMock()
    mock_response.stream.side_effect = RuntimeError("stream error")
    with self.assertRaises(RuntimeError, msg="streaming error should propagate"):
      list(self.storage.iter_response(mock_response))
    mock_response.close.assert_called_once()
    mock_response.release_conn.assert_called_once()

  def test_ensure_bucket_creates_bucket(self):
    """_ensure_bucket should create bucket if it doesn't exist."""
    self.minio_instance.bucket_exists.return_value = False
    self.storage._ensure_bucket()
    self.minio_instance.make_bucket.assert_called_once_with("filecano-test")
    self.minio_instance.set_bucket_versioning.assert_called_once()

  def test_ensure_bucket_already_exists(self):
    """_ensure_bucket should not recreate existing bucket."""
    self.minio_instance.bucket_exists.return_value = True
    self.storage._ensure_bucket()
    self.minio_instance.make_bucket.assert_not_called()

  def test_init_stores_settings(self):
    """FileStorageService should store bucket name from settings."""
    self.assertEqual(
      self.storage.bucket, "filecano-test", "bucket name should match settings"
    )


if __name__ == "__main__":
  unittest.main()
