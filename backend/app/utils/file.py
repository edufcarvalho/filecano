from content_types import EXTENSION_TO_CONTENT_TYPE
from typing import Optional

SUPPORTED_FILE_TYPES: set[str] = set(EXTENSION_TO_CONTENT_TYPE.values())

def is_content_type_supported(content_type: str) -> bool:
  return bool(SUPPORTED_FILE_TYPES.get(content_type))
