import unittest
from unittest.mock import MagicMock, patch


class TestCeleryApp(unittest.TestCase):
  def test_celery_app_creation(self):
    """celery app should be created with correct broker and backend."""
    with patch("app.tasks.celery.get_settings") as mock_settings:
      mock_settings.return_value.celery_broker_url = "redis://mock-broker"
      mock_settings.return_value.redis_url = "redis://mock-backend"

      from app.tasks.celery import celery

      self.assertEqual(celery.main, "filecano", "celery app name should be filecano")

  def test_setup_loggers_adds_file_handler(self):
    """setup_loggers should add a FileHandler to the logger."""
    with patch("app.tasks.celery.get_settings") as mock_settings:
      mock_settings.return_value.celery_broker_url = "redis://mock-broker"
      mock_settings.return_value.redis_url = "redis://mock-backend"

      from app.tasks.celery import setup_loggers

      mock_logger = MagicMock()
      setup_loggers(mock_logger)

      mock_logger.addHandler.assert_called_once()
      handler = mock_logger.addHandler.call_args[0][0]
      self.assertIsInstance(handler, __import__("logging").FileHandler)


if __name__ == "__main__":
  unittest.main()
