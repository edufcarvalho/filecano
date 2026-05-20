import unittest
from io import BytesIO
from unittest.mock import MagicMock
from uuid import uuid4

from fastapi import UploadFile

from app.core import Settings
from app.core.exceptions import (
  ForbiddenError,
  GoneError,
  NotFoundError,
  UnsupportedFileTypeError,
)
from app.services.file_service import FileService
from app.tests.unit.helpers import DatabaseTestCase


def _mock_upload_file(
  filename="test.txt", content=b"hello world", content_type="text/plain"
):

  f = MagicMock(spec=UploadFile)
  f.filename = filename
  f.file = BytesIO(content)
  f.content_type = content_type
  return f


class TestFileService(DatabaseTestCase):
  def setUp(self):
    super().setUp()
    from app.repositories import FileRepository, FolderRepository

    self.file_repo = FileRepository(self.session)
    self.folder_repo = FolderRepository(self.session)
    self.storage = MagicMock()
    self.settings = Settings(
      max_file_size_bytes=104857600,
      jwt_secret_key="test-key",
    )
    self.service = FileService(
      self.file_repo,
      self.folder_repo,
      self.storage,
      self.settings,
    )
    self.user = self._create_user(email="filesvc@test.com")

  def test_list_files_returns_files(self):
    """list_files should return user's files."""
    self._create_file(self.user.id)
    from app.schemas import FileListParams

    result = self.service.list_files(self.user, FileListParams())
    self.assertIsInstance(result, list, "list_files should return a list")

  def test_list_files_deleted(self):
    """list_files with deleted=True should return deleted files."""
    self._create_file(self.user.id)
    from app.schemas import FileListParams

    result = self.service.list_files(self.user, FileListParams(deleted=True))
    self.assertEqual(result, [], "no deleted files should return empty list")

  def test_list_files_by_folder(self):
    """list_files with by_folder=True should return FolderWithFilesResponse."""
    from app.schemas import FileListParams, FolderWithFilesResponse

    result = self.service.list_files(self.user, FileListParams(by_folder=True))
    self.assertIsInstance(
      result, FolderWithFilesResponse, "should return FolderWithFilesResponse"
    )

  def test_get_download_success(self):
    """get_download should return file and download response."""
    f = self._create_file(self.user.id)
    mock_response = MagicMock()
    self.storage.download.return_value = mock_response

    file, response = self.service.get_download(self.user, f.id)
    self.assertEqual(file.id, f.id, "file id should match")
    self.assertEqual(response, mock_response, "response should come from storage")

  def test_get_download_deleted_file_raises(self):
    """get_download should raise GoneError for deleted file."""
    f = self._create_file(self.user.id)
    f.deleted_at = f.created_at
    self.session.add(f)
    self.session.commit()

    with self.assertRaises(
      GoneError, msg="downloading deleted file should raise GoneError"
    ):
      self.service.get_download(self.user, f.id)

  def test_get_download_not_found_raises(self):
    """get_download should raise NotFoundError for nonexistent file."""
    with self.assertRaises(
      NotFoundError, msg="nonexistent file should raise NotFoundError"
    ):
      self.service.get_download(self.user, uuid4())

  def test_get_file_for_preview(self):
    """get_file_for_preview should return the file."""
    f = self._create_file(self.user.id)
    result = self.service.get_file_for_preview(self.user, f.id)
    self.assertEqual(result.id, f.id, "file id should match")

  def test_get_preview_download_no_preview_raises(self):
    """get_preview_download should raise NotFoundError when no preview exists."""
    f = self._create_file(self.user.id)
    with self.assertRaises(NotFoundError, msg="no preview should raise NotFoundError"):
      self.service.get_preview_download(f)

  def test_delete_file_soft(self):
    """delete_file should soft-delete a file."""
    f = self._create_file(self.user.id)
    result = self.service.delete_file(self.user, f.id)
    self.assertIsNotNone(
      result.deleted_at, "soft-deleted file should have deleted_at set"
    )
    self.storage.soft_delete.assert_called_once_with(f.object_key)

  def test_delete_file_already_deleted(self):
    """delete_file should return file if already soft-deleted."""
    f = self._create_file(self.user.id)
    f.deleted_at = f.created_at
    self.session.add(f)
    self.session.commit()
    result = self.service.delete_file(self.user, f.id)
    self.assertIsNotNone(result, "should return already-deleted file")

  def test_delete_file_permanent(self):
    """delete_file with permanent=True should hard-delete."""
    f = self._create_file(self.user.id)
    self.service.delete_file(self.user, f.id, permanent=True)
    self.storage.delete_all_versions.assert_called_once_with(f.object_key)

  def test_restore_file(self):
    """restore_file should restore a soft-deleted file."""
    f = self._create_file(self.user.id)
    f.deleted_at = f.created_at
    self.session.add(f)
    self.session.commit()

    result = self.service.restore_file(self.user, f.id)
    self.assertIsNone(result.deleted_at, "restored file should have deleted_at=None")
    self.storage.restore_soft_deleted.assert_called_once_with(f.object_key)

  def test_restore_file_already_active(self):
    """restore_file should return file as-is if already active."""
    f = self._create_file(self.user.id)
    result = self.service.restore_file(self.user, f.id)
    self.assertIsNone(result.deleted_at, "file should remain active")

  def test_update_file_name(self):
    """update_file should update file's original_name and display_name."""
    f = self._create_file(self.user.id, original_name="old.txt", display_name="old.txt")
    from app.schemas import FileUpdateParams

    result = self.service.update_file(
      self.user, f.id, FileUpdateParams(original_name="new")
    )
    self.assertIn("new", result.display_name, "display_name should reflect new name")

  def test_update_file_folder(self):
    """update_file should move file to a different folder."""
    f = self._create_file(self.user.id)
    folder = self._create_folder(self.user.id)
    from app.schemas import FileUpdateParams

    result = self.service.update_file(
      self.user, f.id, FileUpdateParams(folder_id=folder.id)
    )
    self.assertEqual(
      result.parent_id, folder.id, "file should be moved to the specified folder"
    )

  def test_update_file_nonexistent_folder_raises(self):
    """update_file should raise NotFoundError for nonexistent folder."""
    f = self._create_file(self.user.id)
    from app.schemas import FileUpdateParams

    with self.assertRaises(
      NotFoundError, msg="nonexistent folder should raise NotFoundError"
    ):
      self.service.update_file(self.user, f.id, FileUpdateParams(folder_id=uuid4()))

  def test_validate_file_type_unsupported(self):
    """_validate_file_type should raise for unsupported types."""
    with self.assertRaises(
      UnsupportedFileTypeError,
      msg="unsupported type should raise UnsupportedFileTypeError",
    ):
      self.service._validate_file_type("application/x-unsupported-type")

  def test_validate_file_type_supported(self):
    """_validate_file_type should not raise for supported types."""
    try:
      self.service._validate_file_type("text/plain")
    except UnsupportedFileTypeError:
      self.fail("_validate_file_type should not raise for supported type")

  def test_get_unique_filename_no_duplicates(self):
    """_get_unique_filename should return original name when no duplicates."""
    result = self.service._get_unique_filename(self.user.id, "unique")
    self.assertEqual(
      result, "unique", "should return original name when no duplicates exist"
    )

  def test_remove_file_extensions_with_ext(self):
    """_remove_file_extensions should strip file extension."""
    result = self.service._remove_file_extensions("document.txt")
    self.assertEqual(result, "document", "should strip file extension")

  def test_remove_file_extensions_without_ext(self):
    """_remove_file_extensions should return name as-is when no extension."""
    result = self.service._remove_file_extensions("noextension")
    self.assertEqual(
      result, "noextension", "should return name unchanged when no extension"
    )

  def test_remove_file_extensions_with_multiple_dots(self):
    """_remove_file_extensions should strip from first dot."""
    result = self.service._remove_file_extensions("archive.tar.gz")
    self.assertEqual(result, "archive", "should strip from first dot")

  def test_can_generate_preview_jpeg(self):
    """_can_generate_preview should return True for image/jpeg."""
    self.assertTrue(
      self.service._can_generate_preview("image/jpeg"),
      "jpeg should support preview generation",
    )

  def test_can_generate_preview_png(self):
    """_can_generate_preview should return True for image/png."""
    self.assertTrue(
      self.service._can_generate_preview("image/png"),
      "png should support preview generation",
    )

  def test_can_generate_preview_text(self):
    """_can_generate_preview should return False for text types."""
    self.assertFalse(
      self.service._can_generate_preview("text/plain"),
      "text types should not support preview",
    )

  def test_can_generate_preview_none(self):
    """_can_generate_preview should return False for None."""
    self.assertFalse(
      self.service._can_generate_preview(None), "None should not support preview"
    )

  def test_delete_file_other_user_raises(self):
    """delete_file should raise ForbiddenError for other user's file."""
    other_user = self._create_user(email="other@test.com")
    f = self._create_file(other_user.id)
    with self.assertRaises(
      ForbiddenError, msg="other user's file should raise ForbiddenError"
    ):
      self.service.delete_file(self.user, f.id)

  def test_stream_response_delegates_to_storage(self):
    """stream_response should delegate to storage.iter_response."""
    mock_response = MagicMock()
    self.storage.iter_response.return_value = iter([])
    result = self.service.stream_response(mock_response)
    self.assertIsNotNone(result)

  def test_get_preview_download_success(self):
    """get_preview_download should return storage response when preview exists."""
    f = self._create_file(
      self.user.id,
      content_type="image/png",
    )
    f.preview_object_key = "users/uid/previews/fid"
    self.session.add(f)
    self.session.commit()

    mock_response = MagicMock()
    self.storage.download.return_value = mock_response

    result = self.service.get_preview_download(f)
    self.assertEqual(result, mock_response)
    self.storage.download.assert_called_once_with(f.preview_object_key)

  def test_delete_file_permanent_with_preview(self):
    """delete_file permanent should also delete preview object keys."""
    f = self._create_file(
      self.user.id,
      content_type="image/png",
    )
    f.preview_object_key = "users/uid/previews/fid"
    self.session.add(f)
    self.session.commit()

    self.service.delete_file(self.user, f.id, permanent=True)
    self.assertEqual(self.storage.delete_all_versions.call_count, 2)

  def test_create_file_too_large_raises(self):
    """create_file should raise FileTooLargeError for oversized files."""
    from app.core.exceptions import FileTooLargeError

    self.settings.max_file_size_bytes = 10
    upload = _mock_upload_file(filename="big.txt", content=b"x" * 100)
    with self.assertRaises(
      FileTooLargeError, msg="oversized file should raise FileTooLargeError"
    ):
      self.service.create_file(self.user, upload)

  def test_create_file_restores_deleted_file(self):
    """create_file should restore a previously deleted file with same checksum."""
    display_name = "restore-me"
    f = self._create_file(
      self.user.id,
      display_name=display_name,
      checksum="abc123restore",
      original_name=display_name,
    )
    f.deleted_at = f.created_at
    self.session.add(f)
    self.session.commit()

    upload = _mock_upload_file(filename=display_name, content=b"hello world")
    from unittest.mock import patch

    with patch.object(
      self.service,
      "_checksum_and_size",
      return_value=("abc123restore", 11),
    ):
      result = self.service.create_file(self.user, upload)
      self.assertIsNone(result.deleted_at, "restored file should have deleted_at=None")
      self.storage.restore_soft_deleted.assert_called_once()

  def _create_image_file(self, user_id, content_type="image/jpeg"):
    """Create a file with preview support."""
    f = self._create_file(
      user_id,
      content_type=content_type,
      original_name="photo.jpg",
      display_name="photo",
    )
    f.object_key = f"users/{user_id}/files/{f.id}"
    self.session.add(f)
    self.session.commit()
    return f

  def test_update_file_on_deleted_raises(self):
    """update_file should raise GoneError for deleted file."""
    from app.schemas import FileUpdateParams

    f = self._create_file(self.user.id)
    f.deleted_at = f.created_at
    self.session.add(f)
    self.session.commit()

    with self.assertRaises(
      GoneError, msg="updating deleted file should raise GoneError"
    ):
      self.service.update_file(self.user, f.id, FileUpdateParams(original_name="new"))

  def test_clone_files_creates_duplicates(self):
    """clone_files should create duplicate file objects."""
    f1 = self._create_file(self.user.id, display_name="clone1.txt")
    f2 = self._create_file(self.user.id, display_name="clone2.txt")

    clones = self.service.clone_files(self.user, [f1, f2])
    self.assertEqual(len(clones), 2, "should create 2 clones")
    for clone in clones:
      self.assertIsNotNone(clone.id)
      self.assertNotIn(clone.id, {f1.id, f2.id}, "clone ids should be new")

  def test_clone_files_by_id_from_repo(self):
    """clone_files_by_id should fetch files by id and clone them."""
    f1 = self._create_file(self.user.id, display_name="clonebyid1.txt")
    f2 = self._create_file(self.user.id, display_name="clonebyid2.txt")
    link = self._create_link(self.user.id, token="clonebyid_link")
    self._create_file_link_relation(f1.id, link.id)
    self._create_file_link_relation(f2.id, link.id)

    clones = self.service.clone_files_by_id(self.user, link, [f1.id, f2.id])
    self.assertEqual(len(clones), 2, "should create 2 clones")
    for clone in clones:
      self.assertIsNotNone(clone.id)

  def test_duplicate_file_raises_for_deleted(self):
    """_duplicate_file should raise GoneError when source file is deleted."""
    f = self._create_file(self.user.id, display_name="deleted-clone.txt")
    f.deleted_at = f.created_at
    self.session.add(f)
    self.session.commit()

    with self.assertRaises(
      GoneError, msg="cloning deleted file should raise GoneError"
    ):
      self.service._duplicate_file(f, self.user.id)

  def test_duplicate_file_copies_storage(self):
    """_duplicate_file should copy object in storage."""
    f = self._create_file(self.user.id, display_name="undel-clone.txt")

    clone = self.service._duplicate_file(f, self.user.id)
    self.assertIsNotNone(clone)
    self.storage.copy_object.assert_called_once()
    self.assertNotEqual(clone.id, f.id)

  def test_duplicate_file_with_preview(self):
    """_duplicate_file should copy preview when it exists."""
    f = self._create_file(
      self.user.id,
      display_name="with-preview.txt",
      content_type="image/png",
    )
    f.preview_object_key = "users/uid/previews/fid"
    self.session.add(f)
    self.session.commit()

    clone = self.service._duplicate_file(f, self.user.id)
    self.assertIsNotNone(clone)
    self.assertEqual(self.storage.copy_object.call_count, 2)

  def test_generate_preview_jpeg(self):
    """_generate_preview should create a JPEG thumbnail from an image."""
    from io import BytesIO

    from PIL import Image

    img = Image.new("RGB", (400, 300), color="red")
    buf = BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    preview_data, preview_size, preview_content_type = self.service._generate_preview(
      buf
    )
    self.assertEqual(preview_content_type, "image/jpeg")
    self.assertGreater(preview_size, 0)

  def test_generate_preview_rgba_converts_to_rgb(self):
    """_generate_preview should convert RGBA to RGB."""
    from io import BytesIO

    from PIL import Image

    img = Image.new("RGBA", (200, 200), color=(255, 0, 0, 128))
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    preview_data, preview_size, preview_content_type = self.service._generate_preview(
      buf
    )
    self.assertEqual(preview_content_type, "image/jpeg")
    self.assertGreater(preview_size, 0, "preview should have non-zero size")

  def _make_jpeg_bytesio(self):
    """Create a minimal JPEG in a BytesIO."""
    from io import BytesIO

    from PIL import Image

    img = Image.new("RGB", (100, 100), color="blue")
    buf = BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf

  def test_create_file_with_preview_generation(self):
    """create_file should generate preview for image uploads."""
    jpeg_data = self._make_jpeg_bytesio()
    upload = _mock_upload_file(
      filename="photo.jpg", content=jpeg_data.read(), content_type="image/jpeg"
    )
    upload.file.seek(0)

    result = self.service.create_file(self.user, upload)
    self.assertIsNotNone(result.preview_object_key, "image file should have preview")
    self.assertIsNotNone(
      result.preview_content_type, "preview should have content_type"
    )
    self.assertIsNotNone(result.preview_size_bytes, "preview should have size")
    self.assertGreater(
      self.storage.upload.call_count,
      1,
      "should upload both file and preview",
    )

  def test_create_file_sqlalchemy_error_rollback(self):
    """create_file should rollback and cleanup on SQLAlchemyError."""
    from unittest.mock import patch

    from sqlalchemy.exc import SQLAlchemyError

    upload = _mock_upload_file()
    with patch.object(self.service.repository, "commit") as mock_commit:
      mock_commit.side_effect = SQLAlchemyError("mock error")
      with self.assertRaises(SQLAlchemyError):
        self.service.create_file(self.user, upload)

  def test_create_file_sqlalchemy_error_cleanup_called(self):
    """create_file should call storage cleanup on SQLAlchemyError."""
    from unittest.mock import patch

    from sqlalchemy.exc import SQLAlchemyError

    upload = _mock_upload_file()
    with patch.object(self.service.repository, "commit") as mock_commit:
      mock_commit.side_effect = SQLAlchemyError("mock error")
      with self.assertRaises(SQLAlchemyError):
        self.service.create_file(self.user, upload)
      self.storage.delete_all_versions.assert_called()

  def test_create_file_sqlalchemy_error_with_preview(self):
    """create_file should cleanup preview on SQLAlchemyError."""
    from unittest.mock import patch

    from sqlalchemy.exc import SQLAlchemyError

    jpeg_data = self._make_jpeg_bytesio()
    upload = _mock_upload_file(
      filename="photo.jpg", content=jpeg_data.read(), content_type="image/jpeg"
    )
    upload.file.seek(0)

    with patch.object(self.service.repository, "commit") as mock_commit:
      mock_commit.side_effect = SQLAlchemyError("mock error")
      with self.assertRaises(SQLAlchemyError):
        self.service.create_file(self.user, upload)
    self.assertGreaterEqual(
      self.storage.delete_all_versions.call_count,
      2,
      "should attempt to cleanup both file and preview",
    )


if __name__ == "__main__":
  unittest.main()
