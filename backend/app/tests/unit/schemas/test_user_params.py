import unittest

from pydantic import ValidationError

from app.core import PasswordValidationError
from app.schemas import (
  UserCreationParams,
  UserLoginParams,
  UserParams,
  UserUpdateParams,
)


class TestUserParams(unittest.TestCase):
  def test_valid_user_params(self):
    """UserParams should accept valid email and password."""
    params = UserParams(email="test@example.com", password="SecureP@ss1")
    self.assertEqual(params.email, "test@example.com", "email should match input")
    self.assertEqual(params.password, "SecureP@ss1", "password should match input")

  def test_invalid_email_raises(self):
    """UserParams should reject invalid email formats."""
    with self.assertRaises(
      ValidationError, msg="invalid email should raise ValidationError"
    ):
      UserParams(email="not-an-email", password="SecureP@ss1")

  def test_missing_email_raises(self):
    """UserParams should require an email field."""
    with self.assertRaises(
      ValidationError, msg="missing email should raise ValidationError"
    ):
      UserParams(password="SecureP@ss1")

  def test_password_too_short_raises(self):
    """UserParams should reject passwords shorter than 8 characters."""
    with self.assertRaises(
      PasswordValidationError,
      msg="password < 8 chars should raise PasswordValidationError",
    ):
      UserParams(email="test@example.com", password="Ab1!")

  def test_password_too_long_raises(self):
    """UserParams should reject passwords longer than 128 characters."""
    long_pw = "Aa1!" + "x" * 126
    with self.assertRaises(
      PasswordValidationError,
      msg="password > 128 chars should raise PasswordValidationError",
    ):
      UserParams(email="test@example.com", password=long_pw)

  def test_password_missing_lowercase_raises(self):
    """UserParams should require at least one lowercase letter."""
    with self.assertRaises(
      PasswordValidationError,
      msg="password without lowercase should raise PasswordValidationError",
    ):
      UserParams(email="test@example.com", password="PASSWORD1!")

  def test_password_missing_uppercase_raises(self):
    """UserParams should require at least one uppercase letter."""
    with self.assertRaises(
      PasswordValidationError,
      msg="password without uppercase should raise PasswordValidationError",
    ):
      UserParams(email="test@example.com", password="password1!")

  def test_password_missing_digit_raises(self):
    """UserParams should require at least one digit."""
    with self.assertRaises(
      PasswordValidationError,
      msg="password without digit should raise PasswordValidationError",
    ):
      UserParams(email="test@example.com", password="Password!")

  def test_password_missing_special_char_raises(self):
    """UserParams should require at least one special character."""
    with self.assertRaises(
      PasswordValidationError,
      msg="password without special char should raise PasswordValidationError",
    ):
      UserParams(email="test@example.com", password="Password1")

  def test_password_invalid_chars_raises(self):
    """UserParams should reject passwords with invalid characters."""
    with self.assertRaises(
      PasswordValidationError,
      msg="password with invalid chars should raise PasswordValidationError",
    ):
      UserParams(email="test@example.com", password="Pass word1!")

  def test_password_validation_error_message_contains_reason(self):
    """PasswordValidationError should include descriptive message."""
    with self.assertRaises(PasswordValidationError) as ctx:
      UserParams(email="test@example.com", password="short")
    self.assertIn(
      "8 characters",
      str(ctx.exception.detail),
      "error message should mention minimum length",
    )

  def test_password_validation_error_can_contain_multiple_reasons(self):
    """PasswordValidationError should list all validation failures."""
    with self.assertRaises(PasswordValidationError) as ctx:
      UserParams(email="test@example.com", password="abc")
    detail = str(ctx.exception.detail)
    self.assertIn(";", detail, "multiple errors should be separated by semicolons")


