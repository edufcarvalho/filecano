import unittest

from app.utils.file import is_content_type_supported


class TestIsContentTypeSupported(unittest.TestCase):
  def test_supported_common_type(self):
    """is_content_type_supported should return True for common supported types."""
    supported_types = (
      "text/plain",
      "image/png",
      "image/jpeg",
      "application/pdf",
      "application/zip",
      "video/mp4",
      "audio/mpeg",
      "text/html",
      "application/json",
    )

    for content_type in supported_types:
      with self.subTest(content_type=content_type):
        self.assertTrue(is_content_type_supported(content_type))

  def test_unsupported_type(self):
    """is_content_type_supported should return False for unsupported types."""
    unsupported_types = (
      "application/unknown-type",
      "video/unsupported",
      "",
      "not-a-content-type",
    )

    for content_type in unsupported_types:
      with self.subTest(content_type=content_type):
        self.assertFalse(is_content_type_supported(content_type))

  def test_case_sensitivity(self):
    """is_content_type_supported should be case-sensitive (mimetypes are lowercase)."""
    for content_type in ("TEXT/PLAIN", "Image/PNG"):
      with self.subTest(content_type=content_type):
        self.assertFalse(is_content_type_supported(content_type))


if __name__ == "__main__":
  unittest.main()
