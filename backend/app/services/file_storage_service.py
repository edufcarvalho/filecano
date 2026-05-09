from collections.abc import Iterator
from typing import BinaryIO, Optional

from minio import Minio
from minio.commonconfig import CopySource
from minio.deleteobjects import DeleteObject
from minio.error import S3Error
from minio.versioningconfig import ENABLED, VersioningConfig
from urllib3.response import BaseHTTPResponse

from app.core import NotFoundError, Settings, StorageError


class FileStorageService:
  def __init__(self, settings: Settings):
    self.bucket = settings.minio_bucket
    self.client = Minio(
      settings.minio_endpoint,
      access_key=settings.minio_access_key,
      secret_key=settings.minio_secret_key,
      secure=settings.minio_secure,
    )

  def upload(
    self,
    object_key: str,
    data: BinaryIO,
    size_bytes: int,
    content_type: Optional[str],
  ) -> None:
    self._ensure_bucket()
    try:
      self.client.put_object(
        self.bucket,
        object_key,
        data,
        size_bytes,
        content_type=content_type or "application/octet-stream",
      )
    except S3Error as error:
      raise StorageError(f"Could not upload file: {str(error)}") from error

  def download(self, object_key: str) -> BaseHTTPResponse:
    self._ensure_bucket()
    try:
      return self.client.get_object(self.bucket, object_key)
    except S3Error as error:
      if error.code in {"NoSuchKey", "NoSuchObject"}:
        raise NotFoundError("File object not found") from error

      raise StorageError(f"Could not download file: {str(error)}") from error

  def soft_delete(self, object_key: str) -> None:
    self._ensure_bucket()
    try:
      self.client.remove_object(self.bucket, object_key)
    except S3Error as error:
      if error.code in {"NoSuchKey", "NoSuchObject"}:
        return

      raise StorageError(f"Could not delete file: {str(error)}") from error

  def restore_soft_deleted(self, object_key: str) -> None:
    self._ensure_bucket()
    try:
      for item in self.client.list_objects(
        self.bucket,
        prefix=object_key,
        recursive=True,
        include_version=True,
      ):
        if item.object_name != object_key:
          continue

        is_latest = item.is_latest is True or item.is_latest == "true"
        if not is_latest or not item.is_delete_marker or not item.version_id:
          continue

        self.client.remove_object(
          self.bucket,
          object_key,
          version_id=item.version_id,
        )
        return
    except S3Error as error:
      if error.code in {"NoSuchKey", "NoSuchObject"}:
        return

      raise StorageError(f"Could not restore file: {str(error)}") from error

  def delete_all_versions(self, object_key: str) -> None:
    self._ensure_bucket()
    try:
      delete_objects = [
        DeleteObject(item.object_name, item.version_id)
        for item in self.client.list_objects(
          self.bucket,
          prefix=object_key,
          recursive=True,
          include_version=True,
        )
        if item.object_name == object_key
      ]

      if not delete_objects:
        self.client.remove_object(self.bucket, object_key)
        return

      errors = list(self.client.remove_objects(self.bucket, delete_objects))
    except S3Error as error:
      if error.code in {"NoSuchKey", "NoSuchObject"}:
        return

      raise StorageError(f"Could not permanently delete file: {str(error)}") from error

    if errors:
      error = errors[0]
      raise StorageError(
        f"Could not permanently delete file: {error.code}: {str(error)}"
      )

  def copy_object(self, source_key: str, dest_key: str) -> None:
    self._ensure_bucket()
    try:
      self.client.copy_object(
        self.bucket,
        dest_key,
        CopySource(self.bucket, source_key),
      )
    except S3Error as error:
      raise StorageError(f"Could not copy file: {str(error)}") from error

  def iter_response(self, response: BaseHTTPResponse) -> Iterator[bytes]:
    try:
      yield from response.stream(1024 * 1024)
    finally:
      response.close()
      response.release_conn()

  def _ensure_bucket(self) -> None:
    try:
      if not self.client.bucket_exists(self.bucket):
        self.client.make_bucket(self.bucket)

      self.client.set_bucket_versioning(self.bucket, VersioningConfig(ENABLED))
    except S3Error as error:
      raise StorageError(f"Could not prepare file storage: {str(error)}") from error
