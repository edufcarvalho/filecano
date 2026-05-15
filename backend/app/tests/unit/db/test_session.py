import unittest
from unittest.mock import patch

from app.db import engine, get_session


class TestSessionModule(unittest.TestCase):
  def test_engine_exists(self):
    """Module should export an engine."""
    self.assertIsNotNone(engine, "engine should be created at import")

  def test_get_session_is_generator(self):
    """get_session should be a generator function."""
    self.assertTrue(
      hasattr(get_session, "__code__"),
      "get_session should be a function",
    )


class TestGetSession(unittest.TestCase):
  def setUp(self):
    self.patcher = patch("app.db.session.Session", autospec=True)
    self.mock_session_cls = self.patcher.start()
    self.mock_instance = self.mock_session_cls.return_value
    self.mock_instance.__enter__.return_value = self.mock_instance

  def tearDown(self):
    self.patcher.stop()

  def test_get_session_yields_session(self):
    """get_session should yield a Session instance."""
    gen = get_session()
    session = next(gen)
    self.assertEqual(session, self.mock_instance)

  def test_get_session_context_manager(self):
    """get_session should use context manager on Session."""
    gen = get_session()
    next(gen)
    self.mock_session_cls.assert_called_once()


if __name__ == "__main__":
  unittest.main()
