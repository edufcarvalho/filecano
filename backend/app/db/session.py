from __future__ import annotations

from typing import TYPE_CHECKING

from sqlmodel import Session, create_engine

from app.core import get_settings

if TYPE_CHECKING:
  from typing import Generator

settings = get_settings()

engine = create_engine(
  settings.database_url,
  pool_pre_ping=True,
  connect_args={"connect_timeout": settings.database_connect_timeout},
)


def get_session() -> Generator[Session, None, None]:
  with Session(engine, expire_on_commit=False) as session:
    yield session
