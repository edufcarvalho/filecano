import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

_password_hasher = PasswordHasher()


def create_token(
  payload: dict[str, object],
  secret_key: str,
  expire_in: int,
  algorithm: str = "HS256",
) -> str:
  if algorithm != "HS256":
    raise ValueError("Unsupported JWT algorithm")

  now = datetime.now(timezone.utc)
  token_payload = {
    **payload,
    "iat": int(now.timestamp()),
    "exp": int((now + timedelta(seconds=expire_in)).timestamp()),
  }

  header = {"alg": algorithm, "typ": "JWT"}
  unsigned_token = ".".join(
    [
      _base64url_encode_json(header),
      _base64url_encode_json(token_payload),
    ]
  )
  signature = _sign(unsigned_token, secret_key)

  return f"{unsigned_token}.{signature}"


def decode_token(
  token: str,
  secret_key: str,
  algorithm: str = "HS256",
  verify_expiration: bool = True,
) -> dict[str, object]:
  if algorithm != "HS256":
    raise ValueError("Unsupported JWT algorithm")

  try:
    encoded_header, encoded_payload, signature = token.split(".")
  except ValueError as error:
    raise ValueError("Invalid access token") from error

  unsigned_token = f"{encoded_header}.{encoded_payload}"
  expected_signature = _sign(unsigned_token, secret_key)

  if not hmac.compare_digest(signature, expected_signature):
    raise ValueError("Invalid access token")

  payload = _base64url_decode_json(encoded_payload)
  expires_at = payload.get("exp")

  if not isinstance(expires_at, int):
    raise ValueError("Invalid access token")

  if verify_expiration and expires_at <= int(datetime.now(timezone.utc).timestamp()):
    raise ValueError("Access token expired")

  return payload


def hash_password(password: str) -> str:
  return _password_hasher.hash(password)


def verify_password(plain: str, hashed_password: str) -> bool:
  try:
    return _password_hasher.verify(hashed_password, plain)
  except VerifyMismatchError:
    return False


def _base64url_encode_json(value: dict[str, object]) -> str:
  data = json.dumps(value, separators=(",", ":")).encode()

  return _base64url_encode(data)


def _base64url_encode(data: bytes) -> str:
  return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _base64url_decode_json(value: str) -> dict[str, object]:
  padding = "=" * (-len(value) % 4)

  try:
    decoded = base64.urlsafe_b64decode(f"{value}{padding}")
    payload = json.loads(decoded)
  except (json.JSONDecodeError, ValueError) as error:
    raise ValueError("Invalid access token") from error

  if not isinstance(payload, dict):
    raise ValueError("Invalid access token")

  return payload


def _sign(unsigned_token: str, secret_key: str) -> str:
  signature = hmac.new(
    secret_key.encode(),
    unsigned_token.encode(),
    hashlib.sha256,
  ).digest()

  return _base64url_encode(signature)
