from sqlmodel import Session, create_engine

from app.core import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True)


def get_session():
  with Session(engine, expire_on_commit=False) as session:
    yield session
