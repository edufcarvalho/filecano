from uuid import UUID

from app.core import ForbiddenError


class BaseService:
  def ensure_user_has_rights(self, user_id: UUID, obj_user_id: UUID) -> None:
    if obj_user_id != user_id:
      raise ForbiddenError("You do not have permission to access this resource")

  def _ensure_user_has_rights(self, user_id: UUID, obj_user_id: UUID) -> None:
    self.ensure_user_has_rights(user_id, obj_user_id)