class TestUserCreationParams(unittest.TestCase):
  def test_valid_creation_params(self):
    """UserCreationParams should accept name, email, and password."""
    params = UserCreationParams(
      name="John", email="john@example.com", password="SecureP@ss1"
    )
    self.assertEqual(params.name, "John", "name should match input")
    self.assertEqual(params.email, "john@example.com", "email should match input")

  def test_missing_name_raises(self):
    """UserCreationParams should require a name field."""
    with self.assertRaises(
      ValidationError, msg="missing name should raise ValidationError"
    ):
      UserCreationParams(email="john@example.com", password="SecureP@ss1")

  def test_blank_name_is_accepted(self):
    """UserCreationParams accepts blank names (no validator prevents it)."""
    params = UserCreationParams(
      name="", email="john@example.com", password="SecureP@ss1"
    )
    self.assertEqual(
      params.name, "", "empty name is technically valid (no validation rule)"
    )

  def test_inherits_password_validation(self):
    """UserCreationParams should inherit password validation from UserParams."""
    with self.assertRaises(
      PasswordValidationError, msg="UserCreationParams should validate passwords"
    ):
      UserCreationParams(name="John", email="john@example.com", password="weak")


class TestUserLoginParams(unittest.TestCase):
  def test_valid_login_params(self):
    """UserLoginParams should accept email and password."""
    params = UserLoginParams(email="john@example.com", password="SecureP@ss1")
    self.assertEqual(params.email, "john@example.com", "email should match input")

  def test_inherits_password_validation(self):
    """UserLoginParams should inherit password validation from UserParams."""
    with self.assertRaises(
      PasswordValidationError, msg="UserLoginParams should validate passwords"
    ):
      UserLoginParams(email="john@example.com", password="weak")


class TestUserUpdateParams(unittest.TestCase):
  def test_all_fields_default_to_none(self):
    """UserUpdateParams should have all optional fields default to None."""
    params = UserUpdateParams()
    self.assertIsNone(params.name, "name should default to None")
    self.assertIsNone(params.email, "email should default to None")
    self.assertIsNone(params.password, "password should default to None")

  def test_valid_update_with_name(self):
    """UserUpdateParams should accept only a name update."""
    params = UserUpdateParams(name="New Name")
    self.assertEqual(params.name, "New Name", "name should match input")

  def test_valid_update_with_email(self):
    """UserUpdateParams should accept only an email update."""
    params = UserUpdateParams(email="new@example.com")
    self.assertEqual(params.email, "new@example.com", "email should match input")

  def test_valid_update_with_password(self):
    """UserUpdateParams should accept only a password update."""
    params = UserUpdateParams(password="NewSecureP@ss1")
    self.assertEqual(params.password, "NewSecureP@ss1", "password should match input")

  def test_valid_update_with_all_fields(self):
    """UserUpdateParams should accept all fields at once."""
    params = UserUpdateParams(
      name="New Name",
      email="new@example.com",
      password="NewSecureP@ss1",
    )
    self.assertEqual(params.name, "New Name", "name should match input")
    self.assertEqual(params.email, "new@example.com", "email should match input")
    self.assertEqual(params.password, "NewSecureP@ss1", "password should match input")

  def test_none_password_is_not_validated(self):
    """UserUpdateParams should not validate password when it is None."""
    params = UserUpdateParams(password=None)
    self.assertIsNone(
      params.password, "None password should remain None without validation"
    )

  def test_password_validation_applies_when_provided(self):
    """UserUpdateParams should validate password when it is provided."""
    with self.assertRaises(
      PasswordValidationError, msg="provided password should be validated"
    ):
      UserUpdateParams(password="weak")

  def test_invalid_email_raises(self):
    """UserUpdateParams should reject invalid email formats."""
    with self.assertRaises(
      ValidationError, msg="invalid email should raise ValidationError"
    ):
      UserUpdateParams(email="not-an-email")

  def test_from_attributes_config(self):
    """UserUpdateParams should support from_attributes config."""
    self.assertTrue(
      UserUpdateParams.model_config.get("from_attributes"),
      "from_attributes should be True",
    )


if __name__ == "__main__":
  unittest.main()
