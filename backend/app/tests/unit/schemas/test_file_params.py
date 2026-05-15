import unittest
from uuid import uuid4

from app.schemas import FileListParams, FileUpdateParams


class TestFileUpdateParams(unittest.TestCase):
  def test_valid_with_name_and_folder(self):
    """FileUpdateParams should accept both original_name and folder_id."""
    folder_id = uuid4()
    params = FileUpdateParams(original_name="new_name", folder_id=folder_id)
    self.assertEqual(
      params.original_name, "new_name", "original_name should match input"
    )
    self.assertEqual(params.folder_id, folder_id, "folder_id should match input")

  def test_valid_with_name_only(self):
    """FileUpdateParams should accept only original_name."""
    params = FileUpdateParams(original_name="new_name")
    self.assertEqual(
      params.original_name, "new_name", "original_name should match input"
    )
    self.assertIsNone(params.folder_id, "folder_id should default to None")

  def test_valid_with_folder_only(self):
    """FileUpdateParams should accept only folder_id."""
    folder_id = uuid4()
    params = FileUpdateParams(folder_id=folder_id)
    self.assertEqual(params.folder_id, folder_id, "folder_id should match input")
    self.assertIsNone(params.original_name, "original_name should default to None")

  def test_valid_with_none_folder(self):
    """FileUpdateParams should accept explicit None for folder_id."""
    params = FileUpdateParams(folder_id=None)
    self.assertIsNone(params.folder_id, "folder_id should be None")

  def test_blank_original_name_raises(self):
    """FileUpdateParams should reject blank/whitespace-only original_name."""
    with self.assertRaises(
      ValueError, msg="blank original_name should raise ValueError"
    ):
      FileUpdateParams(original_name="   ")

  def test_original_name_strips_whitespace(self):
    """FileUpdateParams should strip whitespace from original_name."""
    params = FileUpdateParams(original_name="  hello  ")
    self.assertEqual(
      params.original_name, "hello", "original_name should be stripped of whitespace"
    )

  def test_from_attributes_config(self):
    """FileUpdateParams should support from_attributes config."""
    self.assertTrue(
      FileUpdateParams.model_config.get("from_attributes"),
      "from_attributes should be True",
    )


class TestFileListParams(unittest.TestCase):
  def test_defaults(self):
    """FileListParams should default deleted and by_folder to False."""
    params = FileListParams()
    self.assertFalse(params.deleted, "deleted should default to False")
    self.assertFalse(params.by_folder, "by_folder should default to False")

  def test_deleted_true(self):
    """FileListParams should accept deleted=True."""
    params = FileListParams(deleted=True)
    self.assertTrue(params.deleted, "deleted should be True")

  def test_by_folder_true(self):
    """FileListParams should accept by_folder=True."""
    params = FileListParams(by_folder=True)
    self.assertTrue(params.by_folder, "by_folder should be True")

  def test_both_true(self):
    """FileListParams should accept both flags as True."""
    params = FileListParams(deleted=True, by_folder=True)
    self.assertTrue(params.deleted, "deleted should be True")
    self.assertTrue(params.by_folder, "by_folder should be True")

  def test_from_attributes_config(self):
    """FileListParams should support from_attributes config."""
    self.assertTrue(
      FileListParams.model_config.get("from_attributes"),
      "from_attributes should be True",
    )


if __name__ == "__main__":
  unittest.main()
