import unittest
from datetime import timedelta
from unittest.mock import MagicMock, patch

from app.core import Settings
from app.models import File, Folder, Link, User
from app.repositories import (
  FileRepository,
  FolderRepository,
  LinkRepository,
  UserRepository,
)
from app.services import (
  FileService,
  FolderService,
  LinkService,
  UserService,
)
from app.tests.unit.helpers import DatabaseTestCase, get_test_settings
from app.utils.time import current_datetime

_retention_days = get_test_settings().data_retention_policy


class TestFileRetentionPolicy(DatabaseTestCase):
  def setUp(self):
    super().setUp()
    settings = Settings(
      jwt_secret_key="test-key",
      max_file_size_bytes=104857600,
      data_retention_policy=_retention_days,
      _env_file=None,
    )
    self.file_repo = FileRepository(self.session, settings)
    self.folder_repo = FolderRepository(self.session, settings)
    self.storage = MagicMock()
    self.service = FileService(
      self.file_repo,
      self.folder_repo,
      self.storage,
      settings,
    )
    self.user = self._create_user(email="retain-file@test.com")

  def test_deletes_file_past_retention_period(self):
    old = self._create_file(self.user.id, display_name="old-file.txt")
    old.deleted_at = current_datetime() - timedelta(days=_retention_days + 1)
    self.session.add(old)
    self.session.commit()

    recent = self._create_file(self.user.id, display_name="recent-file.txt")
    recent.deleted_at = current_datetime() - timedelta(days=_retention_days - 1)
    self.session.add(recent)
    self.session.commit()

    self.service.enforce_retention_policy()

    self.assertIsNone(
      self.session.get(File, old.id), "old deleted file should be hard-deleted"
    )
    self.storage.delete_all_versions.assert_any_call(old.object_key)
    self.assertIsNotNone(
      self.session.get(File, recent.id),
      "recently deleted file should remain",
    )

  def test_deletes_preview_object_keys(self):
    old = self._create_file(
      self.user.id,
      display_name="preview-file.txt",
      content_type="image/png",
    )
    old.deleted_at = current_datetime() - timedelta(days=_retention_days + 1)
    old.preview_object_key = f"users/{self.user.id}/previews/{old.id}"
    self.session.add(old)
    self.session.commit()

    self.service.enforce_retention_policy()

    self.storage.delete_all_versions.assert_any_call(old.object_key)
    self.storage.delete_all_versions.assert_any_call(old.preview_object_key)
    self.assertEqual(self.storage.delete_all_versions.call_count, 2)


class TestFolderRetentionPolicy(DatabaseTestCase):
  def setUp(self):
    super().setUp()
    settings = Settings(
      jwt_secret_key="test-key",
      max_file_size_bytes=104857600,
      data_retention_policy=_retention_days,
      _env_file=None,
    )
    self.folder_repo = FolderRepository(self.session, settings)
    self.file_repo = FileRepository(self.session, settings)
    self.storage = MagicMock()
    self.file_service = MagicMock()
    self.service = FolderService(
      self.folder_repo,
      self.file_repo,
      self.file_service,
      self.storage,
    )
    self.user = self._create_user(email="retain-folder@test.com")

  def test_deletes_folder_and_files_past_retention(self):
    old = self._create_folder(self.user.id, name="old-folder")
    old.deleted_at = current_datetime() - timedelta(days=_retention_days + 1)
    self.session.add(old)
    self.session.commit()

    old_file = self._create_file(
      self.user.id, display_name="in-old-folder.txt", folder_id=old.id
    )
    old_file.object_key = f"users/{self.user.id}/files/{old_file.id}"
    old_file.deleted_at = old.deleted_at
    self.session.add(old_file)
    self.session.commit()

    recent = self._create_folder(self.user.id, name="recent-folder")
    recent.deleted_at = current_datetime() - timedelta(days=_retention_days - 1)
    self.session.add(recent)
    self.session.commit()

    self.service.enforce_retention_policy()

    self.assertIsNone(
      self.session.get(Folder, old.id), "old folder should be hard-deleted"
    )
    self.storage.delete_all_versions.assert_any_call(old_file.object_key)
    self.assertIsNotNone(
      self.session.get(Folder, recent.id), "recent folder should remain"
    )


class TestLinkRetentionPolicy(DatabaseTestCase):
  def setUp(self):
    super().setUp()
    settings = Settings(
      jwt_secret_key="test-key",
      max_file_size_bytes=104857600,
      data_retention_policy=_retention_days,
      shared_url_expire_seconds=604800,
      share_token_length=8,
      _env_file=None,
    )
    self.repo = LinkRepository(self.session, settings)
    self.file_repo = FileRepository(self.session, settings)
    self.folder_repo = FolderRepository(self.session, settings)
    self.file_service = MagicMock()
    self.folder_service = MagicMock()
    self.storage = MagicMock()
    self.service = LinkService(
      self.repo,
      self.file_repo,
      self.folder_repo,
      self.file_service,
      self.folder_service,
      self.storage,
      settings,
    )
    self.user = self._create_user(email="retain-link@test.com")

  def test_deletes_links_past_retention_period(self):
    old = self._create_link(self.user.id, token="old-link-tok")
    old.expires_at = current_datetime() - timedelta(days=_retention_days + 1)
    self.session.add(old)
    self.session.commit()

    recent = self._create_link(self.user.id, token="recent-link-tok")
    recent.expires_at = current_datetime() - timedelta(days=5)
    self.session.add(recent)
    self.session.commit()

    self.service.enforce_retention_policy()

    self.assertIsNone(
      self.session.get(Link, old.id), "old expired link should be deleted"
    )
    self.assertIsNotNone(self.session.get(Link, recent.id), "recent link should remain")


