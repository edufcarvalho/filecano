import os
import unittest
from uuid import uuid4

from argon2 import PasswordHasher
from sqlmodel import Session, SQLModel, create_engine
from uuid6 import uuid7

TEST_DATABASE_URL = os.environ.get(
  "TEST_DATABASE_URL",
  "postgresql+psycopg://filecano:filecano@localhost:5432/filecano_test",
)

_engine = None


def _get_test_engine():
  global _engine
  if _engine is None:
    _engine = create_engine(TEST_DATABASE_URL, echo=False)
  return _engine


class DatabaseTestCase(unittest.TestCase):
  @classmethod
  def setUpClass(cls):
    cls._engine = _get_test_engine()
    SQLModel.metadata.create_all(cls._engine)

  @classmethod
  def tearDownClass(cls):
    SQLModel.metadata.drop_all(cls._engine)

  def setUp(self):
    self._connection = self._engine.connect()
    self._transaction = self._connection.begin()
    self.session = Session(bind=self._connection, expire_on_commit=False)

  def tearDown(self):
    self.session.close()
    self._transaction.rollback()
    self._connection.close()

  def _create_user(
    self,
    name="Test User",
    email="test@example.com",
    password="SecureP@ss1",
  ):
    from app.models import User

    user = User(
      name=name,
      email=email,
      hashed_password=PasswordHasher().hash(password),
    )
    self.session.add(user)
    self.session.commit()
    self.session.refresh(user)
    return user

  def _create_file(
    self,
    user_id,
    original_name="testfile.txt",
    display_name="testfile.txt",
    object_key=None,
    content_type="text/plain",
    size_bytes=1024,
    checksum="abc123",
    folder_id=None,
  ):
    from app.models import File

    file = File(
      user_id=user_id,
      original_name=original_name,
      display_name=display_name,
      object_key=object_key or f"users/{user_id}/files/{uuid7()}",
      content_type=content_type,
      size_bytes=size_bytes,
      checksum=checksum,
      folder_id=folder_id,
    )
    self.session.add(file)
    self.session.commit()
    self.session.refresh(file)
    return file

  def _create_folder(self, user_id, name="Test Folder", parent_id=None):
    from app.models import Folder

    folder = Folder(
      name=name,
      user_id=user_id,
      parent_id=parent_id,
    )
    self.session.add(folder)
    self.session.commit()
    self.session.refresh(folder)
    return folder

  def _create_link(self, user_id, token=None, custom_name=None):
    from datetime import datetime, timedelta, timezone

    from app.models import Link

    link = Link(
      token=token or uuid4().hex[:8],
      custom_name=custom_name,
      user_id=user_id,
      expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    self.session.add(link)
    self.session.commit()
    self.session.refresh(link)
    return link

  def _create_file_link_relation(self, file_id, link_id):
    from app.models import FileLinkRelation

    rel = FileLinkRelation(file_id=file_id, link_id=link_id)
    self.session.add(rel)
    self.session.commit()
    return rel

  def _create_folder_link_relation(self, folder_id, link_id):
    from app.models import FolderLinkRelation

    rel = FolderLinkRelation(folder_id=folder_id, link_id=link_id)
    self.session.add(rel)
    self.session.commit()
    return rel
