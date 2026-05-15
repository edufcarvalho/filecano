import unittest

from app.core.security import (
  create_token,
  decode_token,
  hash_password,
  verify_password,
)


class TestTokenFunctions(unittest.TestCase):
  def setUp(self):
    self.secret = "test-secret-key"
    self.payload = {"sub": "user-123", "role": "user"}

  def test_create_token_returns_string(self):
    """create_token should return a JWT string."""
    token = create_token(self.payload, self.secret, 3600)
    self.assertIsInstance(token, str, "token should be a string")
    self.assertIn(".", token, "token should have 3 parts separated by dots")
    self.assertEqual(len(token.split(".")), 3)

  def test_create_and_decode_token(self):
    """Tokens created by create_token should be decodable by decode_token."""
    token = create_token(self.payload, self.secret, 3600)
    decoded = decode_token(token, self.secret)
    self.assertEqual(decoded["sub"], "user-123")
    self.assertEqual(decoded["role"], "user")
    self.assertIn("iat", decoded)
    self.assertIn("exp", decoded)

  def test_decode_token_ignore_expiration(self):
    """decode_token with verify_expiration=False should ignore expiry."""
    token = create_token(self.payload, self.secret, -1)
    decoded = decode_token(token, self.secret, verify_expiration=False)
    self.assertEqual(decoded["sub"], "user-123")

  def test_decode_token_expired_raises(self):
    """decode_token should raise ValueError for expired tokens."""
    token = create_token(self.payload, self.secret, -1)
    with self.assertRaises(ValueError, msg="expired token should raise ValueError"):
      decode_token(token, self.secret)

  def test_decode_token_invalid_signature_raises(self):
    """decode_token should raise ValueError for tampered signature."""
    token = create_token(self.payload, self.secret, 3600)
    parts = token.split(".")
    tampered = f"{parts[0]}.{parts[1]}.invalidsig"
    with self.assertRaises(
      ValueError, msg="tampered signature should raise ValueError"
    ):
      decode_token(tampered, self.secret)

  def test_decode_token_invalid_format_raises(self):
    """decode_token should raise ValueError for malformed tokens."""
    with self.assertRaises(ValueError, msg="malformed token should raise ValueError"):
      decode_token("not-a-valid-token", self.secret)

  def test_decode_token_missing_exp_raises(self):
    """decode_token should raise ValueError when exp is missing."""
    token_parts = create_token(self.payload, self.secret, 3600).split(".")

    import base64
    import json

    header = json.loads(base64.urlsafe_b64decode(f"{token_parts[0]}=="))  # noqa: F841
    payload_data = json.loads(base64.urlsafe_b64decode(f"{token_parts[1]}=="))
    del payload_data["exp"]
    encoded_payload = (
      base64.urlsafe_b64encode(json.dumps(payload_data, separators=(",", ":")).encode())
      .rstrip(b"=")
      .decode()
    )
    unsigned = f"{token_parts[0]}.{encoded_payload}"

    import hashlib
    import hmac

    signature = (
      base64.urlsafe_b64encode(
        hmac.new(self.secret.encode(), unsigned.encode(), hashlib.sha256).digest()
      )
      .rstrip(b"=")
      .decode()
    )

    token = f"{unsigned}.{signature}"
    with self.assertRaises(ValueError, msg="missing exp should raise ValueError"):
      decode_token(token, self.secret)

  def test_create_token_unsupported_algorithm_raises(self):
    """create_token should raise ValueError for unsupported algorithms."""
    with self.assertRaises(
      ValueError, msg="unsupported algorithm should raise ValueError"
    ):
      create_token(self.payload, self.secret, 3600, algorithm="RS256")

  def test_decode_token_unsupported_algorithm_raises(self):
    """decode_token should raise ValueError for unsupported algorithms."""
    with self.assertRaises(
      ValueError, msg="unsupported algorithm should raise ValueError"
    ):
      decode_token("a.b.c", self.secret, algorithm="RS256")


class TestPasswordFunctions(unittest.TestCase):
  def test_hash_password_returns_string(self):
    """hash_password should return a hashed string."""
    hashed = hash_password("SecureP@ss1")
    self.assertIsInstance(hashed, str, "hashed password should be a string")
    self.assertNotEqual(hashed, "SecureP@ss1", "hash should differ from plaintext")

  def test_hash_password_different_each_time(self):
    """hash_password should produce different hashes for same input (salt)."""
    h1 = hash_password("SecureP@ss1")
    h2 = hash_password("SecureP@ss1")
    self.assertNotEqual(h1, h2, "argon2 should produce different hashes")

  def test_verify_password_correct(self):
    """verify_password should return True for matching password."""
    hashed = hash_password("SecureP@ss1")
    self.assertTrue(
      verify_password("SecureP@ss1", hashed),
      "correct password should verify successfully",
    )

  def test_verify_password_incorrect(self):
    """verify_password should return False for wrong password."""
    hashed = hash_password("SecureP@ss1")
    self.assertFalse(
      verify_password("WrongP@ss1", hashed),
      "wrong password should fail verification",
    )

  def test_verify_password_with_empty_strings(self):
    """verify_password should handle empty strings gracefully."""
    hashed = hash_password("")
    self.assertTrue(verify_password("", hashed))
    self.assertFalse(verify_password("x", hashed))


class TestTokenDecodeErrors(unittest.TestCase):
  def setUp(self):
    self.secret = "test-secret-key"
    self.payload = {"sub": "user-123"}

  def test_decode_token_invalid_payload_base64(self):
    """decode_token should raise ValueError for invalid base64 in payload."""
    from app.core.security import _base64url_encode_json, _sign

    header = _base64url_encode_json({"alg": "HS256", "typ": "JWT"})
    encoded_payload = "!!!invalid!!!"
    unsigned = f"{header}.{encoded_payload}"
    signature = _sign(unsigned, self.secret)
    token = f"{unsigned}.{signature}"

    with self.assertRaises(ValueError, msg="invalid base64 should raise ValueError"):
      decode_token(token, self.secret)

  def test_decode_token_payload_not_dict(self):
    """decode_token should raise ValueError when payload is not a dict."""
    from app.core.security import _base64url_encode_json, _sign

    header = _base64url_encode_json({"alg": "HS256", "typ": "JWT"})
    import base64
    import json

    payload_data = [1, 2, 3]
    encoded_payload = (
      base64.urlsafe_b64encode(json.dumps(payload_data, separators=(",", ":")).encode())
      .rstrip(b"=")
      .decode()
    )
    unsigned = f"{header}.{encoded_payload}"
    signature = _sign(unsigned, self.secret)
    token = f"{unsigned}.{signature}"

    with self.assertRaises(ValueError, msg="non-dict payload should raise ValueError"):
      decode_token(token, self.secret)

  def test_decode_token_exp_not_int(self):
    """decode_token should raise ValueError when exp is not int."""
    from app.core.security import _base64url_encode_json, _sign

    header = _base64url_encode_json({"alg": "HS256", "typ": "JWT"})
    import base64
    import json

    payload_data = {"sub": "user", "exp": "not-an-int"}
    encoded_payload = (
      base64.urlsafe_b64encode(json.dumps(payload_data, separators=(",", ":")).encode())
      .rstrip(b"=")
      .decode()
    )
    unsigned = f"{header}.{encoded_payload}"
    signature = _sign(unsigned, self.secret)
    token = f"{unsigned}.{signature}"

    with self.assertRaises(ValueError, msg="exp not int should raise ValueError"):
      decode_token(token, self.secret)


if __name__ == "__main__":
  unittest.main()
