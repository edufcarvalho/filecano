import unittest

from app.core.config import Settings, get_settings


class TestSettings(unittest.TestCase):
  def test_default_values(self):
    """Settings should load default values without env file."""
    settings = Settings(_env_file="")
    self.assertEqual(settings.app_name, "Filecano API")
    self.assertEqual(settings.jwt_algorithm, "HS256")
    self.assertEqual(settings.access_token_expire_seconds, 3600)
    self.assertEqual(settings.access_token_refresh_grace_seconds, 86400)
    self.assertEqual(settings.shared_url_expire_seconds, 604800)
    self.assertEqual(settings.share_token_length, 8)
    self.assertEqual(settings.max_file_size_bytes, 2147483648)
    self.assertFalse(settings.minio_secure)

  def test_cors_origin_list_single(self):
    """cors_origin_list should parse comma-separated origins."""
    settings = Settings(
      _env_file="",
      cors_origins="http://localhost:3000",
      jwt_secret_key="test",
    )
    self.assertEqual(settings.cors_origin_list, ["http://localhost:3000"])

  def test_cors_origin_list_multiple(self):
    """cors_origin_list should parse multiple origins."""
    settings = Settings(
      _env_file="",
      cors_origins="http://a.com, http://b.com",
      jwt_secret_key="test",
    )
    self.assertEqual(settings.cors_origin_list, ["http://a.com", "http://b.com"])

  def test_cors_origin_list_empty_string(self):
    """cors_origin_list should return empty list for empty string."""
    settings = Settings(_env_file="", cors_origins="", jwt_secret_key="test")
    self.assertEqual(settings.cors_origin_list, [])

  def test_cors_origin_list_with_spaces(self):
    """cors_origin_list should strip whitespace."""
    settings = Settings(
      _env_file="",
      cors_origins=" http://a.com , http://b.com ",
      jwt_secret_key="test",
    )
    self.assertEqual(settings.cors_origin_list, ["http://a.com", "http://b.com"])

  def test_extra_fields_ignored(self):
    """Settings should ignore extra env vars."""
    settings = Settings(
      _env_file="",
      jwt_secret_key="test",
      _extra_field="ignored",
    )
    self.assertIsNotNone(settings)

  def test_custom_values(self):
    """Settings should accept custom values."""
    settings = Settings(
      _env_file="",
      app_name="Custom App",
      database_url="custom://db",
      minio_bucket="my-bucket",
      jwt_secret_key="my-secret",
      jwt_algorithm="HS256",
      access_token_expire_seconds=1800,
      max_file_size_bytes=1048576,
    )
    self.assertEqual(settings.app_name, "Custom App")
    self.assertEqual(settings.database_url, "custom://db")
    self.assertEqual(settings.minio_bucket, "my-bucket")
    self.assertEqual(settings.jwt_secret_key, "my-secret")
    self.assertEqual(settings.access_token_expire_seconds, 1800)
    self.assertEqual(settings.max_file_size_bytes, 1048576)


class TestGetSettings(unittest.TestCase):
  def test_get_settings_returns_singleton(self):
    """get_settings should return the same instance."""
    s1 = get_settings()
    s2 = get_settings()
    self.assertIs(s1, s2, "get_settings should return cached singleton")


if __name__ == "__main__":
  unittest.main()
