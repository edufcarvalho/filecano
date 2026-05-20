import os
import unittest
from uuid import uuid4

from argon2 import PasswordHasher
from sqlalchemy import create_engine as sa_create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.sql import text
from sqlmodel import Session, SQLModel, create_engine
from uuid6 import uuid7

from app.core import Settings

_test_settings = Settings(
  jwt_secret_key="test-key",
  max_file_size_bytes=104857600,
  data_retention_policy=45,
  _env_file=None,
)


def get_test_settings() -> Settings:
  return _test_settings

TEST_DATABASE_URL = os.environ.get(
  "TEST_DATABASE_URL",
  "postgresql+psycopg://filecano:filecano@localhost:5432/filecano_test",
)

_engine = None
_schema_initialized = False


def make_s3_error(code="Error", message="test error"):
  from unittest.mock import MagicMock

  from minio.error import S3Error

  mock_response = MagicMock()
  mock_response.data = b""
  mock_response.status = 500
  mock_response.headers = {}
  return S3Error(
    response=mock_response,
    code=code,
    message=message,
    resource="test-resource",
    request_id="test-id",
    host_id="test-host",
    bucket_name="test-bucket",
    object_name="test-object",
  )


def make_versioned_object(
  object_name="test/key",
  version_id="v1",
  *,
  is_latest=True,
  is_delete_marker=True,
):
  from unittest.mock import MagicMock

  item = MagicMock()
  item.object_name = object_name
  item.version_id = version_id
  item.is_latest = is_latest
  item.is_delete_marker = is_delete_marker
  return item


def _get_test_engine():
  global _engine
  global _schema_initialized
  if _engine is None:
    test_url = make_url(TEST_DATABASE_URL)
    db_name = test_url.database
    admin_url = test_url.set(database="template1")

    admin_engine = sa_create_engine(admin_url, isolation_level="AUTOCOMMIT")
    try:
      with admin_engine.connect() as conn:
        conn.execute(text(f"CREATE DATABASE {db_name}"))
    except ProgrammingError:
      pass
    finally:
      admin_engine.dispose()

    _engine = create_engine(TEST_DATABASE_URL, echo=False)

    with _engine.connect() as conn:
      conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
      conn.commit()

  if not _schema_initialized:
    import app.models  # noqa: F401

    SQLModel.metadata.drop_all(_engine)
    SQLModel.metadata.create_all(_engine)
    _schema_initialized = True

  return _engine


class DatabaseTestCase(unittest.TestCase):
  @classmethod
  def setUpClass(cls):
    cls._engine = _get_test_engine()

  @classmethod
  def tearDownClass(cls):
    pass

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
      parent_id=folder_id,
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
