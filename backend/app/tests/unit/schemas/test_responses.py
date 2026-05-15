import unittest

from app.schemas import (
  FileResponse,
  FolderResponse,
  FolderWithFilesResponse,
  LinkResponse,
  LinkRestoreResponse,
  LinkUpdateResponse,
  MessageResponse,
  PaginatedResponse,
  PaginateParams,
  TokenResponse,
  UserResponse,
)


class TestResponseSchemas(unittest.TestCase):
  """Schema construction smoke tests to ensure models are importable and valid."""

  def test_file_response_creation(self):
    from datetime import datetime, timezone
    from uuid import uuid4

    fr = FileResponse(
      id=uuid4(),
      user_id=uuid4(),
      original_name="test.txt",
      display_name="test.txt",
      content_type="text/plain",
      size_bytes=1024,
      created_at=datetime.now(timezone.utc),
      deleted_at=None,
    )
    self.assertEqual(fr.original_name, "test.txt", "original_name should match")

  def test_folder_response_creation(self):
    from datetime import datetime, timezone
    from uuid import uuid4

    fr = FolderResponse(
      id=uuid4(),
      user_id=uuid4(),
      name="My Folder",
      created_at=datetime.now(timezone.utc),
    )
    self.assertEqual(fr.name, "My Folder", "name should match")

  def test_folder_with_files_response_creation(self):
    from datetime import datetime, timezone
    from uuid import uuid4

    folder = FolderResponse(
      id=uuid4(),
      user_id=uuid4(),
      name="My Folder",
      created_at=datetime.now(timezone.utc),
    )
    fwfr = FolderWithFilesResponse(folders=[folder])
    self.assertEqual(len(fwfr.folders), 1, "should have 1 folder")

  def test_link_response_creation(self):
    from datetime import datetime, timezone
    from uuid import uuid4

    lr = LinkResponse(
      id=uuid4(),
      token="abc123",
      expires_at=datetime.now(timezone.utc),
    )
    self.assertEqual(lr.token, "abc123", "token should match")

  def test_link_update_response_creation(self):
    from uuid import uuid4

    lur = LinkUpdateResponse(id=uuid4(), custom_name="my-link")
    self.assertEqual(lur.custom_name, "my-link", "custom_name should match")

  def test_link_restore_response_creation(self):
    from datetime import datetime, timezone
    from uuid import uuid4

    lrr = LinkRestoreResponse(id=uuid4(), expires_at=datetime.now(timezone.utc))
    self.assertIsInstance(lrr.expires_at, datetime, "expires_at should be datetime")

  def test_message_response_creation(self):
    mr = MessageResponse(message="Success")
    self.assertEqual(mr.message, "Success", "message should match")

  def test_token_response_creation(self):
    tr = TokenResponse(access_token="tok", token_type="bearer", expires_in=3600)
    self.assertEqual(tr.token_type, "bearer", "token_type should match")

  def test_user_response_creation(self):
    from datetime import datetime, timezone
    from uuid import uuid4

    ur = UserResponse(
      id=uuid4(),
      name="John",
      email="john@example.com",
      created_at=datetime.now(timezone.utc),
      deleted_at=None,
    )
    self.assertEqual(ur.name, "John", "name should match")

  def test_paginate_params_creation(self):
    pp = PaginateParams(page=0, page_size=10, total=100)
    self.assertEqual(pp.total, 100, "total should match")

  def test_paginated_response_creation(self):
    pr = PaginatedResponse(items=[], total=0, page=0, size=10, pages=0)
    self.assertEqual(pr.size, 10, "size should match")


if __name__ == "__main__":
  unittest.main()
