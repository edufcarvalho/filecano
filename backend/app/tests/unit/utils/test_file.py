import unittest

from app.utils.file import is_content_type_supported


class TestIsContentTypeSupported(unittest.TestCase):
  def test_supported_common_type(self):
    """is_content_type_supported should return True for common supported types."""
    self.assertTrue(
      is_content_type_supported("text/plain"), "text/plain should be supported"
    )
    self.assertTrue(
      is_content_type_supported("image/png"), "image/png should be supported"
    )
    self.assertTrue(
      is_content_type_supported("image/jpeg"), "image/jpeg should be supported"
    )
    self.assertTrue(
      is_content_type_supported("application/pdf"),
      "application/pdf should be supported",
    )
    self.assertTrue(
      is_content_type_supported("application/zip"),
      "application/zip should be supported",
    )
    self.assertTrue(
      is_content_type_supported("video/mp4"), "video/mp4 should be supported"
    )
    self.assertTrue(
      is_content_type_supported("audio/mpeg"), "audio/mpeg should be supported"
    )
    self.assertTrue(
      is_content_type_supported("text/html"), "text/html should be supported"
    )
    self.assertTrue(
      is_content_type_supported("application/json"),
      "application/json should be supported",
    )

  def test_unsupported_type(self):
    """is_content_type_supported should return False for unsupported types."""
    self.assertFalse(
      is_content_type_supported("application/unknown-type"),
      "unknown type should not be supported",
    )
    self.assertFalse(
      is_content_type_supported("video/unsupported"),
      "unsupported video type should not be supported",
    )
    self.assertFalse(
      is_content_type_supported(""), "empty string should not be supported"
    )
    self.assertFalse(
      is_content_type_supported("not-a-content-type"),
      "arbitrary string should not be supported",
    )

  def test_case_sensitivity(self):
    """is_content_type_supported should be case-sensitive (mimetypes are lowercase)."""
    self.assertFalse(
      is_content_type_supported("TEXT/PLAIN"),
      "uppercase should not match lowercase mimetypes",
    )
    self.assertFalse(
      is_content_type_supported("Image/PNG"),
      "mixed-case should not match lowercase mimetypes",
    )


if __name__ == "__main__":
  unittest.main()
