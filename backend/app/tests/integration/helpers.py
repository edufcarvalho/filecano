import os
import unittest
from unittest.mock import MagicMock

os.environ["DATABASE_URL"] = os.environ.get(
  "TEST_DATABASE_URL",
  "postgresql+psycopg://filecano:filecano@localhost:5432/filecano_test",
)

from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel

from app.db import get_session
from app.services import FileStorageService
from app.tests.unit.helpers import _get_test_engine


class ApiTestCase(unittest.TestCase):
  @classmethod
  def setUpClass(cls):
    cls._engine = _get_test_engine()
    SQLModel.metadata.drop_all(cls._engine)
    SQLModel.metadata.create_all(cls._engine)

    from app.main import app

    cls.mock_storage = MagicMock()
    cls.mock_storage.iter_response.return_value = iter([])
    app.dependency_overrides[FileStorageService] = lambda: cls.mock_storage
    cls.app = app

  @classmethod
  def tearDownClass(cls):
    SQLModel.metadata.drop_all(cls._engine)

  def setUp(self):
    self._connection = self._engine.connect()
    self._transaction = self._connection.begin()
    self._session = Session(bind=self._connection, expire_on_commit=False)

    def _get_test_session():
      yield self._session

    self.app.dependency_overrides[get_session] = _get_test_session
    self.client = TestClient(self.app)

  def tearDown(self):
    self._session.close()
    self._transaction.rollback()
    self._connection.close()

  def _auth_headers(self, token):
    return {"Authorization": f"Bearer {token}"}

  def _register_and_login(
    self, name="Test User", email="test@example.com", password="SecureP@ss1"
  ):
    resp = self.client.post(
      "/api/v1/users",
      json={
        "name": name,
        "email": email,
        "password": password,
      },
    )
    data = resp.json()
    if "access_token" not in data:
      raise Exception(f"Registration failed: {data}")
    return data["access_token"]
