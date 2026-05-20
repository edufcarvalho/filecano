import unittest

from app.repositories import FileRepository
from app.tests.unit.helpers import DatabaseTestCase, get_test_settings


class TestFileRepository(DatabaseTestCase):
  def setUp(self):
    super().setUp()
    self.repo = FileRepository(self.session, get_test_settings())
    self.user = self._create_user(email="filerepo@test.com")

  def test_list_by_user_returns_active_files(self):
    """list_by_user should return only non-deleted files for the user."""
    self._create_file(
      self.user.id, display_name="active.txt", original_name="active.txt"
    )
    f2 = self._create_file(
      self.user.id, display_name="deleted.txt", original_name="deleted.txt"
    )
    f2.deleted_at = f2.created_at
    self.session.add(f2)
    self.session.commit()

    result = self.repo.list_by_user(self.user.id)
    self.assertEqual(len(result), 1, "should return only non-deleted files")

  def test_list_by_user_returns_deleted_files(self):
    """list_by_user with deleted=True should return only deleted files."""
    self._create_file(
      self.user.id, display_name="active.txt", original_name="active.txt"
    )
    f2 = self._create_file(
      self.user.id, display_name="deleted.txt", original_name="deleted.txt"
    )
    f2.deleted_at = f2.created_at
    self.session.add(f2)
    self.session.commit()

    result = self.repo.list_by_user(self.user.id, deleted=True)
    self.assertEqual(
      len(result), 1, "should return only deleted files when deleted=True"
    )

  def test_list_by_user_returns_empty_for_no_files(self):
    """list_by_user should return empty list when user has no files."""
    result = self.repo.list_by_user(self.user.id)
    self.assertEqual(result, [], "should return empty list for user with no files")

  def test_list_deleted_by_user(self):
    """list_deleted_by_user should return deleted files ordered by deleted_at desc."""
    f1 = self._create_file(self.user.id, display_name="d1", original_name="d1")
    f2 = self._create_file(self.user.id, display_name="d2", original_name="d2")
    f1.deleted_at = f1.created_at
    f2.deleted_at = f2.created_at
    self.session.add(f1)
    self.session.add(f2)
    self.session.commit()

    result = self.repo.list_deleted_by_user(self.user.id)
    self.assertEqual(len(result), 2, "should return all deleted files")

  def test_restore_sets_deleted_at_to_none(self):
    """restore should set deleted_at to None and keep folder_id when folder is active."""
    folder = self._create_folder(self.user.id, name="TestFolder")
    f = self._create_file(
      self.user.id,
      display_name="restore.txt",
      original_name="restore.txt",
      folder_id=folder.id,
    )
    f.deleted_at = f.created_at
    self.session.add(f)
    self.session.commit()

    restored = self.repo.restore(f)
    self.assertIsNone(restored.deleted_at, "restored file should have deleted_at=None")
    self.assertEqual(
      restored.parent_id, folder.id, "restored file should keep folder when active"
    )

  def test_restore_clears_folder_id_when_folder_is_deleted(self):
    """restore should clear folder_id when parent folder is deleted."""
    folder = self._create_folder(self.user.id, name="DeadFolder")
    folder.deleted_at = folder.created_at
    self.session.add(folder)
    self.session.commit()

    f = self._create_file(
      self.user.id,
      display_name="orphan-restore.txt",
      original_name="orphan-restore.txt",
      folder_id=folder.id,
    )
    f.deleted_at = f.created_at
    self.session.add(f)
    self.session.commit()

    restored = self.repo.restore(f)
    self.assertIsNone(restored.deleted_at, "restored file should have deleted_at=None")
    self.assertIsNone(
      restored.parent_id, "restored file should have folder_id=None when folder deleted"
    )

  def test_delete_by_folder(self):
    """delete_by_folder should soft-delete all files in a folder."""
    folder = self._create_folder(self.user.id)
    f1 = self._create_file(self.user.id, folder_id=folder.id)
    f2 = self._create_file(self.user.id, folder_id=folder.id)

    self.repo.delete_by_folder(folder.id)
    self.session.refresh(f1)
    self.session.refresh(f2)
    self.assertIsNotNone(f1.deleted_at, "f1 should be soft-deleted")
    self.assertIsNotNone(f2.deleted_at, "f2 should be soft-deleted")

  def test_delete_by_folders(self):
    """delete_by_folders should soft-delete files across multiple folders."""
    f1 = self._create_folder(self.user.id, name="FolderA")
    f2 = self._create_folder(self.user.id, name="FolderB")
    file_a = self._create_file(self.user.id, folder_id=f1.id)
    file_b = self._create_file(self.user.id, folder_id=f2.id)

    self.repo.delete_by_folders([f1.id, f2.id])
    self.session.refresh(file_a)
    self.session.refresh(file_b)
    self.assertIsNotNone(file_a.deleted_at, "file in FolderA should be soft-deleted")
    self.assertIsNotNone(file_b.deleted_at, "file in FolderB should be soft-deleted")

  def test_restore_by_folder(self):
    """restore_by_folder should restore all soft-deleted files in a folder."""
    folder = self._create_folder(self.user.id)
    f = self._create_file(self.user.id, folder_id=folder.id)
    f.deleted_at = f.created_at
    self.session.add(f)
    self.session.commit()

    self.repo.restore_by_folder(folder.id)
    self.session.refresh(f)
    self.assertIsNone(f.deleted_at, "file should be restored after restore_by_folder")

  def test_list_by_multiple_ids_and_user(self):
    """list_by_multiple_ids_and_user should return active files by ids."""
    f1 = self._create_file(self.user.id)
    f2 = self._create_file(self.user.id)

    result = self.repo.list_by_multiple_ids_and_user([f1.id, f2.id], self.user.id)
    ids = {r.id for r in result}
    self.assertIn(f1.id, ids, "f1 should be in results")
    self.assertIn(f2.id, ids, "f2 should be in results")

  def test_list_by_multiple_ids_and_user_empty_input(self):
    """list_by_multiple_ids_and_user should return empty list for empty input."""
    result = self.repo.list_by_multiple_ids_and_user([], self.user.id)
    self.assertEqual(result, [], "empty input should return empty list")

  def test_list_by_multiple_ids_and_user_excludes_deleted(self):
    """list_by_multiple_ids_and_user should exclude soft-deleted files."""
    f1 = self._create_file(self.user.id)
    f2 = self._create_file(self.user.id)
    f2.deleted_at = f2.created_at
    self.session.add(f2)
    self.session.commit()

    result = self.repo.list_by_multiple_ids_and_user([f1.id, f2.id], self.user.id)
    self.assertEqual(len(result), 1, "should exclude deleted file")
    self.assertEqual(result[0].id, f1.id, "only non-deleted file should be returned")

  def test_get_by_id_and_link(self):
    """get_by_id_and_link should return file associated with a link."""
    f = self._create_file(self.user.id)
    link = self._create_link(self.user.id)
    self._create_file_link_relation(f.id, link.id)

    result = self.repo.get_by_id_and_link(f.id, link.id)
    self.assertIsNotNone(result, "should find file associated with link")
    self.assertEqual(result.id, f.id, "file id should match")

  def test_get_by_id_and_link_returns_none_wrong_link(self):
    """get_by_id_and_link should return None for wrong link."""
    f = self._create_file(self.user.id)
    link1 = self._create_link(self.user.id, token="tok1")
    link2 = self._create_link(self.user.id, token="tok2")
    self._create_file_link_relation(f.id, link1.id)

    result = self.repo.get_by_id_and_link(f.id, link2.id)
    self.assertIsNone(result, "should return None for unassociated link")

  def test_list_by_link(self):
    """list_by_link should return files associated with a link."""
    link = self._create_link(self.user.id)
    f1 = self._create_file(self.user.id)
    f2 = self._create_file(self.user.id)
    self._create_file_link_relation(f1.id, link.id)
    self._create_file_link_relation(f2.id, link.id)

    result = self.repo.list_by_link(link.id)
    self.assertEqual(len(result), 2, "should return both files")

  def test_list_by_link_with_file_ids_filter(self):
    """list_by_link should filter by file_ids when provided."""
    link = self._create_link(self.user.id)
    f1 = self._create_file(self.user.id)
    f2 = self._create_file(self.user.id)
    self._create_file_link_relation(f1.id, link.id)
    self._create_file_link_relation(f2.id, link.id)

    result = self.repo.list_by_link(link.id, file_ids=[f1.id])
    self.assertEqual(len(result), 1, "should return only specified file")
    self.assertEqual(result[0].id, f1.id, "file id should match filter")

  def test_list_by_link_excludes_deleted(self):
    """list_by_link should exclude deleted files by default."""
    link = self._create_link(self.user.id)
    f1 = self._create_file(self.user.id)
    f2 = self._create_file(self.user.id)
    self._create_file_link_relation(f1.id, link.id)
    self._create_file_link_relation(f2.id, link.id)
    f2.deleted_at = f2.created_at
    self.session.add(f2)
    self.session.commit()

    result = self.repo.list_by_link(link.id)
    self.assertEqual(len(result), 1, "should exclude deleted files")

  def test_list_by_link_include_deleted(self):
    """list_by_link with include_deleted=True should include deleted files."""
    link = self._create_link(self.user.id)
    f1 = self._create_file(self.user.id)
    f2 = self._create_file(self.user.id)
    self._create_file_link_relation(f1.id, link.id)
    self._create_file_link_relation(f2.id, link.id)
    f2.deleted_at = f2.created_at
    self.session.add(f2)
    self.session.commit()

    result = self.repo.list_by_link(link.id, include_deleted=True)
    self.assertEqual(len(result), 2, "should include deleted files")

  def test_filename_stored_by_user_count(self):
    """filename_stored_by_user_count should count matching files."""
    self._create_file(self.user.id, original_name="unique", display_name="unique")
    self._create_file(self.user.id, original_name="dup", display_name="dup (1)")

    count = self.repo.filename_stored_by_user_count("unique", self.user.id, None)
    self.assertEqual(count, 1, "only the matching active file should be counted")

  def test_get_deleted_file_by_checksum_and_user(self):
    """get_deleted_file_by_checksum_and_user should find deleted file by checksum."""
    f = self._create_file(self.user.id, checksum="abc123sum", display_name="test")
    f.deleted_at = f.created_at
    self.session.add(f)
    self.session.commit()

    result = self.repo.get_deleted_file_by_checksum_and_user(
      "abc123sum", "test", self.user.id
    )
    self.assertIsNotNone(
      result, "should find deleted file by checksum and display_name"
    )
    self.assertEqual(result.id, f.id, "file id should match")

  def test_get_deleted_file_by_checksum_returns_none_for_active(self):
    """get_deleted_file_by_checksum should return None for active (non-deleted) files."""
    self._create_file(self.user.id, checksum="abc123sum", display_name="test")

    result = self.repo.get_deleted_file_by_checksum_and_user(
      "abc123sum", "test", self.user.id
    )
    self.assertIsNone(result, "should return None for non-deleted file")

  def test_get_by_multiple_ids_and_link(self):
    """get_by_multiple_ids_and_link should return files associated with a link."""
    link = self._create_link(self.user.id)
    f1 = self._create_file(self.user.id)
    f2 = self._create_file(self.user.id)
    self._create_file_link_relation(f1.id, link.id)
    self._create_file_link_relation(f2.id, link.id)

    result = self.repo.get_by_multiple_ids_and_link([f1.id, f2.id], link.id)
    self.assertEqual(
      len(result), 2, "should return both files associated with the link"
    )
    result_ids = {r.id for r in result}
    self.assertIn(f1.id, result_ids, "f1 should be in results")
    self.assertIn(f2.id, result_ids, "f2 should be in results")

  def test_get_by_multiple_ids_and_link_empty_input(self):
    """get_by_multiple_ids_and_link should return empty list for empty input."""
    link = self._create_link(self.user.id)
    result = self.repo.get_by_multiple_ids_and_link([], link.id)
    self.assertEqual(result, [], "empty input should return empty list")

  def test_get_by_multiple_ids_and_link_excludes_deleted(self):
    """get_by_multiple_ids_and_link should exclude soft-deleted files."""
    link = self._create_link(self.user.id)
    f1 = self._create_file(self.user.id)
    f2 = self._create_file(self.user.id)
    f2.deleted_at = f2.created_at
    self.session.add(f2)
    self.session.commit()
    self._create_file_link_relation(f1.id, link.id)
    self._create_file_link_relation(f2.id, link.id)

    result = self.repo.get_by_multiple_ids_and_link([f1.id, f2.id], link.id)
    self.assertEqual(len(result), 1, "should exclude deleted file")
    self.assertEqual(result[0].id, f1.id, "only non-deleted file should be returned")

  def test_get_by_multiple_ids_and_link_excludes_other_link(self):
    """get_by_multiple_ids_and_link should not return files from other links."""
    link1 = self._create_link(self.user.id, token="link1-token")
    link2 = self._create_link(self.user.id, token="link2-token")
    f = self._create_file(self.user.id)
    self._create_file_link_relation(f.id, link1.id)

    result = self.repo.get_by_multiple_ids_and_link([f.id], link2.id)
    self.assertEqual(result, [], "should not return file from a different link")

  def test_list_by_link_with_folder(self):
    """list_by_link_with_folder should return files with their folder info."""
    link = self._create_link(self.user.id)
    folder = self._create_folder(self.user.id, name="LinkedFolder")
    f = self._create_file(self.user.id, folder_id=folder.id)
    self._create_file_link_relation(f.id, link.id)

    result = self.repo.list_by_link_with_folder(link.id)
    self.assertEqual(len(result), 1, "should return the linked file")
    self.assertEqual(result[0].id, f.id, "file id should match")

  def test_list_by_link_with_folder_include_deleted(self):
    """list_by_link_with_folder with include_deleted should return deleted files."""
    link = self._create_link(self.user.id)
    f = self._create_file(self.user.id)
    f.deleted_at = f.created_at
    self.session.add(f)
    self.session.commit()
    self._create_file_link_relation(f.id, link.id)

    result = self.repo.list_by_link_with_folder(link.id, include_deleted=True)
    self.assertEqual(
      len(result), 1, "should include deleted files when include_deleted=True"
    )

  def test_list_by_link_with_folder_excludes_deleted_by_default(self):
    """list_by_link_with_folder should exclude deleted files by default."""
    link = self._create_link(self.user.id)
    f = self._create_file(self.user.id)
    f.deleted_at = f.created_at
    self.session.add(f)
    self.session.commit()
    self._create_file_link_relation(f.id, link.id)

    result = self.repo.list_by_link_with_folder(link.id)
    self.assertEqual(len(result), 0, "should exclude deleted files by default")

  def test_list_folder_orphans_by_user_returns_active(self):
    """list_folder_orphans_by_user should return active files with no folder."""
    f1 = self._create_file(self.user.id, folder_id=None)
    folder = self._create_folder(self.user.id)
    self._create_file(self.user.id, folder_id=folder.id)

    result = self.repo.list_folder_orphans_by_user(self.user.id)
    self.assertEqual(len(result), 1, "should return only folder-less files")
    self.assertEqual(result[0].id, f1.id, "should return the orphan file")

  def test_list_folder_orphans_by_user_deleted(self):
    """list_folder_orphans_by_user with deleted=True should return deleted orphans."""
    f = self._create_file(self.user.id, folder_id=None)
    f.deleted_at = f.created_at
    self.session.add(f)
    self.session.commit()

    result = self.repo.list_folder_orphans_by_user(self.user.id, deleted=True)
    self.assertEqual(len(result), 1, "should return deleted orphans")
    self.assertEqual(result[0].id, f.id, "should return the deleted orphan file")

  def test_list_folder_orphans_by_user_empty(self):
    """list_folder_orphans_by_user should return empty for user with no orphans."""
    result = self.repo.list_folder_orphans_by_user(self.user.id)
    self.assertEqual(result, [], "should return empty list for no orphans")


class TestFileModel(unittest.TestCase):
  def test_folder_id_setter_updates_parent_id(self):
    """File.folder_id setter should update parent_id."""
    from uuid import uuid4

    from app.models import File

    folder_id = uuid4()
    f = File(
      user_id=uuid4(),
      original_name="setter.txt",
      display_name="setter",
      object_key="pk/setter",
    )
    f.folder_id = folder_id
    self.assertEqual(f.parent_id, folder_id, "parent_id should be set via folder_id")
    self.assertEqual(f.folder_id, folder_id, "folder_id getter should return parent_id")


if __name__ == "__main__":
  unittest.main()
