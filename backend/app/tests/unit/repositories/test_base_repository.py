import unittest
from uuid import uuid4

from app.models import File, User
from app.repositories.base_repository import BaseRepository
from app.tests.unit.helpers import DatabaseTestCase


class TestBaseRepository(DatabaseTestCase):
  def setUp(self):
    super().setUp()

    self.repo = BaseRepository[User](self.session)
    self.repo.model = User

  def test_add_entity(self):
    """add should persist an entity to the session."""
    user = User(name="Test", email="add@test.com", hashed_password="hash")
    result = self.repo.add(user)
    self.assertIsNotNone(result, "add should return the entity")
    self.assertEqual(result.name, "Test", "added entity should have the same name")

  def test_add_all_entities(self):
    """add_all should persist multiple entities."""
    users = [
      User(name="A", email="a@test.com", hashed_password="hash"),
      User(name="B", email="b@test.com", hashed_password="hash"),
    ]
    result = self.repo.add_all(users)
    self.assertEqual(len(result), 2, "add_all should return all entities")
    self.assertEqual(result[0].name, "A", "first entity name should match")

  def test_commit(self):
    """commit should flush changes to the database."""
    user = User(name="Test", email="commit@test.com", hashed_password="hash")
    self.repo.add(user)
    self.repo.commit()
    retrieved = self.session.get(User, user.id)
    self.assertIsNotNone(retrieved, "committed entity should be retrievable")

  def test_refresh(self):
    """refresh should reload entity from the database."""
    user = User(name="Original", email="refresh@test.com", hashed_password="hash")
    self.repo.add(user)
    self.repo.commit()
    user.name = "Changed"
    self.assertEqual(user.name, "Changed", "in-memory change should be visible")
    self.repo.refresh(user)
    self.assertEqual(user.name, "Original", "refresh should restore database value")

  def test_rollback(self):
    """rollback should undo uncommitted changes."""
    user = User(name="Test", email="rollback@test.com", hashed_password="hash")
    self.repo.add(user)
    self.repo.rollback()
    user_id = user.id
    retrieved = self.session.get(User, user_id)
    self.assertIsNone(retrieved, "rolled-back entity should not be in database")

  def test_save(self):
    """save should add, commit, and refresh an entity."""
    user = User(name="Test", email="save@test.com", hashed_password="hash")
    result = self.repo.save(user)
    self.assertIsNotNone(result.id, "saved entity should have an id")
    retrieved = self.session.get(User, user.id)
    self.assertIsNotNone(retrieved, "saved entity should be in database")

  def test_save_all(self):
    """save_all should add, commit, and refresh multiple entities."""
    users = [
      User(name="A", email="saveall_a@test.com", hashed_password="hash"),
      User(name="B", email="saveall_b@test.com", hashed_password="hash"),
    ]
    result = self.repo.save_all(users)
    self.assertEqual(len(result), 2, "save_all should return all entities")
    for u in result:
      self.assertIsNotNone(u.id, "each saved entity should have an id")

  def test_hard_delete(self):
    """hard_delete should mark entity for deletion."""
    user = self._create_user(name="Del", email="harddel@test.com")
    self.repo.hard_delete(user)
    self.repo.commit()
    retrieved = self.session.get(User, user.id)
    self.assertIsNone(retrieved, "hard-deleted entity should not exist in database")

  def test_get_by_id_returns_none_for_nonexistent(self):
    """get_by_id should return None for nonexistent IDs."""
    result = self.repo.get_by_id(uuid4())
    self.assertIsNone(result, "get_by_id should return None for nonexistent id")

  def test_get_by_id_returns_entity(self):
    """get_by_id should return the entity if it exists."""
    user = self._create_user(name="Found", email="found@test.com")
    result = self.repo.get_by_id(user.id)
    self.assertIsNotNone(result, "get_by_id should return existing entity")
    self.assertEqual(
      result.email, "found@test.com", "returned entity should match stored entity"
    )


class TestSoftDeleteByParents(DatabaseTestCase):
  def setUp(self):
    super().setUp()
    self.repo = BaseRepository[File](self.session)
    self.repo.model = File
    self.user = self._create_user(email="softdel@test.com")

  def test_soft_delete_by_parents_sets_deleted_at(self):
    """soft_delete_by_parents should set deleted_at on all matching entities."""
    folder = self._create_folder(self.user.id)
    f1 = self._create_file(self.user.id, folder_id=folder.id)
    f2 = self._create_file(self.user.id, folder_id=folder.id)

    self.repo.soft_delete_by_parents([folder.id])
    self.session.refresh(f1)
    self.session.refresh(f2)
    self.assertIsNotNone(f1.deleted_at, "f1 should be soft-deleted")
    self.assertIsNotNone(f2.deleted_at, "f2 should be soft-deleted")


if __name__ == "__main__":
  unittest.main()
