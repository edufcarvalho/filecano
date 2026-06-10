from fastapi.responses import Response

from app.core.config import get_settings


def set_auth_cookie(
  response: Response,
  token: str,
  cookie_name: str,
  max_age: int,
  secure: bool,
  same_site: str,
) -> None:
  response.set_cookie(
    key=cookie_name,
    value=token,
    max_age=max_age,
    httponly=True,
    secure=secure,
    samesite=same_site,
    path="/",
  )


def clear_auth_cookie(
  response: Response,
  cookie_name: str,
  secure: bool,
  same_site: str,
) -> None:
  response.delete_cookie(
    key=cookie_name,
    path="/",
    secure=secure,
    httponly=True,
    samesite=same_site,
  )


def set_token_cookie(response: Response, access_token: str) -> None:
  settings = get_settings()
  set_auth_cookie(
    response=response,
    token=access_token,
    cookie_name=settings.auth_cookie_name,
    max_age=settings.auth_cookie_max_age,
    secure=settings.auth_cookie_secure,
    same_site=settings.auth_cookie_same_site,
  )


def clear_token_cookie(response: Response) -> None:
  settings = get_settings()
  clear_auth_cookie(
    response=response,
    cookie_name=settings.auth_cookie_name,
    secure=settings.auth_cookie_secure,
    same_site=settings.auth_cookie_same_site,
  )
