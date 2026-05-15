import unittest
from uuid import uuid4

from pydantic import ValidationError

from app.schemas import FolderParams, FolderUpdateParams


class TestFolderParams(unittest.TestCase):
  def test_valid_with_name_only(self):
    """FolderParams should accept just a name."""
    params = FolderParams(name="My Folder")
    self.assertEqual(params.name, "My Folder", "name should match input")
    self.assertIsNone(params.parent_id, "parent_id should default to None")

  def test_valid_with_name_and_parent_id(self):
    """FolderParams should accept name and parent_id."""
    parent_id = uuid4()
    params = FolderParams(name="Subfolder", parent_id=parent_id)
    self.assertEqual(params.name, "Subfolder", "name should match input")
    self.assertEqual(params.parent_id, parent_id, "parent_id should match input")

  def test_missing_name_raises(self):
    """FolderParams should require a name field."""
    with self.assertRaises(
      ValidationError, msg="missing name should raise ValidationError"
    ):
      FolderParams()

  def test_from_attributes_config(self):
    """FolderParams should support from_attributes config."""
    self.assertTrue(
      FolderParams.model_config.get("from_attributes"), "from_attributes should be True"
    )


class TestFolderUpdateParams(unittest.TestCase):
  def test_all_fields_default_to_none(self):
    """FolderUpdateParams should have all optional fields default to None."""
    params = FolderUpdateParams()
    self.assertIsNone(params.name, "name should default to None")
    self.assertIsNone(params.parent_id, "parent_id should default to None")

  def test_valid_with_name(self):
    """FolderUpdateParams should accept only a name update."""
    params = FolderUpdateParams(name="New Name")
    self.assertEqual(params.name, "New Name", "name should match input")
    self.assertIsNone(params.parent_id, "parent_id should default to None")

  def test_valid_with_parent_id(self):
    """FolderUpdateParams should accept only a parent_id update."""
    parent_id = uuid4()
    params = FolderUpdateParams(parent_id=parent_id)
    self.assertEqual(params.parent_id, parent_id, "parent_id should match input")
    self.assertIsNone(params.name, "name should default to None")

  def test_valid_with_none_parent_id(self):
    """FolderUpdateParams should accept explicit None for parent_id."""
    params = FolderUpdateParams(parent_id=None)
    self.assertIsNone(params.parent_id, "parent_id should be None")

  def test_valid_with_both(self):
    """FolderUpdateParams should accept both name and parent_id."""
    parent_id = uuid4()
    params = FolderUpdateParams(name="New Name", parent_id=parent_id)
    self.assertEqual(params.name, "New Name", "name should match input")
    self.assertEqual(params.parent_id, parent_id, "parent_id should match input")

  def test_from_attributes_config(self):
    """FolderUpdateParams should support from_attributes config."""
    self.assertTrue(
      FolderUpdateParams.model_config.get("from_attributes"),
      "from_attributes should be True",
    )


if __name__ == "__main__":
  unittest.main()
