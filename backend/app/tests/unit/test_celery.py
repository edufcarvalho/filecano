import unittest
from unittest.mock import patch


class TestCeleryApp(unittest.TestCase):
  def test_celery_app_creation(self):
    """celery app should be created with correct broker and backend."""
    with patch("app.tasks.celery.get_settings") as mock_settings:
      mock_settings.return_value.celery_broker_url = "redis://mock-broker"
      mock_settings.return_value.redis_url = "redis://mock-backend"

      from app.tasks.celery import celery

      self.assertEqual(celery.main, "filecano", "celery app name should be filecano")


if __name__ == "__main__":
  unittest.main()
