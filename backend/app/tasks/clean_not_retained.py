from app.api.dependencies import (
  get_file_service,
  get_folder_service,
  get_link_service,
  get_user_service,
)
from app.tasks.celery import celery


@celery.task(name="clean.not_retainable")
def enforce_retention_policies() -> None:
  user_service = get_user_service()
  link_service = get_link_service()
  folder_service = get_folder_service()
  file_service = get_file_service()

  user_service.enforce_retention_policy()
  link_service.enforce_retention_policy()
  folder_service.enforce_retention_policy()
  file_service.enforce_retention_policy()
