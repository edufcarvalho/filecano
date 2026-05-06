from app.utils.mimetypes import SUPPORTED_MIMETYPES

def is_content_type_supported(content_type: str) -> bool:
  return content_type in SUPPORTED_MIMETYPES