class TestUserRetentionPolicy(DatabaseTestCase):
  def setUp(self):
    super().setUp()
    settings = Settings(
      jwt_secret_key="test-key",
      max_file_size_bytes=104857600,
      data_retention_policy=_retention_days,
      _env_file=None,
    )
    self.repo = UserRepository(self.session, settings)
    self.service = UserService(self.repo)
    self.user = self._create_user(email="retain-user@test.com")

  def test_deletes_users_past_retention_period(self):
    old = self._create_user(name="Old User", email="old-user@test.com")
    old.deleted_at = current_datetime() - timedelta(days=_retention_days + 1)
    self.session.add(old)
    self.session.commit()

    recent = self._create_user(name="Recent User", email="recent-user@test.com")
    recent.deleted_at = current_datetime() - timedelta(days=_retention_days - 1)
    self.session.add(recent)
    self.session.commit()

    self.service.enforce_retention_policy()

    self.assertIsNone(
      self.session.get(User, old.id), "old deleted user should be deleted"
    )
    self.assertIsNotNone(
      self.session.get(User, recent.id), "recently deleted user should remain"
    )


class TestCeleryTaskRegistration(unittest.TestCase):
  def test_task_is_registered_with_celery(self):
    from app.tasks.clean_not_retained import enforce_retention_policies

    self.assertTrue(
      hasattr(enforce_retention_policies, "delay"),
      "celery task should have delay attribute",
    )
    self.assertEqual(
      enforce_retention_policies.name,
      "clean.not_retainable",
      "task name should match",
    )

  def test_task_orchestrates_all_services(self):
    """enforce_retention_policies should call enforce_retention_policy on all services."""
    mock_user_service = MagicMock()
    mock_link_service = MagicMock()
    mock_folder_service = MagicMock()
    mock_file_service = MagicMock()
    mock_session = MagicMock()
    mock_session_context = MagicMock()
    mock_session_context.__enter__.return_value = mock_session

    with (
      patch(
        "app.tasks.clean_not_retained.Session",
        return_value=mock_session_context,
      ),
      patch(
        "app.tasks.clean_not_retained.UserRepository",
      ),
      patch(
        "app.tasks.clean_not_retained.FileRepository",
      ),
      patch(
        "app.tasks.clean_not_retained.FolderRepository",
      ),
      patch(
        "app.tasks.clean_not_retained.LinkRepository",
      ),
      patch(
        "app.tasks.clean_not_retained.FileStorageService",
      ),
      patch(
        "app.tasks.clean_not_retained.UserService",
        return_value=mock_user_service,
      ),
      patch(
        "app.tasks.clean_not_retained.LinkService",
        return_value=mock_link_service,
      ),
      patch(
        "app.tasks.clean_not_retained.FolderService",
        return_value=mock_folder_service,
      ),
      patch(
        "app.tasks.clean_not_retained.FileService",
        return_value=mock_file_service,
      ),
    ):
      from app.tasks.clean_not_retained import enforce_retention_policies

      enforce_retention_policies()

    mock_user_service.enforce_retention_policy.assert_called_once()
    mock_link_service.enforce_retention_policy.assert_called_once()
    mock_folder_service.enforce_retention_policy.assert_called_once()
    mock_file_service.enforce_retention_policy.assert_called_once()

  def test_task_rolls_back_and_reraises_when_service_fails(self):
    mock_user_service = MagicMock()
    mock_link_service = MagicMock()
    mock_link_service.enforce_retention_policy.side_effect = RuntimeError(
      "retention failed"
    )
    mock_folder_service = MagicMock()
    mock_file_service = MagicMock()
    mock_session = MagicMock()
    mock_session_context = MagicMock()
    mock_session_context.__enter__.return_value = mock_session

    with (
      patch(
        "app.tasks.clean_not_retained.Session",
        return_value=mock_session_context,
      ),
      patch(
        "app.tasks.clean_not_retained.UserRepository",
      ),
      patch(
        "app.tasks.clean_not_retained.FileRepository",
      ),
      patch(
        "app.tasks.clean_not_retained.FolderRepository",
      ),
      patch(
        "app.tasks.clean_not_retained.LinkRepository",
      ),
      patch(
        "app.tasks.clean_not_retained.FileStorageService",
      ),
      patch(
        "app.tasks.clean_not_retained.UserService",
        return_value=mock_user_service,
      ),
      patch(
        "app.tasks.clean_not_retained.LinkService",
        return_value=mock_link_service,
      ),
      patch(
        "app.tasks.clean_not_retained.FolderService",
        return_value=mock_folder_service,
      ),
      patch(
        "app.tasks.clean_not_retained.FileService",
        return_value=mock_file_service,
      ),
    ):
      from app.tasks.clean_not_retained import enforce_retention_policies

      with self.assertRaisesRegex(RuntimeError, "retention failed"):
        enforce_retention_policies()

    mock_user_service.enforce_retention_policy.assert_called_once()
    mock_link_service.enforce_retention_policy.assert_called_once()
    mock_folder_service.enforce_retention_policy.assert_not_called()
    mock_file_service.enforce_retention_policy.assert_not_called()
    mock_session.rollback.assert_called_once()
    mock_session.commit.assert_not_called()


if __name__ == "__main__":
  unittest.main()
