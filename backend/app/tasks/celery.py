import logging
from pathlib import Path

from celery import Celery
from celery.schedules import crontab
from celery.signals import after_setup_logger

from app.core import get_settings

settings = get_settings()

celery = Celery(
  "filecano",
  broker=settings.celery_broker_url,
  backend=settings.redis_url,
)

LOGS_DIR = Path(__file__).resolve().parent / "generated"
LOGS_DIR.mkdir(exist_ok=True)


@after_setup_logger.connect
def setup_loggers(logger, *args, **kwargs):
  handler = logging.FileHandler(LOGS_DIR / "celery.log")
  handler.setFormatter(
    logging.Formatter("[%(asctime)s: %(levelname)s/%(processName)s] %(message)s")
  )
  logger.addHandler(handler)


celery.conf.update(
  beat_schedule_filename=str(LOGS_DIR / "celerybeat-schedule.db"),
  # many of those are defaults, adding for visibility
  task_serializer="json",
  accept_content=["json"],
  result_serializer="json",
  timezone="America/Sao_Paulo",
  enable_utc=True,
  task_track_started=True,
  task_acks_late=True,
  worker_prefetch_multiplier=1,
  broker_connection_retry_on_startup=True,
  beat_schedule={
    "enforce-retention-policies-daily": {
      "task": "clean.not_retainable",
      "schedule": crontab(hour=18, minute=0),
    },
  },
)

celery.autodiscover_tasks(["app.tasks"])
