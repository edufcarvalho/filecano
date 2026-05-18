from app.utils.mimetypes import SUPPORTED_MIMETYPES

GB_SCALE = 1024 * 1024 * 1024


def is_content_type_supported(content_type: str) -> bool:
  return content_type in SUPPORTED_MIMETYPES
