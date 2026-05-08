from datetime import datetime, timedelta

from app.core import Settings


def current_datetime() -> datetime:
  return datetime.now().astimezone()


def default_expires_in(settings: Settings) -> timedelta:
  return current_datetime() + timedelta(seconds=settings.shared_url_expire_seconds)
