from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  model_config = SettingsConfigDict(
    env_file=".env", env_file_encoding="utf-8", extra="ignore"
  )

  app_name: str = "Filecano API"
  database_url: str = "postgresql+psycopg://filecano:filecano@database:5432/filecano"
  minio_endpoint: str = "data:9000"
  minio_access_key: str = "minioadmin"
  minio_secret_key: str = "minioadmin"
  minio_bucket: str = "filecano"
  minio_secure: bool = False
  cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
  jwt_secret_key: str = "change-me-in-production"
  jwt_algorithm: str = "HS256"
  access_token_expire_seconds: int = 3600
  access_token_refresh_grace_seconds: int = 86400
  shared_url_expire_seconds: int = 604800
  share_token_length: int = 8
  max_file_size_bytes: int = 2147483648
  redis_url: str = "redis://:1234@localhost:6379/0"
  celery_broker_url: str = "redis://:1234@localhost:6379/0"
  data_retention_policy: int = 45
  archive_retention_policy: int = 15
  auth_cookie_name: str = "filecano_access_token"
  auth_cookie_secure: bool = False
  auth_cookie_same_site: str = "lax"
  auth_cookie_max_age: int = 86400

  @property
  def cors_origin_list(self) -> list[str]:
    return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
  return Settings()
