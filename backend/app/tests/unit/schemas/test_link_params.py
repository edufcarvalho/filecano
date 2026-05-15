import unittest
from datetime import datetime, timezone
from uuid import uuid4

from pydantic import ValidationError

from app.schemas import (
  CloningParams,
  LinkCreateParams,
  LinkRestoreParams,
  LinkUpdateParams,
)


class TestLinkUpdateParams(unittest.TestCase):
  def test_valid_with_custom_name(self):
    """LinkUpdateParams should accept a custom_name."""
    params = LinkUpdateParams(custom_name="my-link")
    self.assertEqual(params.custom_name, "my-link", "custom_name should match input")

  def test_missing_custom_name_raises(self):
    """LinkUpdateParams should require custom_name."""
    with self.assertRaises(ValidationError, msg="missing custom_name should raise"):
      LinkUpdateParams()

  def test_empty_custom_name_accepted(self):
    """LinkUpdateParams accepts empty custom_name (no validation rule)."""
    params = LinkUpdateParams(custom_name="")
    self.assertEqual(params.custom_name, "", "empty custom_name is technically valid")

  def test_from_attributes_config(self):
    """LinkUpdateParams should support from_attributes config."""
    self.assertTrue(
      LinkUpdateParams.model_config.get("from_attributes"),
      "from_attributes should be True",
    )


class TestLinkCreateParams(unittest.TestCase):
  def test_valid_with_files_only(self):
    """LinkCreateParams should accept only files."""
    file_ids = [uuid4(), uuid4()]
    params = LinkCreateParams(files=file_ids)
    self.assertEqual(params.files, file_ids, "files should match input")
    self.assertIsNone(params.folders, "folders should default to None")

  def test_valid_with_folders_only(self):
    """LinkCreateParams should accept only folders."""
    folder_ids = [uuid4()]
    params = LinkCreateParams(folders=folder_ids)
    self.assertEqual(params.folders, folder_ids, "folders should match input")
    self.assertIsNone(params.files, "files should default to None")

  def test_valid_with_both(self):
    """LinkCreateParams should accept both files and folders."""
    file_ids = [uuid4()]
    folder_ids = [uuid4()]
    params = LinkCreateParams(files=file_ids, folders=folder_ids)
    self.assertEqual(params.files, file_ids, "files should match input")
    self.assertEqual(params.folders, folder_ids, "folders should match input")

  def test_valid_with_expires_at(self):
    """LinkCreateParams should accept a custom expires_at datetime."""
    future = datetime(2030, 1, 1, tzinfo=timezone.utc)
    params = LinkCreateParams(files=[uuid4()], expires_at=future)
    self.assertEqual(params.expires_at, future, "expires_at should match input")

  def test_neither_files_nor_folders_raises(self):
    """LinkCreateParams should require at least one file or folder."""
    with self.assertRaises(
      ValueError, msg="neither files nor folders should raise ValueError"
    ):
      LinkCreateParams()

  def test_both_empty_lists_raises(self):
    """LinkCreateParams should raise when both lists are empty."""
    with self.assertRaises(ValueError, msg="empty lists should raise ValueError"):
      LinkCreateParams(files=[], folders=[])

  def test_from_attributes_config(self):
    """LinkCreateParams should support from_attributes config."""
    self.assertTrue(
      LinkCreateParams.model_config.get("from_attributes"),
      "from_attributes should be True",
    )


class TestLinkRestoreParams(unittest.TestCase):
  def test_defaults_to_none_expires_at(self):
    """LinkRestoreParams should default expires_at to None."""
    params = LinkRestoreParams()
    self.assertIsNone(params.expires_at, "expires_at should default to None")

  def test_with_expires_at(self):
    """LinkRestoreParams should accept a custom expires_at."""
    future = datetime(2030, 1, 1, tzinfo=timezone.utc)
    params = LinkRestoreParams(expires_at=future)
    self.assertEqual(params.expires_at, future, "expires_at should match input")

  def test_from_attributes_config(self):
    """LinkRestoreParams should support from_attributes config."""
    self.assertTrue(
      LinkRestoreParams.model_config.get("from_attributes"),
      "from_attributes should be True",
    )


class TestCloningParams(unittest.TestCase):
  def test_defaults(self):
    """CloningParams should default files and folders to None."""
    params = CloningParams()
    self.assertIsNone(params.files, "files should default to None")
    self.assertIsNone(params.folders, "folders should default to None")

  def test_with_files(self):
    """CloningParams should accept files."""
    file_ids = [uuid4()]
    params = CloningParams(files=file_ids)
    self.assertEqual(params.files, file_ids, "files should match input")

  def test_with_folders(self):
    """CloningParams should accept folders."""
    folder_ids = [uuid4()]
    params = CloningParams(folders=folder_ids)
    self.assertEqual(params.folders, folder_ids, "folders should match input")

  def test_with_both(self):
    """CloningParams should accept both files and folders."""
    file_ids = [uuid4()]
    folder_ids = [uuid4()]
    params = CloningParams(files=file_ids, folders=folder_ids)
    self.assertEqual(params.files, file_ids, "files should match input")
    self.assertEqual(params.folders, folder_ids, "folders should match input")

  def test_from_attributes_config(self):
    """CloningParams should support from_attributes config."""
    self.assertTrue(
      CloningParams.model_config.get("from_attributes"),
      "from_attributes should be True",
    )


if __name__ == "__main__":
  unittest.main()
