from celery import Celery

from app.core import get_settings

settings = get_settings()

celery = Celery(
  "filecano",
  broker=settings.celery_broker_url,
  backend=settings.redis_url,
)

celery.conf.update(
  # many of those are defaults, adding for visibility
  task_serializer="json",
  accept_content=["json"],
  result_serializer="json",
  timezone="UTC",
  enable_utc=True,
  task_track_started=True,
  task_acks_late=True,
  worker_prefetch_multiplier=1,
  broker_connection_retry_on_startup=True,
)

celery.autodiscover_tasks(["app.tasks"])
