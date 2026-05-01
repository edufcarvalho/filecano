from passlib.context import CryptContext

_password_context = CryptContext(
  schemes=["argon2"],
  deprecated="auto",
)


def hash_password(password: str) -> str:
  return _password_context.hash(password)


def verify_password(plain: str, hashed_password: str) -> bool:
  return _password_context.verify(plain, hashed_password)
