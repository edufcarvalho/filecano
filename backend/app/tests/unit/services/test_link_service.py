import unittest
from unittest.mock import MagicMock
from uuid import uuid4

from app.core import Settings
from app.core.exceptions import (
  BadRequestError,
  ConflictError,
  ForbiddenError,
  GoneError,
  NotFoundError,
)
from app.services.link_service import LinkService
from app.tests.unit.helpers import DatabaseTestCase


class TestLinkService(DatabaseTestCase):
  def setUp(self):
    super().setUp()
    from app.repositories import FileRepository, FolderRepository, LinkRepository

    self.repo = LinkRepository(self.session)
    self.file_repo = FileRepository(self.session)
    self.folder_repo = FolderRepository(self.session)
    self.file_service = MagicMock()
    self.folder_service = MagicMock()
    self.storage = MagicMock()
    self.settings = Settings(
      shared_url_expire_seconds=604800,
      share_token_length=8,
      jwt_secret_key="test-key",
    )
    self.service = LinkService(
      self.repo,
      self.file_repo,
      self.folder_repo,
      self.file_service,
      self.folder_service,
      self.storage,
      self.settings,
    )
    self.user = self._create_user(email="linksvc@test.com")

  def test_create_link_success(self):
    """create_link should create a share link and return token info."""
    f = self._create_file(self.user.id)
    from app.schemas import LinkCreateParams

    params = LinkCreateParams(files=[f.id])
    result = self.service.create_link(self.user, params)
    self.assertIn("access_token", result, "create_link should return access_token")
    self.assertEqual(result["token_type"], "bearer", "token_type should be 'bearer'")

  def test_create_link_with_expires_at(self):
    """create_link should accept a custom expires_at."""
    from datetime import datetime, timedelta, timezone

    from app.schemas import LinkCreateParams

    f = self._create_file(self.user.id)
    future = datetime.now(timezone.utc) + timedelta(hours=1)
    params = LinkCreateParams(files=[f.id], expires_at=future)
    result = self.service.create_link(self.user, params)
    self.assertIn("access_token", result, "create_link should work with expires_at")

  def test_create_link_past_expires_at_raises(self):
    """create_link should raise BadRequestError for past expires_at."""
    from datetime import datetime, timezone

    from app.schemas import LinkCreateParams

    f = self._create_file(self.user.id)
    past = datetime(2020, 1, 1, tzinfo=timezone.utc)
    params = LinkCreateParams(files=[f.id], expires_at=past)
    with self.assertRaises(
      BadRequestError, msg="past expires_at should raise BadRequestError"
    ):
      self.service.create_link(self.user, params)

  def test_authenticate_token_success(self):
    """authenticate_token should return link for valid token."""
    link = self._create_link(self.user.id, token="valid-token")
    result = self.service.authenticate_token("valid-token")
    self.assertEqual(result.id, link.id, "authenticated link id should match")

  def test_authenticate_token_not_found(self):
    """authenticate_token should raise NotFoundError for unknown token."""
    with self.assertRaises(
      NotFoundError, msg="unknown token should raise NotFoundError"
    ):
      self.service.authenticate_token("nonexistent")

  def test_authenticate_token_deleted(self):
    """authenticate_token should raise NotFoundError for deleted link."""
    link = self._create_link(self.user.id, token="deleted-token")
    link.deleted_at = link.created_at
    self.session.add(link)
    self.session.commit()
    with self.assertRaises(
      NotFoundError, msg="deleted link should raise NotFoundError"
    ):
      self.service.authenticate_token("deleted-token")

  def test_authenticate_token_expired(self):
    """authenticate_token should raise GoneError for expired link."""
    from datetime import datetime, timedelta, timezone

    link = self._create_link(self.user.id, token="expired-token")
    link.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
    self.session.add(link)
    self.session.commit()
    with self.assertRaises(GoneError, msg="expired link should raise GoneError"):
      self.service.authenticate_token("expired-token")

  def test_get_files(self):
    """get_files should return LinkResponse with files and folders."""
    link = self._create_link(self.user.id, token="getfiles-token")
    f = self._create_file(self.user.id)
    self._create_file_link_relation(f.id, link.id)
    result = self.service.get_files("getfiles-token")
    self.assertEqual(result.token, "getfiles-token", "result token should match")
    self.assertIsNotNone(result.files, "result should have files")

  def test_get_file_success(self):
    """get_file should return file associated with link."""
    link = self._create_link(self.user.id, token="getfile-token")
    f = self._create_file(self.user.id)
    self._create_file_link_relation(f.id, link.id)
    result = self.service.get_file("getfile-token", f.id)
    self.assertIsNotNone(result, "get_file should return a file")
    self.assertEqual(result.id, f.id, "file id should match")

  def test_get_file_not_associated(self):
    """get_file should return None for file not associated with link."""
    self._create_link(self.user.id, token="getfile-none-tok")
    result = self.service.get_file("getfile-none-tok", uuid4())
    self.assertIsNone(result, "should return None for unassociated file")

  def test_get_download_success(self):
    """get_download should return file and download response."""
    link = self._create_link(self.user.id, token="dl-token")
    f = self._create_file(self.user.id)
    self._create_file_link_relation(f.id, link.id)
    mock_response = MagicMock()
    self.storage.download.return_value = mock_response

    file, response = self.service.get_download("dl-token", f.id)
    self.assertEqual(file.id, f.id, "file id should match")
    self.assertEqual(response, mock_response, "download should use storage")

  def test_get_download_not_found_raises(self):
    """get_download should raise NotFoundError for unassociated file."""
    self._create_link(self.user.id, token="dl-none-tok")
    with self.assertRaises(
      NotFoundError, msg="should raise NotFoundError for missing file"
    ):
      self.service.get_download("dl-none-tok", uuid4())

  def test_list_user_links(self):
    """list_user_links should return links for a user."""
    link = self._create_link(self.user.id, token="owned-link")
    result = self.service.list_user_links(self.user, self.user.id)
    self.assertEqual([item.id for item in result], [link.id])

  def test_list_user_links_different_user_raises(self):
    """list_user_links should raise ForbiddenError for other user."""
    other = self._create_user(email="other@test.com")
    with self.assertRaises(
      ForbiddenError, msg="should raise when listing other user's links"
    ):
      self.service.list_user_links(self.user, other.id)

  def test_update_link_name_success(self):
    """update_link_name should update custom_name."""
    self._create_link(self.user.id, token="rename-tok")
    result = self.service.update_link_name(self.user, "rename-tok", "new-name")
    self.assertEqual(result.custom_name, "new-name", "custom_name should be updated")

  def test_update_link_name_conflict(self):
    """update_link_name should raise ConflictError when name is taken."""
    self._create_link(self.user.id, token="tok1", custom_name="taken-name")
    self._create_link(self.user.id, token="tok2")
    with self.assertRaises(ConflictError, msg="taken name should raise ConflictError"):
      self.service.update_link_name(self.user, "tok2", "taken-name")

  def test_restore_link_success(self):
    """restore_link should restore a deleted link."""
    link = self._create_link(self.user.id, token="restore-tok")
    link.deleted_at = link.created_at
    self.session.add(link)
    self.session.commit()
    result = self.service.restore_link(self.user, "restore-tok")
    self.assertIsNone(result.deleted_at, "restored link should have deleted_at=None")

  def test_delete_link(self):
    """delete_link should hard-delete a link."""
    link = self._create_link(self.user.id, token="del-tok")
    self.service.delete_link(self.user, "del-tok")
    from app.models import Link

    result = self.session.get(Link, link.id)
    self.assertIsNone(result, "deleted link should not exist")

  def test_delete_link_nonexistent_raises(self):
    """delete_link should raise NotFoundError for nonexistent link."""
    with self.assertRaises(
      NotFoundError, msg="nonexistent link should raise NotFoundError"
    ):
      self.service.delete_link(self.user, "nonexistent")

  def test_get_link_nonexistent(self):
    """_get_link should raise NotFoundError for nonexistent token."""
    with self.assertRaises(
      NotFoundError, msg="nonexistent token should raise NotFoundError"
    ):
      self.service._get_link("nonexistent")

  def test_clone_shared_objects(self):
    """clone_shared_objects should clone files and folders."""
    from app.schemas import CloningParams, FolderWithFilesResponse

    self._create_link(self.user.id, token="clone-tok")
    self.file_service.clone_files_by_id.return_value = []
    self.folder_service.clone_folders.return_value = []

    params = CloningParams(files=[], folders=[])
    result = self.service.clone_shared_objects(self.user, "clone-tok", params)
    self.assertIsInstance(
      result, FolderWithFilesResponse, "should return FolderWithFilesResponse"
    )
    self.file_service.clone_files_by_id.assert_called_once()
    self.folder_service.clone_folders.assert_called_once()
    self.assertEqual(result.other_files, [])
    self.assertEqual(result.folders, [])

  def test_stream_response(self):
    """stream_response should delegate to storage."""
    mock_response = MagicMock()
    self.storage.iter_response.return_value = iter([])
    gen = self.service.stream_response(mock_response)
    self.assertIs(gen, self.storage.iter_response.return_value)
    self.storage.iter_response.assert_called_once_with(mock_response)

  def test_get_preview_download_success(self):
    """get_preview_download should return file and download response for preview."""
    link = self._create_link(self.user.id, token="preview-token")
    f = self._create_file(
      self.user.id,
      content_type="image/png",
      object_key="users/uid/files/fid",
    )
    f.preview_object_key = "users/uid/previews/fid"
    f.preview_content_type = "image/jpeg"
    f.preview_size_bytes = 1234
    self.session.add(f)
    self.session.commit()
    self._create_file_link_relation(f.id, link.id)
    mock_response = MagicMock()
    self.storage.download.return_value = mock_response

    file, response = self.service.get_preview_download("preview-token", f.id)
    self.assertEqual(file.id, f.id, "file id should match")
    self.assertEqual(response, mock_response, "preview download should use storage")
    self.storage.download.assert_called_once_with(f.preview_object_key)

  def test_get_preview_download_no_preview_object_key(self):
    """get_preview_download should raise NotFoundError when no preview_object_key."""
    link = self._create_link(self.user.id, token="nopreview-token")
    f = self._create_file(self.user.id)
    self._create_file_link_relation(f.id, link.id)

    with self.assertRaises(
      NotFoundError, msg="missing preview key should raise NotFoundError"
    ):
      self.service.get_preview_download("nopreview-token", f.id)

  def test_get_preview_download_file_not_found(self):
    """get_preview_download should raise NotFoundError for unassociated file."""
    self._create_link(self.user.id, token="prev-missing-tok")
    with self.assertRaises(
      NotFoundError, msg="unassociated file should raise NotFoundError"
    ):
      self.service.get_preview_download("prev-missing-tok", uuid4())

  def test_restore_link_with_params_expires_at(self):
    """restore_link with params should update expires_at."""
    from datetime import datetime, timedelta, timezone

    from app.schemas import LinkRestoreParams

    link = self._create_link(self.user.id, token="restore-params-tok")
    link.deleted_at = link.created_at
    self.session.add(link)
    self.session.commit()

    future = datetime.now(timezone.utc) + timedelta(hours=5)
    params = LinkRestoreParams(expires_at=future)
    result = self.service.restore_link(self.user, "restore-params-tok", params)
    self.assertIsNone(result.deleted_at, "restored link should have deleted_at=None")
    self.assertEqual(
      result.expires_at, future, "expires_at should match the param value"
    )

  def test_restore_link_with_past_expires_at_raises(self):
    """restore_link with past expires_at should raise BadRequestError."""
    from datetime import datetime, timezone

    from app.schemas import LinkRestoreParams

    link = self._create_link(self.user.id, token="restore-past-tok")
    link.deleted_at = link.created_at
    self.session.add(link)
    self.session.commit()

    past = datetime(2020, 1, 1, tzinfo=timezone.utc)
    params = LinkRestoreParams(expires_at=past)
    with self.assertRaises(
      BadRequestError, msg="past expires_at should raise BadRequestError"
    ):
      self.service.restore_link(self.user, "restore-past-tok", params)

  def test_restore_link_without_params(self):
    """restore_link without params should reset expires_at to default."""
    link = self._create_link(self.user.id, token="restore-noparam-tok")
    link.deleted_at = link.created_at
    previous_expires_at = link.expires_at
    self.session.add(link)
    self.session.commit()

    result = self.service.restore_link(self.user, "restore-noparam-tok")
    self.assertIsNone(result.deleted_at, "restored link should have deleted_at=None")
    self.assertGreater(result.expires_at, previous_expires_at)


if __name__ == "__main__":
  unittest.main()
