import unittest
from unittest.mock import MagicMock
from uuid import uuid4

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.services.folder_service import FolderService
from app.tests.unit.helpers import DatabaseTestCase


class TestFolderService(DatabaseTestCase):
  def setUp(self):
    super().setUp()
    from app.repositories import FileRepository, FolderRepository

    self.repo = FolderRepository(self.session)
    self.file_repo = FileRepository(self.session)
    self.file_service = MagicMock()
    self.storage = MagicMock()
    self.service = FolderService(
      self.repo,
      self.file_repo,
      self.file_service,
      self.storage,
    )
    self.user = self._create_user(email="foldersvc@test.com")

  def test_list_folders_returns_folders(self):
    """list_folders should return user's folders."""
    self._create_folder(self.user.id, name="My Folder")
    result = self.service.list_folders(self.user)
    self.assertEqual(len(result), 1, "should return 1 folder")
    self.assertEqual(result[0].name, "My Folder", "folder name should match")

  def test_list_folders_empty_for_new_user(self):
    """list_folders should return empty list for user with no folders."""
    result = self.service.list_folders(self.user)
    self.assertEqual(result, [], "should return empty list for new user")

  def test_create_folder_success(self):
    """create_folder should create a new folder."""
    from app.schemas import FolderParams

    params = FolderParams(name="New Folder")
    folder = self.service.create_folder(self.user, params)
    self.assertIsNotNone(folder.id, "folder should have an id")
    self.assertEqual(folder.name, "New Folder", "folder name should match")

  def test_create_folder_with_parent(self):
    """create_folder should handle parent_id."""
    parent = self._create_folder(self.user.id, name="Parent")
    from app.schemas import FolderParams

    params = FolderParams(name="Child", parent_id=parent.id)
    folder = self.service.create_folder(self.user, params)
    self.assertEqual(folder.parent_id, parent.id, "parent_id should be set")

  def test_create_folder_with_nonexistent_parent_raises(self):
    """create_folder should raise NotFoundError for nonexistent parent."""
    from app.schemas import FolderParams

    params = FolderParams(name="Orphan", parent_id=uuid4())
    with self.assertRaises(
      NotFoundError, msg="nonexistent parent should raise NotFoundError"
    ):
      self.service.create_folder(self.user, params)

  def test_create_folder_with_other_user_parent_raises(self):
    """create_folder should raise ForbiddenError for other user's parent."""
    other_user = self._create_user(email="other@test.com")
    parent = self._create_folder(other_user.id, name="Other's")
    from app.schemas import FolderParams

    params = FolderParams(name="Child", parent_id=parent.id)
    with self.assertRaises(
      ForbiddenError, msg="other user's parent should raise ForbiddenError"
    ):
      self.service.create_folder(self.user, params)

  def test_update_folder_name(self):
    """update_folder should update the folder name."""
    folder = self._create_folder(self.user.id, name="Old")
    from app.schemas import FolderUpdateParams

    params = FolderUpdateParams(name="New")
    updated = self.service.update_folder(self.user, folder.id, params)
    self.assertEqual(updated.name, "New", "folder name should be updated")

  def test_update_folder_other_user_raises(self):
    """update_folder should raise ForbiddenError for other user's folder."""
    other_user = self._create_user(email="other@test.com")
    folder = self._create_folder(other_user.id, name="Other's")
    from app.schemas import FolderUpdateParams

    params = FolderUpdateParams(name="Hijacked")
    with self.assertRaises(
      ForbiddenError, msg="other user's folder should raise ForbiddenError"
    ):
      self.service.update_folder(self.user, folder.id, params)

  def test_update_folder_self_parent_raises(self):
    """update_folder should raise ConflictError when setting self as parent."""
    folder = self._create_folder(self.user.id, name="Self")
    from app.schemas import FolderUpdateParams

    params = FolderUpdateParams(parent_id=folder.id)
    with self.assertRaises(ConflictError, msg="self-parent should raise ConflictError"):
      self.service.update_folder(self.user, folder.id, params)

  def test_update_folder_descendant_parent_raises(self):
    """update_folder should raise ConflictError when setting descendant as parent."""
    parent = self._create_folder(self.user.id, name="Parent")
    child = self._create_folder(self.user.id, name="Child", parent_id=parent.id)
    from app.schemas import FolderUpdateParams

    params = FolderUpdateParams(parent_id=child.id)
    with self.assertRaises(
      ConflictError, msg="descendant parent should raise ConflictError"
    ):
      self.service.update_folder(self.user, folder_id=parent.id, params=params)

  def test_delete_folder_soft(self):
    """delete_folder should soft-delete a folder."""
    folder = self._create_folder(self.user.id)
    result = self.service.delete_folder(self.user, folder.id)
    self.assertIsNotNone(
      result.deleted_at, "soft-deleted folder should have deleted_at set"
    )

  def test_delete_folder_permanent(self):
    """delete_folder with permanent=True should call hard_delete."""
    folder = self._create_folder(self.user.id)
    folder_id = folder.id
    result = self.service.delete_folder(self.user, folder_id, permanent=True)
    self.assertIsNone(result, "permanent delete should return None")

  def test_delete_folder_already_deleted(self):
    """delete_folder should return folder if already deleted."""
    folder = self._create_folder(self.user.id)
    folder.deleted_at = folder.created_at
    self.session.add(folder)
    self.session.commit()
    result = self.service.delete_folder(self.user, folder.id)
    self.assertIsNotNone(result, "should return already-deleted folder")

  def test_restore_folder(self):
    """restore_folder should restore a soft-deleted folder."""
    folder = self._create_folder(self.user.id)
    folder.deleted_at = folder.created_at
    self.session.add(folder)
    self.session.commit()

    result = self.service.restore_folder(self.user, folder.id)
    self.assertIsNotNone(result, "should return FolderWithFilesResponse")

  def test_restore_folder_already_active(self):
    """restore_folder should return response even for active folder."""
    folder = self._create_folder(self.user.id)
    result = self.service.restore_folder(self.user, folder.id)
    self.assertIsNotNone(result, "should return response for active folder")

  def test_get_folder_nonexistent_raises(self):
    """_get_folder should raise NotFoundError for nonexistent folder."""
    with self.assertRaises(
      NotFoundError, msg="nonexistent folder should raise NotFoundError"
    ):
      self.service._get_folder(uuid4())

  def test_ensure_not_descendant_not_descendant(self):
    """_ensure_not_descendant should not raise when not a descendant."""
    f1 = self._create_folder(self.user.id, name="F1")
    f2 = self._create_folder(self.user.id, name="F2")
    try:
      self.service._ensure_not_descendant(f1.id, f2.id)
    except ConflictError:
      self.fail("should not raise for unrelated folders")

  def test_ensure_not_descendant_when_is_descendant(self):
    """_ensure_not_descendant should raise when potential parent IS a descendant."""
    root = self._create_folder(self.user.id, name="Root")
    child = self._create_folder(self.user.id, name="Child", parent_id=root.id)
    grandchild = self._create_folder(
      self.user.id, name="Grandchild", parent_id=child.id
    )

    with self.assertRaises(
      ConflictError, msg="should raise when potential parent is a descendant"
    ):
      self.service._ensure_not_descendant(root.id, grandchild.id)

  def test_update_folder_parent_id_clearing(self):
    """update_folder should clear parent_id when set to None."""
    parent = self._create_folder(self.user.id, name="Parent")
    folder = self._create_folder(self.user.id, name="Child", parent_id=parent.id)
    from app.schemas import FolderUpdateParams

    params = FolderUpdateParams(parent_id=None)
    updated = self.service.update_folder(self.user, folder.id, params)
    self.assertIsNone(updated.parent_id, "parent_id should be cleared to None")

  def test_update_folder_parent_id_set_to_other(self):
    """update_folder should set parent_id to a valid new parent."""
    folder = self._create_folder(self.user.id, name="Movable")
    new_parent = self._create_folder(self.user.id, name="NewParent")
    from app.schemas import FolderUpdateParams

    params = FolderUpdateParams(parent_id=new_parent.id)
    updated = self.service.update_folder(self.user, folder.id, params)
    self.assertEqual(
      updated.parent_id, new_parent.id, "parent_id should be updated to new parent"
    )

  def test_clone_folder(self):
    """clone_folder should recursively clone a folder with files."""
    from app.models import File

    folder = self._create_folder(self.user.id, name="Source")
    f = self._create_file(
      self.user.id, display_name="clone-me.txt", folder_id=folder.id
    )

    self.file_service.clone_files.return_value = [
      File(
        id=uuid4(),
        user_id=self.user.id,
        display_name="clone-me.txt",
        original_name="clone-me.txt",
        content_type=f.content_type,
        size_bytes=f.size_bytes,
        checksum=f.checksum,
        object_key=f"users/{self.user.id}/files/{uuid4()}",
        folder_id=None,
      )
    ]

    clone = self.service.clone_folder(self.user, folder)
    self.assertIsNotNone(clone)
    self.assertNotEqual(clone.id, folder.id, "clone should have new id")
    self.file_service.clone_files.assert_called()

  def test_clone_folders(self):
    """clone_folders should clone multiple folders by id."""
    folder = self._create_folder(self.user.id, name="BatchSource")
    link = self._create_link(self.user.id, token="clonefolders_link")
    self._create_folder_link_relation(folder.id, link.id)

    clones = self.service.clone_folders(self.user, link, [folder.id])
    self.assertEqual(len(clones), 1, "should clone the folder")

  def test_clone_folder_deleted_raises(self):
    """clone_folder should raise GoneError when folder is deleted."""
    folder = self._create_folder(self.user.id, name="DeletedSource")
    folder.deleted_at = folder.created_at
    self.session.add(folder)
    self.session.commit()

    with self.assertRaises(Exception, msg="cloning deleted folder should raise"):
      self.service.clone_folder(self.user, folder)

  def test_update_folder_nonexistent_parent_raises(self):
    """update_folder should raise NotFoundError for nonexistent new parent."""
    folder = self._create_folder(self.user.id, name="Folder")
    from app.schemas import FolderUpdateParams

    params = FolderUpdateParams(parent_id=uuid4())
    with self.assertRaises(
      NotFoundError, msg="nonexistent parent should raise NotFoundError"
    ):
      self.service.update_folder(self.user, folder.id, params)

  def test_delete_folder_permanent_with_files(self):
    """delete_folder permanent should delete storage objects of all files."""
    folder = self._create_folder(self.user.id, name="WithFiles")
    f = self._create_file(self.user.id, display_name="del-me.txt", folder_id=folder.id)
    f.object_key = f"users/{self.user.id}/files/{f.id}"
    self.session.add(f)
    self.session.commit()

    self.service.delete_folder(self.user, folder.id, permanent=True)
    self.storage.delete_all_versions.assert_called()

  def test_delete_folder_permanent_with_preview_files(self):
    """delete_folder permanent should also delete preview objects."""
    folder = self._create_folder(self.user.id, name="WithPreviewFiles")
    f = self._create_file(
      self.user.id,
      display_name="preview-me.txt",
      folder_id=folder.id,
      content_type="image/png",
    )
    f.object_key = f"users/{self.user.id}/files/{f.id}"
    f.preview_object_key = f"users/{self.user.id}/previews/{f.id}"
    self.session.add(f)
    self.session.commit()

    self.service.delete_folder(self.user, folder.id, permanent=True)
    self.storage.delete_all_versions.assert_called()

  def test_delete_folder_with_children(self):
    """delete_folder should soft-delete folder and its children."""
    parent = self._create_folder(self.user.id, name="Parent")
    child = self._create_folder(self.user.id, name="Child", parent_id=parent.id)

    result = self.service.delete_folder(self.user, parent.id)
    self.assertIsNotNone(result.deleted_at, "parent should be soft-deleted")
    self.session.refresh(child)
    self.assertIsNotNone(child.deleted_at, "child should be soft-deleted")

  def test_clone_folder_with_children(self):
    """clone_folder should recursively clone a folder with child folders."""
    parent = self._create_folder(self.user.id, name="Root")
    self._create_folder(self.user.id, name="Child", parent_id=parent.id)

    self.session.expire(parent, ["children"])

    self.file_service.clone_files.return_value = []

    clone = self.service.clone_folder(self.user, parent)
    self.assertIsNotNone(clone)
    self.assertNotEqual(clone.id, parent.id, "clone should have new id")


if __name__ == "__main__":
  unittest.main()
