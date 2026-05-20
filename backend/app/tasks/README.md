To setup a Celery tasks, create a file inside this folder and follow the following base
```python
from app.tasks.celery import celery

@celery.task(name="example.health_check")
def health_check() -> str:
  return "celery-worker-ok"
```
