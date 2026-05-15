import unittest
from datetime import datetime

from app.utils.time import current_datetime, get_expires_at


class TestCurrentDatetime(unittest.TestCase):
  def test_returns_datetime(self):
    """current_datetime should return a datetime object."""
    result = current_datetime()
    self.assertIsInstance(
      result, datetime, "current_datetime should return a datetime instance"
    )

  def test_is_timezone_aware(self):
    """current_datetime should return a timezone-aware datetime."""
    result = current_datetime()
    self.assertIsNotNone(
      result.tzinfo, "current_datetime should return a timezone-aware datetime"
    )
    tz_offset = result.tzinfo.utcoffset(result)
    self.assertIsNotNone(tz_offset, "current_datetime tzinfo should have a UTC offset")

  def test_is_utc(self):
    """current_datetime should return a UTC datetime."""
    result = current_datetime()
    self.assertEqual(
      result.tzinfo.utcoffset(result).total_seconds(),
      0,
      "current_datetime should return UTC (zero offset)",
    )

  def test_returns_current_time_approximately(self):
    """current_datetime should return a time close to now."""
    import time

    t1 = time.time()
    result = current_datetime()
    t2 = time.time()
    result_ts = result.timestamp()
    self.assertGreaterEqual(
      result_ts, t1 - 1, "result should be at or after t1 (with tolerance)"
    )
    self.assertLessEqual(
      result_ts, t2 + 1, "result should be at or before t2 (with tolerance)"
    )


class TestGetExpiresAt(unittest.TestCase):
  def test_returns_datetime(self):
    """get_expires_at should return a datetime object."""
    result = get_expires_at(3600)
    self.assertIsInstance(
      result, datetime, "get_expires_at should return a datetime instance"
    )

  def test_is_in_the_future(self):
    """get_expires_at should return a time in the future."""
    result = get_expires_at(3600)
    now = current_datetime()
    self.assertGreater(result, now, "get_expires_at should return a time in the future")

  def test_correct_offset(self):
    """get_expires_at should offset by exactly the specified seconds."""
    now = current_datetime()
    offset = 3600
    result = get_expires_at(offset)
    delta = result - now
    self.assertAlmostEqual(
      delta.total_seconds(),
      offset,
      delta=1,
      msg="get_expires_at offset should equal specified seconds (with 1s tolerance)",
    )

  def test_zero_seconds_returns_now(self):
    """get_expires_at with 0 seconds should return approximately now."""
    now = current_datetime()
    result = get_expires_at(0)
    delta = result - now
    self.assertAlmostEqual(
      delta.total_seconds(),
      0,
      delta=1,
      msg="get_expires_at(0) should return approximately now",
    )

  def test_large_offset(self):
    """get_expires_at should handle large offsets (1 year)."""
    offset = 365 * 24 * 3600
    result = get_expires_at(offset)
    now = current_datetime()
    self.assertGreater(
      result, now, "get_expires_at with large offset should be in the future"
    )


if __name__ == "__main__":
  unittest.main()
