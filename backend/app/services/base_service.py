from uuid import UUID

from app.core import ForbiddenError
from app.models import User


class BaseService:
  def _ensure_user_has_rights(self, user_id: UUID, obj_user_id: UUID) -> None:
    if obj_user_id != user_id:
      raise ForbiddenError("You do not have permission to access this resource")
