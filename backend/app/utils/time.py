from datetime import datetime, timedelta, timezone


def current_datetime() -> datetime:
  return datetime.now(timezone.utc)


def default_expires_at(expire_seconds: int) -> datetime:
  return current_datetime() + timedelta(seconds=expire_seconds)
