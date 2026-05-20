import unittest

from app.models import Folder
from app.repositories import FolderRepository
from app.tests.unit.helpers import DatabaseTestCase, get_test_settings


class TestFolderRepository(DatabaseTestCase):
  def setUp(self):
    super().setUp()
    self.repo = FolderRepository(self.session, get_test_settings())
    self.user = self._create_user(email="folderrepo@test.com")

  def test_get_by_ids_returns_folders(self):
    """get_by_ids should return folders matching the given IDs."""
    f1 = self._create_folder(self.user.id, name="Folder 1")
    f2 = self._create_folder(self.user.id, name="Folder 2")
    result = self.repo.get_by_ids([f1.id, f2.id], self.user.id)
    self.assertEqual(len(result), 2, "should return both folders")
    names = {r.name for r in result}
    self.assertIn("Folder 1", names, "Folder 1 should be in results")
    self.assertIn("Folder 2", names, "Folder 2 should be in results")

  def test_get_by_ids_empty_input(self):
    """get_by_ids should return empty list for empty input."""
    result = self.repo.get_by_ids([], self.user.id)
    self.assertEqual(result, [], "empty input should return empty list")

  def test_get_by_ids_excludes_other_users(self):
    """get_by_ids should exclude folders belonging to other users."""
    other_user = self._create_user(email="other@test.com")
    f = self._create_folder(other_user.id, name="Other's Folder")
    result = self.repo.get_by_ids([f.id], self.user.id)
    self.assertEqual(result, [], "should not return other user's folder")

  def test_list_by_user_returns_active_folders(self):
    """list_by_user should return non-deleted top-level folders."""
    self._create_folder(self.user.id, name="Active")
    result = self.repo.list_by_user(self.user.id)
    self.assertEqual(len(result), 1, "should return active folders")

  def test_list_by_user_deleted_true(self):
    """list_by_user with deleted=True should return deleted folders."""
    f = self._create_folder(self.user.id, name="Deleted")
    f.deleted_at = f.created_at
    self.session.add(f)
    self.session.commit()
    result = self.repo.list_by_user(self.user.id, deleted=True)
    self.assertEqual(len(result), 1, "should return deleted folders")

  def test_list_by_multiple_ids_and_user(self):
    """list_by_multiple_ids_and_user should return active folders by ids."""
    f = self._create_folder(self.user.id)
    result = self.repo.list_by_multiple_ids_and_user([f.id], self.user.id)
    self.assertEqual(len(result), 1, "should return the folder")

  def test_list_by_multiple_ids_and_user_empty(self):
    """list_by_multiple_ids_and_user should return empty for empty list."""
    result = self.repo.list_by_multiple_ids_and_user([], self.user.id)
    self.assertEqual(result, [], "empty input should return empty list")

  def test_delete_children_soft_deletes(self):
    """delete_children should soft-delete all child folders."""
    parent = self._create_folder(self.user.id, name="Parent")
    child = self._create_folder(self.user.id, name="Child", parent_id=parent.id)
    self.repo.delete_children(parent.id)
    self.session.refresh(child)
    self.assertIsNotNone(child.deleted_at, "child should be soft-deleted")

  def test_get_all_descendant_ids(self):
    """get_all_descendant_ids should recursively find all descendants."""
    root = self._create_folder(self.user.id)
    child = self._create_folder(self.user.id, name="Child", parent_id=root.id)
    grandchild = self._create_folder(self.user.id, name="GC", parent_id=child.id)
    ids = self.repo.get_all_descendant_ids(root.id)
    self.assertIn(root.id, ids, "root should be in descendants")
    self.assertIn(child.id, ids, "child should be in descendants")
    self.assertIn(grandchild.id, ids, "grandchild should be in descendants")

  def test_get_files_by_folder_ids(self):
    """get_files_by_folder_ids should return files belonging to given folders."""
    folder = self._create_folder(self.user.id)
    f = self._create_file(self.user.id, folder_id=folder.id)
    result = self.repo.get_files_by_folder_ids([folder.id])
    self.assertEqual(len(result), 1, "should return file in folder")
    self.assertEqual(result[0].id, f.id, "file id should match")

  def test_foldername_stored_by_user_count(self):
    """foldername_stored_by_user_count should count matching folder names."""
    self._create_folder(self.user.id, name="MyFolder")
    count = self.repo.foldername_stored_by_user_count("MyFolder", self.user.id, None)
    self.assertEqual(count, 1, "only the matching active folder should be counted")

  def test_foldername_stored_by_user_count_nonexistent(self):
    """foldername_stored_by_user_count should return 0 for nonexistent."""
    count = self.repo.foldername_stored_by_user_count("NoSuch", self.user.id, None)
    self.assertEqual(count, 0, "nonexistent name should return 0")

  def test_delete_permanently(self):
    """delete_permanently should hard-delete a folder."""
    folder = self._create_folder(self.user.id)
    folder_id = folder.id
    self.repo.delete_permanently(folder_id)
    result = self.session.get(Folder, folder_id)
    self.assertIsNone(result, "folder should be permanently deleted")

  def test_delete_by_id(self):
    """delete_by_id should delete a folder by its ID."""
    folder = self._create_folder(self.user.id, name="ToDelete")
    folder_id = folder.id
    self.repo.delete_by_id(folder_id)
    self.session.commit()
    result = self.session.get(Folder, folder_id)
    self.assertIsNone(result, "folder should be deleted after delete_by_id")

  def test_delete_by_id_nonexistent(self):
    """delete_by_id should not raise for nonexistent folder ID."""
    from uuid import uuid4

    self.assertIsNone(self.repo.delete_by_id(uuid4()))
    self.assertEqual(
      self.repo.list_by_user(self.user.id),
      [],
      "deleting a nonexistent folder should not affect existing state",
    )

  def test_soft_delete_by_ids(self):
    """soft_delete_by_ids should set deleted_at on given folders."""
    f1 = self._create_folder(self.user.id, name="SoftDel1")
    f2 = self._create_folder(self.user.id, name="SoftDel2")

    self.repo.soft_delete_by_ids([f1.id, f2.id])
    self.session.refresh(f1)
    self.session.refresh(f2)
    self.assertIsNotNone(f1.deleted_at, "f1 should be soft-deleted")
    self.assertIsNotNone(f2.deleted_at, "f2 should be soft-deleted")

  def test_restore_by_ids_empty_list(self):
    """restore_by_ids should return early when folder_ids is empty."""
    deleted_folder = self._create_folder(self.user.id, name="StillDeleted")
    deleted_folder.deleted_at = deleted_folder.created_at
    self.session.add(deleted_folder)
    self.session.commit()

    self.assertIsNone(self.repo.restore_by_ids([]))
    self.session.refresh(deleted_folder)
    self.assertIsNotNone(
      deleted_folder.deleted_at,
      "empty restore input should not restore any folder",
    )


if __name__ == "__main__":
  unittest.main()
